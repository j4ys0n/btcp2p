import { MessageParser } from 'crypto-binary';

// classes
import { Utils } from '../util/general.util';

// interfaces
import { HeadersEvent } from '../interfaces/events.interface';
import { ProtocolScope } from '../interfaces/peer.interface';

export interface BlockInv {
  raw: Buffer;
  parsed: {
    version: number;
    hash: string;
  }
}

export class Blocks {
  constructor() {}

  parseBlockInv(payload: Buffer): Array<BlockInv> {
    const invLen = 36;
    const hashLen = 32;
    const blockInvs: Array<BlockInv> = [];
    const p = new MessageParser(payload);
    let invCount = payload.length / invLen;
    while (invCount--) {
      const raw = new MessageParser(Buffer.from(p.raw(invLen)));
      const blockInv: BlockInv = {
        raw: raw.buffer,
        parsed: {
          version: raw.readUInt32LE(),
          hash: raw.raw(hashLen).reverse().toString('hex')
        }
      }
      blockInvs.push(blockInv)
    }
    return blockInvs;
  }

  handleBlockInv(payload: Buffer): Array<BlockInv> {
    const blockInvs: Array<BlockInv> = this.parseBlockInv(payload);
    return blockInvs;
  }
}

export class BlockHandler {
  private blocks: Blocks = new Blocks();

  constructor(private scope: ProtocolScope, private util: Utils) {}

  // initEventHandlers() {
  //   this.scope.events.on('blockinv', (payload: Buffer) => {
  //     const blockInvs = this.blocks.handleBlockInv(payload);
  //     console.log(blockInvs);
  //   });
  // }
  handleBlockInv(payload: Buffer) {
    const blockInvs = this.blocks.handleBlockInv(payload);
    this.scope.events.fire('blockinv', blockInvs);
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

  handleGetHeaders(payload: Buffer): Promise<HeadersEvent> {
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
    this.scope.events.fire('getheaders', {raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }

  parseHeader(mParser: any): any {
    const header = {
      version: mParser.readUInt32LE(),
      hash: mParser.raw(32).reverse().toString('hex'),
      merkle_root: mParser.raw(32).reverse().toString('hex'),
      timestamp: new Date(mParser.readUInt32LE()*1000),
      bits: mParser.readUInt32LE(),
      nonce: mParser.readUInt32LE()
    }
    return header;
  }

  parseHeaders(count: number, mParser: any): Array<any> {
    const headers: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const header = this.parseHeader(mParser);
      headers.push(header);
    }
    return headers;
  }

  handleHeaders(payload: Buffer): Promise<HeadersEvent> {
    const p = new MessageParser(payload);
    const hashCount = this.util.getCompactSize(p);
    console.log('headers', hashCount)
    const hashes = this.parseHeaders(hashCount, p);
    const parsed = {
      hashCount,
      hashes
    }
    // console.log(parsed);
    this.scope.events.fire('headers', {raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }


}
