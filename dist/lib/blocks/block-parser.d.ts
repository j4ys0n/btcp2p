import { Utils } from '../util/general.util';
import { StartOptions } from '../interfaces/peer.interface';
import { BlockHeader, BlockHeaderZcash, BlockInv } from '../interfaces/blocks.interface';
export declare class BlockParser {
    private options;
    private util;
    constructor(options: StartOptions, util: Utils);
    parseBlockInv(payload: Buffer): Array<BlockInv>;
    parseHashes(hashLen: number, mParser: any): Array<string>;
    parseHeader(mParser: any): BlockHeader | BlockHeaderZcash;
    parseHeaders(count: number, mParser: any): Array<BlockHeader | BlockHeaderZcash>;
    getTargetParts(bits: string): {
        part1: number;
        part2: number;
    };
    calculateDifficulty(bits: string): number;
    parseZcashHeader(mParser: any): BlockHeaderZcash;
    parseBitcoinHeader(mParser: any): BlockHeader;
}
