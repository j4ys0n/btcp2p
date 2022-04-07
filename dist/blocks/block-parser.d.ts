/// <reference types="node" />
import { MessageParser } from '../util/Message';
import { Utils } from '../util/general.util';
import { StartOptions } from '../interfaces/peer.interface';
import { BlockHeader, BlockHeaderZcash, BlockInv } from '../interfaces/blocks.interface';
export declare class BlockParser {
    private options;
    private util;
    constructor(options: StartOptions, util: Utils);
    parseBlockInv(payload: Buffer): Array<BlockInv>;
    parseHashes(hashLen: number, mParser: any): Array<string>;
    parseHeader(mp: MessageParser): {
        header: BlockHeader | BlockHeaderZcash;
        remainingBuffer: Buffer;
    };
    parseHeaders(count: number, mParser: MessageParser): Array<BlockHeader | BlockHeaderZcash>;
    getTargetParts(bits: string): {
        part1: number;
        part2: number;
    };
    calculateDifficulty(bits: string): number;
    parseZcashHeader(mParser: any): {
        header: BlockHeaderZcash;
        mParser: MessageParser;
    };
    parseBitcoinHeader(mParser: any): {
        header: BlockHeader;
        mParser: MessageParser;
    };
}
