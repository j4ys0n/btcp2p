import { MessageParser } from 'crypto-binary';

import { Utils } from '../util/general.util';
import { Events } from '../events/events';
import { RejectedEvent, AddressEvent, HeadersEvent } from '../interfaces/events.interface';
import { PeerAddress } from '../interfaces/peer.interface';

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

const IPV6_IPV4_PADDING = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);

export class MessageHandlers {
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

  constructor(private util: Utils) {}

  handlePing(payload: Buffer, events: Events): Promise<Nonce> {
    let nonce: Buffer = this.parseNonce(payload);
    events.firePing(nonce);
    return Promise.resolve(<Nonce>{nonce});
  }

  handlePong(payload: Buffer, events: Events): Promise<Nonce> {
    let nonce: Buffer = this.parseNonce(payload);
    events.firePong(nonce);
    return Promise.resolve(<Nonce>{nonce});
  }

  handleReject(payload: Buffer, events: Events): Promise<RejectedEvent> {
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
    events.fireReject(rejected);
    return Promise.resolve(rejected);
  }

  handleVersion(payload: Buffer, events: Events): Promise<Version> {
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
    events.fireVersion(parsed);
    return Promise.resolve(parsed)
  }

  handleAddr(payload: Buffer, events: Events): Promise<AddressEvent> {
    const addrs: AddressEvent = {
      addresses: this.parseAddrMessage(payload, events)
    };
    events.fireAddr(addrs);
    return Promise.resolve(addrs);
  }

  parseHashes(hashLen: number, mParser: any): Array<string> {
    let hashes: Array<string> = [];
    const len = mParser.buffer.length - mParser.pointer;
    const stopHash = this.util.stopHash(hashLen);
    let cursor = 0;

    for (cursor; cursor < len; cursor += hashLen){
      const hash = mParser.raw(hashLen).reverse().toString('hex')
      if (hash !== stopHash) {
        hashes.push(hash);
      }
    }
    return hashes;
  }

  handleGetHeaders(payload: Buffer, events: Events): Promise<HeadersEvent> {
    const p = new MessageParser(payload);
    const version = p.readUInt32LE();
    // const hashCount = p.raw(1).toString('hex');
    const hashCount = this.util.getCompactSize(p);
    const hashes = this.parseHashes(32, p);
    const parsed = {
      version,
      hashCount,
      hashes
    }
    // console.log(parsed);
    events.fireGetHeaders({raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }

  parseHeaders(count: number, mParser: any): Array<any> {
    const headers: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const header = {
        version: mParser.readUInt32LE(),
        prev_block: mParser.raw(32).reverse().toString('hex'),
        merkle_root: mParser.raw(32).reverse().toString('hex'),
        timestamp: new Date(mParser.readUInt32LE(0)*1000),
        bits: mParser.readUInt32LE(),
        nonce: mParser.readUInt32LE()
      }
      headers.push(header);
    }
    return headers;
  }

  handleHeaders(payload: Buffer, events: Events): Promise<HeadersEvent> {
    const p = new MessageParser(payload);
    const hashCount = this.util.getCompactSize(p);
    const hashes = this.parseHeaders(hashCount, p);
    const parsed = {
      hashCount,
      hashes
    }
    // console.log(parsed);
    events.fireHeaders({raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }

  handleInv(payload: Buffer, events: Events): void {
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
      /* istanbul ignore next */
      events.fireError({message: 'address field length not 30', payload: buff});
    }
    return addr;
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
}
