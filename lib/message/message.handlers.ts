import { MessageParser } from 'crypto-binary';

// class imports
import { Utils } from '../util/general.util';
import { BlockHandler } from '../blocks/blocks';

// interface imports
import { RejectedEvent } from '../interfaces/events.interface';
import { ProtocolScope } from '../interfaces/peer.interface';


export interface Nonce {
  nonce: Buffer;
}

export interface Version {
  version: number;
  services: number;
  time: any;
  addr_recv: string;
  addr_from: string;
  nonce: string;
  client: string;
  height: number;
  relay: boolean;
}

export class MessageHandlers {
  private blockHandler!: BlockHandler;
  // https://en.bitcoin.it/wiki/Protocol_specification#Inventory_Vectors
  protected invCodes = {
    error: 0,
    tx: 1,
    block: 2,
    blockFiltered: 3,
    blockCompact: 4
  };
  // https://en.bitcoin.it/wiki/Protocol_documentation#reject
  protected rejectCodes = {
    1: 'REJECT_MALFORMED',
    10: 'REJECT_INVALID',
    11: 'REJECT_OBSOLETE',
    12: 'REJECT_DUPLICATE',
    40: 'REJECT_NONSTANDARD',
    41: 'REJECT_DUST',
    42: 'REJECT_INSUFFICIENTFEE',
    43: 'REJECT_CHECKPOINT'
  }

  constructor(private scope: ProtocolScope, private util: Utils) {
    this.blockHandler = new BlockHandler(this.scope, this.util)
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
    const messageLen = p.readInt8();
    const message = p.raw(messageLen).toString();
    const ccode = p.readInt8();
    const name = this.rejectCodes[ccode];
    const reasonLen = p.readInt8();
    const reason = p.raw(reasonLen).toString();
    const extraLen = (p.buffer.length -1) - (p.pointer -1);
    const extra = (extraLen > 0) ? p.raw(extraLen).toString() : '';

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
    let parsed: Version = {
      version: s.readUInt32LE(),
      services: parseInt(s.raw(8).slice(0,1).toString('hex'), 16),
      time: s.raw(8),
      addr_recv: s.raw(26).toString('hex'),
      addr_from: s.raw(26).toString('hex'),
      nonce: s.raw(8).toString('hex'),
      client: s.readVarString(),
      height: s.readUInt32LE(),
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
          let tx = payload.slice(4, 36).toString('hex');
          this.scope.events.fire('tx', {hash: tx});
          break;
        case this.invCodes.block:
          this.blockHandler.handleBlockInv(payload);
          // this.scope.events.fire('blockinv', payload);
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
    let nonce: Buffer;
    if (payload.length) {
      nonce = new MessageParser(payload).raw(8)
    } else {
      /* istanbul ignore next */
      nonce = Buffer.from([]);
    }
    return nonce;
  }
}
