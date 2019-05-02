import * as net from 'net';
import * as crypto from 'crypto';
import { MessageBuilder } from 'crypto-binary';

import { Events } from '../events/events';
import { Utils } from '../util/general.util';
import { MessageHandlers } from './message.handlers';

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

export class Message {
  protected util: Utils = new Utils();
  protected handlers: MessageHandlers = new MessageHandlers();

  // version message vars
  private networkServices: Buffer = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
  private emptyNetAddress: Buffer = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
  private userAgent: Buffer = this.util.varStringBuffer('/btcp2p/');
  private blockStartHeight: Buffer = Buffer.from('00000000', 'hex'); //block start_height, can be empty
  //If protocol version is new enough, add do not relay transactions flag byte, outlined in BIP37
  //https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki#extensions-to-existing-messages
  private relayTransactions: Buffer = Buffer.from([0x00]); // false by default

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

  constructor(private magic, private magicInt, private options) {}

  sendMessage(command: Buffer, payload: Buffer, socket: net.Socket): void {
    const message = Buffer.concat([
      this.magic,
      command,
      this.util.packUInt32LE(payload.length),
      this.util.sha256d(payload).slice(0,4),
      payload
    ]);
    socket.write(message);
  }

  sendVersion(events: Events, socket: net.Socket): void {
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

  sendPing(events: Events, socket: net.Socket): void {
    const payload = Buffer.concat([crypto.pseudoRandomBytes(8)]);
    this.sendMessage(this.commands.ping, payload, socket);
    events.fireSentMessage({command: 'ping'});
  }

  sendHeaders(payload: Buffer, events: Events, socket: net.Socket): void {
    this.sendMessage(this.commands.headers, payload, socket);
    events.fireSentMessage({command: 'headers', payload: {}});
  }

  sendGetHeaders(payload: Buffer, events: Events, socket: net.Socket): void {
    this.sendMessage(this.commands.getheaders, payload, socket);
    events.fireSentMessage({command: 'getheaders', payload: {}});
  }

  getAddresses(socket: net.Socket): void {
    this.sendMessage(this.commands.getaddr, Buffer.from([]), socket);
  }

  sendReject(msg: string, ccode: number, reason: string, extra: string, socket: net.Socket): void {
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

  setupMessageParser(events: Events, socket: net.Socket): void {
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

  private handleMessage(command: string, payload: Buffer, events: Events, socket: net.Socket): void {
    events.firePeerMessage({command: command});
    // console.log(payload);
    switch (command) {
      case this.commands.ping.toString():
        this.handlers.handlePing(payload, events)
        .then((ping) => {
          // send pong
          this.sendMessage(this.commands.pong, ping.nonce, socket);
          events.fireSentMessage({command: 'pong', payload: {
            message: 'nonce: ' + ping.nonce.toString('hex')
          }});
        });
        break;
      case this.commands.pong.toString():
        this.handlers.handlePong(payload, events);
        break;
      case this.commands.inv.toString():
        this.handlers.handleInv(payload, events);
        break;
      case this.commands.addr.toString():
        this.handlers.handleAddr(payload, events);
        break;
      case this.commands.verack.toString():
        events.fireVerack(true);
        break;
      case this.commands.version.toString():
        this.handlers.handleVersion(payload, events)
        .then((version) => {
          this.sendMessage(this.commands.verack, Buffer.from([]), socket);
          events.fireSentMessage({command: 'verack'});
        });
        break;
      case this.commands.reject.toString():
        this.handlers.handleReject(payload, events);
        break;
      case this.commands.getheaders.toString():
        this.handlers.handleGetHeaders(payload, events);
        break;
      case this.commands.headers.toString():
          this.handlers.handleHeaders(payload, events);
        break;
      default:
        // nothing
        break;
    }
  }
}
