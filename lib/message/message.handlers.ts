import { MessageParser } from '../util/Message'

// class imports
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { BlockHandler } from '../blocks/block-handler';
import { MessageConsts } from './message.consts';
import { TransactionHandler } from '../transactions/transaction-handler';

// interface imports
import { RejectedEvent } from '../interfaces/events.interface';
import { StartOptions, ProtocolScope, Version } from '../interfaces/peer.interface';


export interface Nonce {
  nonce: Buffer;
}

export class MessageHandlers {
  public blockHandler: BlockHandler;
  private messageConsts: MessageConsts;
  private transactionHandler: TransactionHandler;
  // https://en.bitcoin.it/wiki/Protocol_specification#Inventory_Vectors
  protected invCodes = {
    error: 0,
    tx: 1,
    block: 2,
    blockFiltered: 3,
    blockCompact: 4
  };

  constructor(
    private scope: ProtocolScope,
    private util: Utils,
    private dbUtil: DbUtil,
    private options: StartOptions
  ) {
    this.blockHandler = new BlockHandler(this.scope, this.util, this.dbUtil, this.options);
    this.messageConsts = new MessageConsts(this.util);
    this.transactionHandler = new TransactionHandler(this.scope, this.util, this.dbUtil, this.options)
  }

  handlePing(payload: Buffer): Promise<Nonce> {
    let nonce: Buffer = this.parseNonce(payload);
    this.scope.events.fire('ping', nonce);
    return Promise.resolve(<Nonce>{nonce});
  }

  handlePong(payload: Buffer): Promise<Nonce> {
    let nonce: Buffer = this.parseNonce(payload);
    this.scope.events.fire('pong', nonce);
    return Promise.resolve(<Nonce>{nonce});
  }

  handleReject(payload: Buffer): Promise<RejectedEvent> {
    const p = new MessageParser(payload);
    const messageLen = p.readInt8() || 0;
    const messageBytes = p.raw(messageLen) || Buffer.from([])
    const message = messageBytes.toString();
    const ccode = p.readInt8() || 0;
    const name = this.messageConsts.rejectCodes[ccode];
    const reasonLen = p.readInt8() || 0;
    const reasonBytes = p.raw(reasonLen) || Buffer.from([])
    const reason = reasonBytes.toString();
    const extraLen = (p.buffer.length -1) - (p.pointer -1);
    const extraBytes = p.raw(extraLen) || Buffer.from([])
    const extra = (extraLen > 0) ? extraBytes.toString() : '';

    let rejected: RejectedEvent = {
      message,
      ccode,
      name,
      reason,
      extra
    };
    this.scope.events.fire('reject', rejected);
    return Promise.resolve(rejected);
  }

  handleVersion(payload: Buffer): Promise<Version> {
    const s = new MessageParser(payload);
    // https://en.bitcoin.it/wiki/Protocol_documentation#version
    const version = s.readUInt32LE() || 0
    const servicesBytes = s.raw(8) || Buffer.from([])
    const services = parseInt(servicesBytes.slice(0,1).toString('hex'), 16)
    const time = s.raw(8) || Buffer.from([])
    const addr_recvBytes = s.raw(26) || Buffer.from([])
    const addr_recv = addr_recvBytes.toString('hex')
    const addr_fromBytes = s.raw(26) || Buffer.from([])
    const addr_from = addr_fromBytes.toString('hex')
    const nonceBytes = s.raw(8) || Buffer.from([])
    const nonce = nonceBytes.toString('hex')
    let parsed: Version = {
      version,
      services,
      time,
      addr_recv,
      addr_from,
      nonce,
      client: s.readVarString() || '',
      height: s.readUInt32LE() || 0,
      relay: Boolean(s.raw(1))
    };
    if (<boolean>parsed.time !== false && parsed.time.readUInt32LE(4) === 0) {
      parsed.time = new Date(parsed.time.readUInt32LE(0)*1000);
    }
    this.util.log('core', 'info', JSON.stringify(parsed));
    this.scope.events.fire('version', parsed);
    return Promise.resolve(parsed)
  }

  handleInv(payload: Buffer): void {
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
        this.scope.events.fire('peer_message', {command: 'inv', payload: {type: type}});
      }
      switch (type) {
        case this.invCodes.error:
          console.log('error, you can ignore this');
          break;
        case this.invCodes.tx:
          this.transactionHandler.handleTransactionInv(payload);
          break;
        case this.invCodes.block:
          if (!this.options.skipBlockProcessing) {
            this.blockHandler.handleBlockInv(payload);
          }
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

  private parseNonce(payload: Buffer): Buffer {
    return (payload.length) ? new MessageParser(payload).raw(8) || Buffer.from([]) : Buffer.from([])
  }

  handleNotFound(payload: Buffer): void {
    let count = payload.readUInt8(0);
    payload = payload.slice(1);
    if (count >= 0xfd) {
      count = payload.readUInt16LE(0);
      payload = payload.slice(2);
    }
    let type;
    let hash;
    const mp = new MessageParser(payload)
    try {
      type = mp.readUInt32LE() || 0;
    } catch (e) {

    }
    let object = {
      count,
      type
    }
    switch (type) {
      case this.invCodes.tx:
        const hashBytesTx = mp.raw(32) || Buffer.from([])
        hash = hashBytesTx.reverse().toString('hex')
        object['hash'] = hash
        break;
      case this.invCodes.block:
        const hashBytesBlock = mp.raw(32) || Buffer.from([])
        hash = hashBytesBlock.reverse().toString('hex')
        object['hash'] = hash
        break;
    }
    this.scope.events.fireNotFound(object);
  }
}
