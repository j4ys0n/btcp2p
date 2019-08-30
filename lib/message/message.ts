import * as net from 'net';
import * as crypto from 'crypto';
import { MessageBuilder } from 'crypto-binary';

import { MessageConsts } from './message.consts';
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { MessageHandlers } from './message.handlers';
import { BlockHandler } from '../blocks/block-handler';
import { TransactionHandler } from '../transactions/transaction-handler';
import { PeerHandler } from '../peers/peers';

import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';

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

const IPV6_IPV4_PADDING = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);

export class Message {
  protected util: Utils = new Utils();
  protected dbUtil: DbUtil = new DbUtil();
  protected messageConsts: MessageConsts = new MessageConsts(this.util);
  protected handlers: MessageHandlers;
  public blockHandler: BlockHandler;
  protected transactionHandler: TransactionHandler;
  protected peerHandler!: PeerHandler;

  private magic!: Buffer;
  private magicInt: number = 0;
  // version message vars
  private networkServices: Buffer = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
  private emptyNetAddress: Buffer = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
  private userAgent: Buffer = this.util.varStringBuffer('/btcp2p/');
  private blockStartHeight: Buffer = Buffer.from('00000000', 'hex'); //block start_height, can be empty
  //If protocol version is new enough, add do not relay transactions flag byte, outlined in BIP37
  //https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki#extensions-to-existing-messages
  private relayTransactions: Buffer = Buffer.from('0x00', 'hex'); // false by default

  public commands = this.messageConsts.commands;

  /**
   * @param messageOptions: MessageOptions = {
   *  magic: string,
   *  relayTransactions: boolean,
   *  protocolVersion: number,
   * }
   */

  constructor(private options: StartOptions, private scope: ProtocolScope) {
    this.magic = Buffer.from(this.options.network.magic, 'hex');
    try {
      this.magicInt = this.magic.readUInt32LE(0);
    } catch (e) {
      throw new Error('read peer magic failed in constructor');
    }
    if (this.options.relayTransactions) {
      this.relayTransactions = Buffer.from('0x01', 'hex');
    } else {
      this.relayTransactions = Buffer.from('0x00', 'hex');
    }
    this.handlers = new MessageHandlers(this.scope, this.util, this.dbUtil, this.options);
    this.blockHandler = new BlockHandler(this.scope, this.util, this.dbUtil, this.options);
    this.transactionHandler = new TransactionHandler(this.scope, this.util, this.dbUtil, this.options);
    this.peerHandler = new PeerHandler(this.scope);
  }

  sendMessage(command: Buffer, payload: Buffer): void {
    const message = Buffer.concat([
      this.magic,
      command,
      this.util.packUInt32LE(payload.length),
      this.util.sha256d(payload).slice(0,4),
      payload
    ]);
    this.scope.socket.write(message);
  }

  sendVersion(): void {
    // https://en.bitcoin.it/wiki/Protocol_documentation#version
    const payload = Buffer.concat([
      this.util.packUInt32LE(this.options.network.protocolVersion),
      this.networkServices,
      this.util.packInt64LE(Date.now() / 1000 | 0),
      this.emptyNetAddress,
      this.emptyNetAddress,
      createNonce(), //nonce, random unique ID
      this.userAgent,
      this.blockStartHeight,
      this.relayTransactions
    ]);
    this.sendMessage(this.commands.version, payload);
    this.scope.events.fire('sent_message', {command: 'version'});
  }

  sendVerack():void {
    // TODO lets actually check the version here instead of just confirming
    this.sendMessage(this.commands.verack, Buffer.from([]));
    this.scope.events.fire('sent_message', {command: 'verack'});
  }

  sendPing(): void {
    const payload = Buffer.concat([crypto.pseudoRandomBytes(8)]);
    this.sendMessage(this.commands.ping, payload);
    this.scope.events.fire('sent_message', {command: 'ping'});
  }

  sendHeaders(payload: Buffer): void {
    this.sendMessage(this.commands.headers, payload);
    this.scope.events.fire('sent_message', {command: 'headers', payload: {}});
  }

  sendGetHeaders(payload: Buffer): void {
    this.sendMessage(this.commands.getheaders, payload);
    this.scope.events.fire('sent_message', {command: 'getheaders', payload: {}});
  }

  sendGetAddr(): void {
    this.sendMessage(this.commands.getaddr, Buffer.from([]));
    this.scope.events.fire('sent_message', {command: 'getaddr', payload: {}});
  }

  sendGetBlocks(hash: string): void {
    const hashCount = Buffer.from([0x01]);
    const headerHashes = Buffer.from(this.util.reverseHexBytes(hash), 'hex');
    const stopHash = Buffer.from(this.util.stopHash(32));
    const payload = Buffer.concat([
      this.util.packUInt32LE(this.options.network.protocolVersion),
      hashCount,
      headerHashes,
      stopHash
    ]);
    this.sendMessage(this.commands.getblocks, payload);
    this.scope.events.fire('sent_message', {command: 'getblocks', payload: {}});
  }

  sendGetData(payload: Buffer): void {
    this.sendMessage(this.commands.getdata, payload);
    this.scope.events.fire('sent_message', {command: 'getdata', payload: payload});
  }

  sendAddr(ip: string, port: number): void {
    const count = Buffer.from([0x01]);
    const date = this.util.packUInt32LE(Date.now() / 1000 | 0);
    const host = this.ipTo16ByteBuffer(ip);
    const prt = this.util.packUInt16BE(port);
    const payload = Buffer.concat([
      count, date, this.networkServices, host, prt
    ]);
    this.sendMessage(this.commands.addr, payload);
    this.scope.events.fire('sent_message', {command: 'getaddr', payload: payload});
  }

  sendReject(msg: string, ccode: number, reason: string, extra: string): void {
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
      message.buffer
    )
  }

  setupMessageParser(): void {
    const beginReadingMessage = (preRead: Buffer) => {
      readFlowingBytes(this.scope.socket, 24, preRead, (header: Buffer, lopped: Buffer) => {
        let msgMagic;
        try {
          msgMagic = header.readUInt32LE(0);
        } catch (e) {
          this.scope.events.fire('error', {message: 'read peer magic failed in setupMessageParser'});
          return;
        }

        if (msgMagic !== this.magicInt) {
          this.scope.events.fire('error', {message: 'bad magic'});
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
        readFlowingBytes(this.scope.socket, msgLength, lopped, (payload: Buffer, lopped: Buffer) => {
          if (this.util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
            this.scope.events.fire('error', {message: 'bad payload - failed checksum'});
            // beginReadingMessage(null); // TODO do we need this?
            return;
          }
          this.handleMessage(msgCommand, payload);
          beginReadingMessage(lopped);
        });
      });
    };
    beginReadingMessage(Buffer.from([]));
  }

  private ipTo16ByteBuffer(ip: string) {
    const ipv4Addr = ip.split('.').map((segment: string) => {
      return parseInt(segment, 10)
    });
    const ipv6Padded = [
      IPV6_IPV4_PADDING,
      Buffer.from(ipv4Addr)
    ]
    return Buffer.concat(ipv6Padded);
  }

  private handleMessage(command: string, payload: Buffer): void {
    this.scope.events.fire('peer_message', {command: command});
    // console.log(payload);
    switch (command) {
      case this.commands.verack.toString():
        this.scope.events.fire('verack', true);
        break;
      case this.commands.version.toString():
        this.handlers.handleVersion(payload)
        .then((version) => {
          this.sendVerack();
        });
        break;
      case this.commands.ping.toString():
        this.handlers.handlePing(payload)
        .then((ping) => {
          // send pong
          this.sendMessage(this.commands.pong, ping.nonce);
          this.scope.events.fire('sent_message', {command: 'pong', payload: {
            message: 'nonce: ' + ping.nonce.toString('hex')
          }});
        });
        break;
      case this.commands.pong.toString():
        this.handlers.handlePong(payload);
        break;
      case this.commands.inv.toString():
        this.handlers.handleInv(payload);
        break;
      case this.commands.addr.toString():
        this.peerHandler.handleAddr(payload);
        break;
      case this.commands.reject.toString():
        this.handlers.handleReject(payload);
        break;
      case this.commands.getheaders.toString():
        this.blockHandler.handleGetHeaders(payload);
        break;
      case this.commands.headers.toString():
        this.blockHandler.handleHeaders(payload);
        break;
      case this.commands.block.toString():
        this.blockHandler.handleBlock(payload);
        break;
      case this.commands.tx.toString():
        this.transactionHandler.handleTransaction(payload);
        break;
      case this.commands.notfound.toString():
        this.handlers.handleNotFound(payload);
        break;
      case this.commands.sendheaders.toString():
        // TODO
        break;
      default:
        // nothing
        this.scope.events.fire('error', {
          message: 'unhandled peer message ' + command,
          payload: payload
        })
        break;
    }
  }
}
