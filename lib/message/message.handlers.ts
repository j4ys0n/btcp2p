import { MessageParser } from 'crypto-binary';

// class imports
import { Utils } from '../util/general.util';
import { BlockHandler } from '../blocks/blocks';

// interface imports
import { RejectedEvent, AddressEvent } from '../interfaces/events.interface';
import { PeerAddress, ProtocolScope } from '../interfaces/peer.interface';


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

  handleAddr(payload: Buffer): Promise<AddressEvent> {
    const addrs: AddressEvent = {
      addresses: this.parseAddrMessage(payload)
    };
    this.scope.events.fire('addr', addrs);
    return Promise.resolve(addrs);
  }

  // getWitnessFlag(mParser: any): boolean {
  //   const flag = mParser.raw(2).toString('hex');
  //   if (flag === '0001') {
  //     return true;
  //   }
  //   mParser.incrPointer(-2);
  //   return false;
  // }
  //
  // parseTxIn(count: number, mParser: any): Array<any> {
  //   const vins: Array<any> = [];
  //   for (let i = 0; i < count; i++) {
  //     const hash = mParser.raw(32).toString('hex');
  //     const index = mParser.readUInt32LE();
  //     const scriptLen = this.util.getCompactSize(mParser);
  //     const vin = {
  //       hash: hash,
  //       index: index,
  //       script: mParser.raw(scriptLen),
  //       sequence: mParser.readUInt32LE()
  //     }
  //     vins.push(vin);
  //   }
  //   return vins;
  // }
  //
  // parseTxes(mParser: any): any {
  //   const hashCount = this.util.getCompactSize(mParser);
  //   for (let i = 0; i < hashCount; i++) {
  //     const version = mParser.readUInt32LE()
  //     const witnessFlag = this.getWitnessFlag(mParser);
  //     const txInCount = this.util.getCompactSize(mParser);
  //     const tx = {
  //       version: version,
  //       witnessFlag: witnessFlag,
  //       vin: this.parseTxIn(txInCount, mParser)
  //     }
  //   }
  // }

  // parseTxHashes(mParser: any): Array<string> {
  //   const txes: Array<string> = [];
  //   const hashCount = this.util.getCompactSize(mParser);
  //   for (let i = 0; i < hashCount; i++) {
  //     const hash = mParser.raw(32).reverse().toString('hex');
  //     txes.push(hash);
  //   }
  //   return txes;
  // }

  handleBlock(payload: Buffer): void {
    // let block = payload.slice(4, 36).reverse().toString('hex');
    const p = new MessageParser(payload);
    // const header = this.parseHeader(p);
    const header = {
      version: p.readUInt32LE(),
      hash: Buffer.from(p.raw(32)).reverse().toString('hex'),
      // merkle_root: p.raw(32)
      confirmations: p.readUInt32LE(),
      // size: p.readUInt32LE(),
      // strippedsize: p.readUInt32LE(),
      merkle_root: Buffer.from(p.raw(32)).reverse().toString('hex')
      // timestamp: new Date(p.readUInt32LE()*1000),
      // bits: p.readUInt32LE(),
      // nonce: p.readUInt32LE()
      // raw: payload.toString('hex')
    }
    // const hashCount = this.util.getCompactSize(p);
    // const txes = this.parseTxHashes(p);
    // const block = {...header, ...{count: hashCount}}
    // events.fireBlockNotify(header);
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
      /* istanbul ignore next */
      this.scope.events.fire('error', {message: 'address field length not 30', payload: buff});
    }
    return addr;
  }

  private parseAddrMessage(payload: Buffer): PeerAddress[] {
    const s = new MessageParser(payload);
    let addrs: Array<PeerAddress> = [];
    let addrNum = s.readVarInt();
    for (let i = 0; i < addrNum; i++) {
      const addr: PeerAddress = this.getAddr(<Buffer>s.raw(30));
      addrs.push(addr);
    }
    return addrs;
  }
}
