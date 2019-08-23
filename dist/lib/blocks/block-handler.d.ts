import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { Blocks } from './blocks';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
import { HeadersEvent } from '../interfaces/events.interface';
export declare class BlockHandler {
    private scope;
    private util;
    private dbUtil;
    private options;
    blocks: Blocks;
    private blockParser;
    private transactions;
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    handleBlockInv(payload: Buffer): void;
    handleBlock(payload: Buffer): void;
    handleGetHeaders(payload: Buffer): Promise<HeadersEvent>;
    handleHeaders(payload: Buffer): Promise<HeadersEvent>;
}
