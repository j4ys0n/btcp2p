import { Utils } from '../util/general.util';
import { HeadersEvent } from '../interfaces/events.interface';
import { ProtocolScope } from '../interfaces/peer.interface';
export interface BlockInv {
    raw: Buffer;
    parsed: {
        version: number;
        hash: string;
    };
}
export declare class Blocks {
    constructor();
    parseBlockInv(payload: Buffer): Array<BlockInv>;
    handleBlockInv(payload: Buffer): Array<BlockInv>;
}
export declare class BlockHandler {
    private scope;
    private util;
    private blocks;
    constructor(scope: ProtocolScope, util: Utils);
    handleBlockInv(payload: Buffer): void;
    parseHashes(hashLen: number, mParser: any): Array<string>;
    handleGetHeaders(payload: Buffer): Promise<HeadersEvent>;
    parseHeader(mParser: any): any;
    parseHeaders(count: number, mParser: any): Array<any>;
    handleHeaders(payload: Buffer): Promise<HeadersEvent>;
}
