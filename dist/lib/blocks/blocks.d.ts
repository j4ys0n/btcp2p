import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
import { BestBlock } from '../interfaces/blocks.interface';
export declare class Blocks {
    private scope;
    private util;
    private dbUtil;
    private options;
    private blockList;
    private blockCheckInterval;
    private blockCheckTimer;
    private blocksInFlight;
    private lastBlockChecked;
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    startFetch(block: BestBlock): void;
    getHashOfBestBlock(currentHeight: number): string;
    requestBlocksFromPeer(currentHeight: number): void;
    inFlight(): boolean;
    checkForNewBlocks(): void;
    groomBlockList(): Promise<any>;
    updateBlockInFlight(hash: string): void;
    updateBlockList(block: any): void;
    updateBlockListWithInv(blockInv: any): void;
}
