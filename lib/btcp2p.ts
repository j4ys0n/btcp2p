import * as net from 'net';

import * as crypto from 'crypto';
import * as cryptoBinary from 'crypto-binary';

import { Utils } from './util/general.util';

import { PeerAddress } from './interfaces/peer.interface';
import {
  ConnectEvent, DisconnectEvent, ConnectionRejectedEvent,
  SentMessageEvent, PeerMessageEvent, BlockNotifyEvent,
  TxNotifyEvent, ErrorEvent, VersionEvent
} from './interfaces/events.interface';

//general consts
const MINUTE = 60 * 1000;
const CONNECTION_RETRY = 5 * MINUTE;
const PING_INTERVAL = 5 * MINUTE;
const IPV6_IPV4_PADDING = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);
const MessageParser = cryptoBinary.MessageParser;

type Handler<E> = (event: E) => void;

class EventDispatcher<E> {
  private handlers: Handler<E>[] = [];
  fire(event: E) {
    for (let h of this.handlers) {
      h(event);
    }
  }
  register(handler: Handler<E>) {
    this.handlers.push(handler);
  }
}

const fixedLenStringBuffer = (s: string, len: number): Buffer => {
  let buff = Buffer.allocUnsafe(len);
  buff.fill(0);
  buff.write(s);
  return buff;
}

const commandStringBuffer = (s: string): Buffer => {
  return fixedLenStringBuffer(s, 12);
}

const readFlowingBytes = (stream: net.Socket, amount: number, preRead: Buffer, callback: Function): void => {
  let buff = (preRead) ? preRead : Buffer.from([]);
  const readData = (data: any) => {
    buff = Buffer.concat([buff, data]);
    if (buff.length >= amount) {
      const returnData = buff.slice(0, amount);
      const lopped = (buff.length > amount) ? buff.slice(amount) : null;
      callback(returnData, lopped);
    } else {
      stream.once('data', readData);
    }
  };
  readData(Buffer.from([]));
}

// TODO create nonce for sending with ping
const createNonce = () => {

}

export class BtcPeerWorker {
  public client: net.Socket | any;
  private util = new Utils();
  // bitcoin specific vars
  private magic: Buffer;
  private magicInt: number = 0;
  private networkServices = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
  private emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
  private userAgent: Buffer = this.util.varStringBuffer('/peer-module/');
  private blockStartHeight = Buffer.from('00000000', 'hex'); //block start_height, can be empty
  //If protocol version is new enough, add do not relay transactions flag byte, outlined in BIP37
  //https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki#extensions-to-existing-messages
  private relayTransactions: Buffer = Buffer.from([0x00]); // false by default
  //https://en.bitcoin.it/wiki/Protocol_specification#Inventory_Vectors
  private invCodes = {
    error: 0,
    tx: 1,
    block: 2,
    blockFiltered: 3,
    blockCompact: 4
  };
  private verack = false;

  private rejectedRetryMax = 3;
  private rejectedRetryAttempts = 0;
  private rejectedRetryPause = 2000;

  private headers: Buffer | undefined;
  private waitingForHeaders = false;

  //generalized vars
  private validConnectionConfig = true;
  public commands = {
    addr: commandStringBuffer('addr'),
    alert: commandStringBuffer('alert'),
    block: commandStringBuffer('block'),
    blocktxn: commandStringBuffer('blocktxn'),
    checkorder: commandStringBuffer('checkorder'),
    feefilter: commandStringBuffer('feefilter'),
    getaddr: commandStringBuffer('getaddr'),
    getblocks: commandStringBuffer('getblocks'),
    getblocktxn: commandStringBuffer('getblocktxn'),
    getdata: commandStringBuffer('getdata'),
    getheaders: commandStringBuffer('getheaders'),
    headers: commandStringBuffer('headers'),
    inv: commandStringBuffer('inv'),
    mempool: commandStringBuffer('mempool'),
    notfound: commandStringBuffer('notfound'),
    ping: commandStringBuffer('ping'),
    pong: commandStringBuffer('pong'),
    reject: commandStringBuffer('reject'),
    reply: commandStringBuffer('reply'),
    sendcmpct: commandStringBuffer('sendcmpct'),
    sendheaders: commandStringBuffer('sendheaders'),
    submitorder: commandStringBuffer('submitorder'),
    tx: commandStringBuffer('tx'),
    verack: commandStringBuffer('verack'),
    version: commandStringBuffer('version')
  };

  // events
  // connect
  private connectDispatcher = new EventDispatcher<ConnectEvent>();
  private onConnect(handler: Handler<ConnectEvent>): void {
    this.connectDispatcher.register(handler);
  }
  private fireConnect(event: ConnectEvent): void {
    this.connectDispatcher.fire(event);
  }
  // disconnect
  private disconnectDispatcher = new EventDispatcher<DisconnectEvent>();
  private onDisconnect(handler: Handler<DisconnectEvent>): void {
    this.disconnectDispatcher.register(handler);
  }
  private fireDisconnect(event: DisconnectEvent): void {
    this.disconnectDispatcher.fire(event);
  }
  // connection rejected
  private connectionRejectedDispatcher = new EventDispatcher<ConnectionRejectedEvent>();
  private onConnectionRejected(handler: Handler<ConnectionRejectedEvent>): void {
    this.connectionRejectedDispatcher.register(handler);
  }
  private fireConnectionRejected(event: ConnectionRejectedEvent): void {
    this.connectionRejectedDispatcher.fire(event);
  }
  // error
  private errorDispatcher = new EventDispatcher<ErrorEvent>();
  private onError(handler: Handler<ErrorEvent>): void {
    this.errorDispatcher.register(handler);
  }
  private fireError(event: ErrorEvent): void {
    this.errorDispatcher.fire(event);
  }
  // message
  private sentMessageDispatcher = new EventDispatcher<SentMessageEvent>();
  private onSentMessage(handler: Handler<SentMessageEvent>): void {
    this.sentMessageDispatcher.register(handler);
  }
  private fireSentMessage(event: SentMessageEvent): void {
    this.sentMessageDispatcher.fire(event);
  }
  // block notify
  private blockNotifyDispatcher = new EventDispatcher<BlockNotifyEvent>();
  private onBlockNotify(handler: Handler<BlockNotifyEvent>): void {
    this.blockNotifyDispatcher.register(handler);
  }
  private fireBlockNotify(event: BlockNotifyEvent): void {
    this.blockNotifyDispatcher.fire(event);
  }
  // tx notify
  private txNotifyDispatcher = new EventDispatcher<TxNotifyEvent>();
  private onTxNotify(handler: Handler<TxNotifyEvent>): void {
    this.txNotifyDispatcher.register(handler);
  }
  private fireTxNotify(event: TxNotifyEvent): void {
    this.txNotifyDispatcher.fire(event);
  }
  // peer message
  private peerMessageDispatcher = new EventDispatcher<PeerMessageEvent>();
  private onPeerMessage(handler: Handler<PeerMessageEvent>): void {
    this.peerMessageDispatcher.register(handler);
  }
  private firePeerMessage(event: PeerMessageEvent): void {
    this.peerMessageDispatcher.fire(event);
  }
  // version message
  private versionDispatcher = new EventDispatcher<VersionEvent>();
  private onVersion(handler: Handler<VersionEvent>): void {
    this.versionDispatcher.register(handler);
  }
  private fireVersion(event: VersionEvent): void {
    this.versionDispatcher.fire(event);
  }
  // event handlers
  public on(event: string, handler: Handler<any>): void {
    switch(event) {
      case 'connect':
        this.onConnect(handler);
        break;
      case 'disconnect':
        this.onDisconnect(handler);
        break;
      case 'version':
        this.onVersion(handler);
        break;
      case 'error':
        this.onError(handler);
        break;
      case 'block':
        this.onBlockNotify(handler);
        break;
      case 'tx':
        this.onTxNotify(handler);
        break;
      case 'peer_message':
        this.onPeerMessage(handler);
        break;
      case 'sent_message':
        this.onSentMessage(handler);
        break;
      default:
        console.error('no event named', event);
        break;
    }
  }

  constructor(private options: any) {
    this.magic = Buffer.from(options.peerMagic, 'hex');
    try {
      this.magicInt = this.magic.readUInt32LE(0);
    } catch (e) {
      this.fireError({message: 'read peer magic failed in constructor'});
      return;
    }

    if (!options.disableTransactions) {
      this.relayTransactions = Buffer.from([]);
    }

    this.onConnectionRejected(event => {
      this.fireError({message: 'connection rejected, maybe banned, or old protocol version'});
      if (this.options.persist) {
        // pause for 2 seconds, try again.
        if (this.rejectedRetryAttempts < this.rejectedRetryMax) {
          this.rejectedRetryAttempts++;
          setTimeout(() => {
            this.connect();
          }, this.rejectedRetryPause);
        } else {
          this.fireError({message: 'max rejected retries hit (' + this.rejectedRetryMax + ')'});
        }
      }
    });

    this.onDisconnect(event => {
      this.verack = false;
      if (this.options.persist) {
        this.connect();
      }
    });
    this.client = this.connect();
  }

  private connect(): net.Socket {
    const client = net.connect({
      host: this.options.host,
      port: this.options.port
    }, () => {
      this.rejectedRetryAttempts = 0;
      this.sendVersion();
      this.startPings();
    });
    this.client.on('close', () => {
      if (this.verack) {
        this.fireDisconnect({});
      } else if (this.validConnectionConfig) {
        this.fireConnectionRejected({});
      }
    });
    this.client.on('error', (e: any) => {
      if (e.code === 'ECONNREFUSED') {
        this.fireError({message: 'connection failed'});
      } else {
        this.fireError({message: 'socket error'});
      }
      if (this.options.persist) {
        setTimeout(() => {
          this.connect();
        }, CONNECTION_RETRY);
      }
    });

    this.setupMessageParser(this.client);
    return client;
  }

  private sendVersion(): void {
    const payload = Buffer.concat([
      this.util.packUInt32LE(this.options.protocolVersion),
      this.networkServices,
      this.util.packInt64LE(Date.now() / 1000 | 0),
      this.emptyNetAddress,
      this.emptyNetAddress,
      crypto.pseudoRandomBytes(8), //nonce, random unique ID
      this.userAgent,
      this.blockStartHeight,
      this.relayTransactions
    ]);
    this.sendMessage(this.commands.version, payload);
    this.fireSentMessage({command: 'version'});
  }

  private setupMessageParser(client: net.Socket): void {
    const beginReadingMessage = (preRead: Buffer) => {
      readFlowingBytes(client, 24, preRead, (header: Buffer, lopped: Buffer) => {
        let msgMagic;
        try {
          msgMagic = header.readUInt32LE(0);
        } catch (e) {
          this.fireError({message: 'read peer magic failed in setupMessageParser'});
          return;
        }

        if (msgMagic !== this.magicInt) {
          this.fireError({message: 'bad magic'});
          try {
            while (header.readUInt32LE(0) !== this.magicInt && header.length >= 4) {
              header = header.slice(1);
            }
            if (header.readUInt32LE(0) === this.magicInt) {
              beginReadingMessage(header);
            } else {
              beginReadingMessage(Buffer.from([]));
            }
          } catch (e) {
            // TODO: fix this
            // related to parsing new segwit transactions?
            // https://github.com/bitpay/insight/issues/842
            // add rpcserialversion=0 to wallet .conf file
          }
          return;
        }
        const msgCommand: string = header.slice(4, 16).toString();
        const msgLength: number = header.readUInt32LE(16);
        const msgChecksum: number = header.readUInt32LE(20);
        // console.log('--', msgCommand, '--', header);
        readFlowingBytes(client, msgLength, lopped, (payload: Buffer, lopped: Buffer) => {
          if (this.util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
            this.fireError({message: 'bad payload - failed checksum'});
            // beginReadingMessage(null); // TODO do we need this?
            return;
          }
          this.handleMessage(msgCommand, payload);
          beginReadingMessage(lopped);
        });
      });
    };
    // beginReadingMessage(null); // TODO do we need this?
  }

  private handleInv(payload: Buffer): void {
    let count = payload.readUInt8(0);
    payload = payload.slice(1);
    if (count >= 0xfd) {
      count = payload.readUInt16LE(0);
      payload = payload.slice(2);
    }
    while (count--) {
      let type;
      try {
        type = payload.readUInt32LE(0);
      } catch (e) {

      }
      if (type) {
        this.firePeerMessage({command: 'inv', payload: {type: type}});
      }
      switch (type) {
        case this.invCodes.error:
          console.log('error, you can ignore this');
          break;
        case this.invCodes.tx:
          let tx = payload.slice(4, 36).toString('hex');
          this.fireTxNotify({hash: tx});
          break;
        case this.invCodes.block:
          let block = payload.slice(4, 36).reverse().toString('hex');
          this.fireBlockNotify({hash: block});
          break;
        case this.invCodes.blockFiltered:
          let fBlock = payload.slice(4, 36).reverse().toString('hex');
          console.log('filtered block:', fBlock);
          break;
        case this.invCodes.blockCompact:
          let cBlock = payload.slice(4, 36).reverse().toString('hex');
          console.log('compact block:', cBlock);
          break;
      }
      payload = payload.slice(36);
    }
  }

  private handleVersion(payload: Buffer): void {
    const s = new MessageParser(payload);
    let parsed = {
      version: s.readUInt32LE(0),
      services: parseInt(s.raw(8).slice(0,1).toString('hex'), 16),
      time: s.raw(8),
      addr_recv: s.raw(26).toString('hex'),
      addr_from: s.raw(26).toString('hex'),
      nonce: s.raw(8).toString('hex'),
      client: s.readVarString(),
      height: s.readUInt32LE(),
      relay: Boolean(s.raw(1))
    };
    if (parsed.time !== false && parsed.time.readUInt32LE(4) === 0) {
      parsed.time = new Date(parsed.time.readUInt32LE(0)*1000);
    }
    this.fireVersion(parsed);
  }

  private handleReject(payload: Buffer): void {
    console.log(payload);
  }

  private getHost(buff: Buffer): {host: string; version: number} {
    if (buff.slice(0,12).toString('hex') === IPV6_IPV4_PADDING.toString('hex')) {
      //IPv4
      return { host: buff.slice(12).join('.'), version: 4 };
    } else {
      //IPv6
      // non-null type guard (!) https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Advanced%20Types.md#type-guards-and-type-assertions
      return { host: buff.slice(0,16).toString('hex')
        .match(/(.{1,4})/g)!
        .join(':')
        .replace(/\:(0{1,3})/g, ':')
        .replace(/^(0{1,3})/g, ''),
        version: 6 };
    }
  }

  private getAddr(buff: Buffer): PeerAddress {
    let addr: PeerAddress = {
      hostRaw: Buffer.from([]),
      host: '',
      port: 0,
      ipVersion: 0
    };
    let host = {
      host: '',
      version: 0
    }
    let svc: Buffer;
    if (buff.length === 30) {
      addr.timestamp = buff.readUInt32LE(0) * 1000; // to miliseconds
      svc = Buffer.allocUnsafe(8);
      buff.copy(svc, 0, 4, 12);
      addr.services = svc.toString('hex');
      addr.hostRaw = Buffer.allocUnsafe(16);
      buff.copy(addr.hostRaw, 0, 12, 28);
      host = this.getHost(addr.hostRaw);
      addr.host = host.host;
      addr.ipVersion = host.version;
      addr.port = buff.readUInt16BE(28);
    } else {
      this.fireError({message: 'address field length not 30', payload: buff});
    }
    return addr;
  }

  private handleAddr(payload: Buffer): void {
    const addrs = this.parseAddrMessage(payload);
    this.firePeerMessage({command: 'addr', payload: {host: this.options.host, port: this.options.port, addresses: addrs}});
  }

  private parseAddrMessage(payload: Buffer): PeerAddress[] {
    const s = new MessageParser(payload);
    let addrs = [];
    let addrNum = s.readVarInt();
    for (let i = 0; i < addrNum; i++) {
      addrs.push(this.getAddr(s.raw(30)));
    }
    return addrs;
  }

  private startPings(): void {
    setInterval(() => {
      this.sendPing();
    }, PING_INTERVAL);
  }

  private sendPing(): void {
    const payload = Buffer.concat([crypto.pseudoRandomBytes(8)]);
    this.sendMessage(this.commands.ping, payload);
    this.fireSentMessage({command: 'ping'});
  }

  private handlePing(payload: Buffer): void {
    let nonce = null;
    let sendBack = null;
    if (payload.length) {
      nonce = new MessageParser(payload).raw(8).toString('hex');
      // nonce = payload.readUInt16BE(0);
      // nonce += payload.readUInt16BE(2);
      // nonce += payload.readUInt16BE(4);
      // nonce += payload.readUInt16BE(6);
    }
    if (nonce) {
      // sendBack = fixedLenStringBuffer(nonce, 8);
      sendBack = payload;
    } else {
      sendBack = Buffer.from([]);
    }
    // console.log(sendBack);
    this.sendMessage(this.commands.pong, sendBack);
    this.fireSentMessage({command: 'pong', payload: {message: 'nonce: ' + nonce}});
  }

  private sendHeadersBack(payload: Buffer): void {
    this.sendMessage(this.commands.headers, payload);
    this.fireSentMessage({command: 'headers', payload: {}});
  }

  private handleHeaders(payload: Buffer): void {
    this.headers = payload;
  }

  private handleHeaderRequest(payload: Buffer): void {
    if (this.headers === undefined) {
      this.waitingForHeaders = true;
      this.sendMessage(this.commands.getheaders, payload);
      this.fireSentMessage({command: 'getheaders', payload: {}});
    } else {
      this.sendHeadersBack(this.headers);
    }
  }

  private handleMessage(command: string, payload: Buffer): void {
    this.firePeerMessage({command: command});
    // console.log(payload);
    switch (command) {
      case this.commands.ping.toString():
        this.handlePing(payload);
        break;
      case this.commands.inv.toString():
        this.handleInv(payload);
        break;
      case this.commands.addr.toString():
        this.handleAddr(payload);
        break;
      case this.commands.verack.toString():
        if (!this.verack) {
          this.verack = true;
          this.fireConnect({});
        }
        break;
      case this.commands.version.toString():
        this.sendMessage(this.commands.verack, Buffer.from([]));
        this.fireSentMessage({command: 'verack'});
        this.handleVersion(payload);
        break;
      case this.commands.reject.toString():
        this.handleReject(payload);
        break;
      case this.commands.getheaders.toString():
        this.handleHeaderRequest(payload);
        break;
      case this.commands.headers.toString():
        if (this.waitingForHeaders) {
          this.headers = payload;
          this.waitingForHeaders = false;
          this.sendHeadersBack(payload);
        } else {
          this.handleHeaders(payload);
        }
        break;
      default:
        // nothing
        break;
    }
  }

  public sendMessage(command: Buffer, payload: Buffer): void {
    const message = Buffer.concat([
      this.magic,
      command,
      this.util.packUInt32LE(payload.length),
      this.util.sha256d(payload).slice(0,4),
      payload
    ]);
    this.client.write(message);
  }
}
