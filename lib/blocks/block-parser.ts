import { MessageParser } from '../util/Message'

import { Utils } from '../util/general.util';

import { StartOptions } from '../interfaces/peer.interface';
import {
  BlockHeader, BlockHeaderZcash, BlockInv
} from '../interfaces/blocks.interface';

export class BlockParser {
  constructor(private options: StartOptions, private util: Utils) {}

  parseBlockInv(payload: Buffer): Array<BlockInv> {
    const invLen = 36;
    const hashLen = 32;
    const blockInvs: Array<BlockInv> = [];
    const p = new MessageParser(payload);
    let invCount = payload.length / invLen;
    while (invCount--) {
      const invBytes = p.raw(invLen) || Buffer.from([])
      const raw = new MessageParser(Buffer.from(invBytes));
      const version = raw.readUInt32LE() || 0
      const hashBytes = raw.raw(hashLen) || Buffer.from([])
      const hash = hashBytes.reverse().toString('hex')
      const blockInv: BlockInv = {
        raw: raw.buffer,
        parsed: {
          version,
          hash
        }
      }
      blockInvs.push(blockInv)
    }
    return blockInvs;
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

  parseHeader(mp: MessageParser): {header: BlockHeader | BlockHeaderZcash, remainingBuffer: Buffer} {
    const {header, mParser} = (this.options.network.protocol === 'zcash')
      ? this.parseZcashHeader(mp) : this.parseBitcoinHeader(mp)
    return {
      header,
      remainingBuffer: mParser.rawRemainder() || Buffer.from([])
    };
  }

  parseHeaders(count: number, mParser: MessageParser): Array<BlockHeader | BlockHeaderZcash> {
    const headers: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const {header} = this.parseHeader(mParser);
      headers.push(header);
    }
    return headers;
  }

  getTargetParts(bits: string): {part1: number, part2: number} {
    const part1HexStr = '0x' + bits.substring(0,2);
    const part2HexStr = '0x' + bits.substring(2);
    const part1 = parseInt(part1HexStr, 16);
    const part2 = parseInt(part2HexStr, 16);
    return { part1, part2 };
  }

  calculateDifficulty(bits: string): number {
    const genTargetParts = this.getTargetParts(this.options.network.genesisTarget);
    const blkTargetParts = this.getTargetParts(bits);
    const currentTarget = blkTargetParts.part2 * 2 ** (8 * (blkTargetParts.part1 - 3));
    const genesisTarget = genTargetParts.part2 * 2 ** (8 * (genTargetParts.part1 - 3));
    const difficulty = genesisTarget / currentTarget;
    return difficulty;
  }

  parseZcashHeader(mParser: any): {header: BlockHeaderZcash, mParser: MessageParser} {
    const bytesStart = mParser.pointerPosition();
    const version = mParser.readUInt32LE();
    const prevBlock = mParser.raw(32).reverse().toString('hex');
    const hashMerkleRoot = mParser.raw(32).reverse().toString('hex');
    const hashFinalSaplingRoot = mParser.raw(32).reverse().toString('hex');
    const timestamp = mParser.readUInt32LE();
    const bits = mParser.raw(4).reverse().toString('hex');
    const nonce = mParser.raw(32).reverse().toString('hex');
    const solution = mParser.raw(mParser.readVarInt()).toString('hex');
    const bytesEnd = mParser.pointerPosition();
    const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
    const hash = this.util.sha256d(rawBytes).reverse().toString('hex');
    const difficulty = this.calculateDifficulty(bits);

    const header = {
      hash,
      version,
      prevBlock,
      hashMerkleRoot,
      hashFinalSaplingRoot,
      timestamp,
      bits,
      nonce,
      solution,
      difficulty
    };
    return {
      header,
      mParser
    };
  }

  parseBitcoinHeader(mParser: any): {header: BlockHeader, mParser: MessageParser} {
    const bytesStart = mParser.pointerPosition();
    const version = mParser.readUInt32LE();
    const prevBlock = mParser.raw(32).reverse().toString('hex');
    const hashMerkleRoot = mParser.raw(32).reverse().toString('hex');
    const timestamp = mParser.readUInt32LE();
    const bits = mParser.raw(4).reverse().toString('hex');
    const nonce = mParser.readUInt32LE();
    const bytesEnd = mParser.pointerPosition();
    const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
    const hash = this.util.sha256d(rawBytes).reverse().toString('hex');
    const difficulty = this.calculateDifficulty(bits);

    const header = {
      hash,
      version,
      prevBlock,
      hashMerkleRoot,
      timestamp,
      bits,
      nonce,
      difficulty
    };
    return {
      header,
      mParser
    };
  }
}
