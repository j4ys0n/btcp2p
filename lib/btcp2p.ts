import * as net from 'net';
import * as crypto from 'crypto';
import { MessageParser, MessageBuilder } from 'crypto-binary';

// class imports
import { Events } from './events/events';
import { RejectedEvent } from './interfaces/events.interface'
import { Utils } from './util/general.util';

// interface imports
import { StartOptions, PeerAddress } from './interfaces/peer.interface';

// testing flag
const ENV = process.env.NODE_ENV;
const ENVS = {
  test: 'test'
}
// general consts
const MINUTE = 60 * 1000;
const CONNECTION_RETRY = 5 * MINUTE;
const PING_INTERVAL = 5 * MINUTE;
const IPV6_IPV4_PADDING = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);

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
  return crypto.pseudoRandomBytes(8)
}

export class BTCP2P {
  public client!: net.Socket;
  private server!: net.Server;
  public serverSocket!: net.Socket;
  private serverStarting: boolean = false;
  private serverStarted: boolean = false;
  protected clientEvents: Events = new Events();
  protected serverEvents: Events = new Events();
  public onClient = this.clientEvents.on.bind(this.clientEvents);
  public onServer = this.serverEvents.on.bind(this.serverEvents);
  protected util: Utils = new Utils();
  // bitcoin specific vars
  private magic: Buffer;
  private magicInt: number = 0;
  private networkServices: Buffer = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
  private emptyNetAddress: Buffer = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
  private userAgent: Buffer = this.util.varStringBuffer('/btcp2p/');
  private blockStartHeight: Buffer = Buffer.from('00000000', 'hex'); //block start_height, can be empty
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

  private headers!: Buffer;
  private waitingForHeaders = false;

  //generalized vars
  private validConnectionConfig = true;
  public commands = {
    addr: this.util.commandStringBuffer('addr'),
    alert: this.util.commandStringBuffer('alert'),
    block: this.util.commandStringBuffer('block'),
    blocktxn: this.util.commandStringBuffer('blocktxn'),
    checkorder: this.util.commandStringBuffer('checkorder'),
    feefilter: this.util.commandStringBuffer('feefilter'),
    getaddr: this.util.commandStringBuffer('getaddr'),
    getblocks: this.util.commandStringBuffer('getblocks'),
    getblocktxn: this.util.commandStringBuffer('getblocktxn'),
    getdata: this.util.commandStringBuffer('getdata'),
    getheaders: this.util.commandStringBuffer('getheaders'),
    headers: this.util.commandStringBuffer('headers'),
    inv: this.util.commandStringBuffer('inv'),
    mempool: this.util.commandStringBuffer('mempool'),
    notfound: this.util.commandStringBuffer('notfound'),
    ping: this.util.commandStringBuffer('ping'),
    pong: this.util.commandStringBuffer('pong'),
    reject: this.util.commandStringBuffer('reject'),
    reply: this.util.commandStringBuffer('reply'),
    sendcmpct: this.util.commandStringBuffer('sendcmpct'),
    sendheaders: this.util.commandStringBuffer('sendheaders'),
    submitorder: this.util.commandStringBuffer('submitorder'),
    tx: this.util.commandStringBuffer('tx'),
    verack: this.util.commandStringBuffer('verack'),
    version: this.util.commandStringBuffer('version')
  };

  /**
   * @param options: StartOptions = {
   *  name: string,
   *  peerMagic: string,
   *  disableTransactions: boolean,
   *  host: string,
   *  port: number,
   *  listenPort: number,
   *  protocolVersion: number,
   *  persist: boolean
   * }
   */

  constructor(private options: StartOptions) {
    this.magic = Buffer.from(options.peerMagic, 'hex');
    try {
      this.magicInt = this.magic.readUInt32LE(0);
    } catch (e) {
      this.clientEvents.fireError({message: 'read peer magic failed in constructor'});
      return;
    }

    if (!options.disableTransactions) {
      this.relayTransactions = Buffer.from([]);
    }

    this.clientEvents.onConnectionRejected(event => {
      this.clientEvents.fireError({message: 'connection rejected, maybe banned, or old protocol version'});
      if (this.options.persist) {
        // pause for 2 seconds, try again.
        if (this.rejectedRetryAttempts < this.rejectedRetryMax) {
          this.rejectedRetryAttempts++;
          setTimeout(() => {
            this.connect();
          }, this.rejectedRetryPause);
        } else {
          this.clientEvents.fireError({message: 'max rejected retries hit (' + this.rejectedRetryMax + ')'});
        }
      }
    });

    this.clientEvents.onDisconnect(event => {
      this.verack = false;
      if (this.options.persist) {
        this.connect();
      }
    });

    // start server and if necessary init connection
    if (this.options.listenPort !== undefined) {
      this.server = net.createServer((socket) => {
        this.serverSocket = socket;
        this.setupMessageParser(socket, this.serverEvents);
      });
      if (
        this.options.host !== undefined &&
        this.options.port !== undefined
      ) {
        this.startServer()
        .then(() => {
          this.initConnection();
        })
      }
    }

    // if no server to start, just init connection
    if (
      this.options.host !== undefined &&
      this.options.port !== undefined &&
      this.options.listenPort === undefined
    ) {
      this.initConnection();
    }
  }

  private initConnection(): void {
    this.client = this.connect(this.options.host, this.options.port);
    this.setupMessageParser(this.client, this.clientEvents);
  }

  public startServer(): Promise<any> {
    // not started buy default
    return new Promise((resolve, reject) => {
      if (!this.serverStarted && !this.serverStarting) {
        this.serverStarting = true;
        this.server.listen(this.options.listenPort, () => {
          console.log('  local server listening on', this.options.listenPort);
          this.serverStarting = false;
          this.serverStarted = true;
          resolve(true);
        })
      } else {
        resolve(true);
      }
    })
  }

  public stopServer(): void {
    this.server.close();
  }

  // client only
  public connect(host: string = '', port: number = 0): net.Socket {
    const client = net.connect({
      host: (host === '') ? this.options.host as string : host,
      port: (port === 0) ? this.options.port as number : port
    }, () => {
      this.rejectedRetryAttempts = 0;
      this.sendVersion(this.clientEvents, client);
      this.startPings(this.clientEvents, client);
    });
    client.on('close', () => {
      if (this.verack) {
        this.clientEvents.fireDisconnect({});
      } else if (this.validConnectionConfig) {
        this.clientEvents.fireConnectionRejected({});
      }
    });
    client.on('error', (e: any) => {
      if (e.code === 'ECONNREFUSED') {
        this.clientEvents.fireError({message: 'connection failed'});
      } else {
        this.clientEvents.fireError({message: 'socket error'});
      }
      if (this.options.persist) {
        setTimeout(() => {
          this.connect();
        }, CONNECTION_RETRY);
      }
    });

    return client;
  }

  // client and server
  protected sendVersion(events: Events, socket: net.Socket): void {
    const payload = Buffer.concat([
      this.util.packUInt32LE(this.options.protocolVersion),
      this.networkServices,
      this.util.packInt64LE(Date.now() / 1000 | 0),
      this.emptyNetAddress,
      this.emptyNetAddress,
      createNonce(), //nonce, random unique ID
      this.userAgent,
      this.blockStartHeight,
      this.relayTransactions
    ]);
    this.sendMessage(this.commands.version, payload, socket);
    events.fireSentMessage({command: 'version'});
  }

  public getAddresses(socket: net.Socket): void {
    this.sendMessage(this.commands.getaddr, Buffer.from([]), socket);
  }

  // client and server
  private setupMessageParser(socket: net.Socket, events: Events): void {
    const beginReadingMessage = (preRead: Buffer) => {
      readFlowingBytes(socket, 24, preRead, (header: Buffer, lopped: Buffer) => {
        let msgMagic;
        try {
          msgMagic = header.readUInt32LE(0);
        } catch (e) {
          events.fireError({message: 'read peer magic failed in setupMessageParser'});
          return;
        }

        if (msgMagic !== this.magicInt) {
          events.fireError({message: 'bad magic'});
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
        readFlowingBytes(socket, msgLength, lopped, (payload: Buffer, lopped: Buffer) => {
          if (this.util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
            events.fireError({message: 'bad payload - failed checksum'});
            // beginReadingMessage(null); // TODO do we need this?
            return;
          }
          this.handleMessage(msgCommand, payload, events, socket);
          beginReadingMessage(lopped);
        });
      });
    };
    beginReadingMessage(Buffer.from([]));
  }

  // client and server
  private handleInv(payload: Buffer, events: Events): void {
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
        events.firePeerMessage({command: 'inv', payload: {type: type}});
      }
      switch (type) {
        case this.invCodes.error:
          console.log('error, you can ignore this');
          break;
        case this.invCodes.tx:
          let tx = payload.slice(4, 36).toString('hex');
          events.fireTxNotify({hash: tx});
          break;
        case this.invCodes.block:
          let block = payload.slice(4, 36).reverse().toString('hex');
          events.fireBlockNotify({hash: block});
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

  // client and server
  private handleVersion(payload: Buffer, events: Events): void {
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
    events.fireVersion(parsed);
  }

  private handleReject(payload: Buffer, events: Events): void {
    const p = new MessageParser(payload);
    const messageLen = p.readInt8();
    const message = p.raw(messageLen).toString();
    const ccode = p.readInt8();
    const reasonLen = p.readInt8();
    const reason = p.raw(reasonLen).toString();
    const extraLen = (p.buffer.length -1) - (p.pointer -1);
    const extra = (extraLen > 0) ? p.raw(extraLen).toString() : '';

    let rejected: RejectedEvent = {
      message,
      ccode,
      reason,
      extra
    };
    events.fireReject(rejected);
  }

  public sendReject(msg: string, ccode: number, reason: string, extra: string, socket: net.Socket): void {
    const msgBytes = msg.length
    const reasonBytes = reason.length;
    const extraBytes = extra.length;
    const len = 1 + msgBytes + 1 + 1 + reasonBytes + extraBytes;
    const message = new MessageBuilder(len);
    message.putInt8(msgBytes);
    message.putString(msg);
    message.putInt8(ccode);
    message.putInt8(reasonBytes);
    message.putString(reason);
    message.putString(extra);

    this.sendMessage(
      this.commands.reject,
      message.buffer,
      socket
    )
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

  // client and server
  private getAddr(buff: Buffer, events: Events): PeerAddress {
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
      events.fireError({message: 'address field length not 30', payload: buff});
    }
    return addr;
  }

  // client and server
  private handleAddr(payload: Buffer, events: Events): void {
    const addrs = this.parseAddrMessage(payload, events);
    events.fireAddr({host: this.options.host, port: this.options.port, addresses: addrs});
  }

  private parseAddrMessage(payload: Buffer, events: Events): PeerAddress[] {
    const s = new MessageParser(payload);
    let addrs: Array<PeerAddress> = [];
    let addrNum = s.readVarInt();
    for (let i = 0; i < addrNum; i++) {
      const addr: PeerAddress = this.getAddr(<Buffer>s.raw(30), events);
      addrs.push(addr);
    }
    return addrs;
  }

  private startPings(events: Events, socket: net.Socket): void {
    setInterval(() => {
      this.sendPing(events, socket);
    }, PING_INTERVAL);
  }

  // client and server
  protected sendPing(events: Events, socket: net.Socket): void {
    const payload = Buffer.concat([crypto.pseudoRandomBytes(8)]);
    this.sendMessage(this.commands.ping, payload, socket);
    events.fireSentMessage({command: 'ping'});
  }

  // client and server
  private handlePing(payload: Buffer, events: Events, socket: net.Socket): void {
    let nonce: string = '';
    let sendBack: Buffer;
    if (payload.length) {
      nonce = new MessageParser(payload).raw(8).toString('hex');
    }
    if (nonce !== '') {
      // sendBack = fixedLenStringBuffer(nonce, 8);
      sendBack = payload;
    } else {
      sendBack = Buffer.from([]);
    }
    events.firePing(sendBack);
    this.sendMessage(this.commands.pong, sendBack, socket);
    events.fireSentMessage({command: 'pong', payload: {message: 'nonce: ' + nonce}});
  }

  private handlePong(payload: Buffer, events: Events, socket: net.Socket): void {
    let nonce: Buffer;
    if (payload.length) {
      nonce = new MessageParser(payload).raw(8)
    } else {
      nonce = Buffer.from([]);
    }
    events.firePong(nonce);
  }

  // client and server
  private sendHeadersBack(payload: Buffer, events: Events, socket: net.Socket): void {
    this.sendMessage(this.commands.headers, payload, socket);
    events.fireSentMessage({command: 'headers', payload: {}});
  }

  private handleHeaders(payload: Buffer): void {
    this.headers = payload;
  }

  // client and server
  private handleHeaderRequest(payload: Buffer, events: Events, socket: net.Socket): void {
    if (this.headers === undefined) {
      this.waitingForHeaders = true;
      this.sendMessage(this.commands.getheaders, payload, socket);
      events.fireSentMessage({command: 'getheaders', payload: {}});
    } else {
      this.sendHeadersBack(this.headers, events, socket);
    }
  }

  // client and server
  private handleMessage(command: string, payload: Buffer, events: Events, socket: net.Socket): void {
    events.firePeerMessage({command: command});
    // console.log(payload);
    switch (command) {
      case this.commands.ping.toString():
        this.handlePing(payload, events, socket);
        break;
      case this.commands.pong.toString():
        this.handlePong(payload, events, socket);
        break;
      case this.commands.inv.toString():
        this.handleInv(payload, events);
        break;
      case this.commands.addr.toString():
        this.handleAddr(payload, events);
        break;
      case this.commands.verack.toString():
        events.fireVerack(true);
        if (!this.verack) {
          this.verack = true;
          events.fireConnect({});
        }
        break;
      case this.commands.version.toString():
        this.sendMessage(this.commands.verack, Buffer.from([]), socket);
        events.fireSentMessage({command: 'verack'});
        this.handleVersion(payload, events);
        break;
      case this.commands.reject.toString():
        this.handleReject(payload, events);
        break;
      case this.commands.getheaders.toString():
        this.handleHeaderRequest(payload, events, socket);
        break;
      case this.commands.headers.toString():
        if (this.waitingForHeaders) {
          this.headers = payload;
          this.waitingForHeaders = false;
          this.sendHeadersBack(payload, events, socket);
        } else {
          this.handleHeaders(payload);
        }
        break;
      default:
        // nothing
        break;
    }
  }

  protected sendMessage(command: Buffer, payload: Buffer, socket: net.Socket): void {
    const message = Buffer.concat([
      this.magic,
      command,
      this.util.packUInt32LE(payload.length),
      this.util.sha256d(payload).slice(0,4),
      payload
    ]);
    socket.write(message);
  }
}
