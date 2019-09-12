import * as Datastore from 'nestdb';
import { Utils } from '../util/general.util';
import { Block, BlockZcash, BestBlock, ReducedBlockHeader } from '../interfaces/blocks.interface';
interface GetCollectionOptions {
    name: string;
    persistent: boolean;
}
export declare class DbUtil {
    private engine;
    private protocol;
    protected util: Utils;
    private datastores;
    private onHold;
    constructor(engine: string, protocol: string);
    getCollection(options: GetCollectionOptions, index?: any): Promise<Datastore>;
    loadCollection(filename: string): Promise<Datastore>;
    memoryCollection(): Promise<Datastore>;
    saveTxToMempool(name: string, tx: any): Promise<any>;
    getHeldBlocks(name: any): Promise<any>;
    addToHeldBlocks(hash: string, height: number): void;
    deleteBlockFromHold(name: string, hash: string): Promise<any>;
    getTransaction(txid: string, name: string): Promise<any>;
    findTransaction(txid: string, ds: Datastore): Promise<any>;
    saveTransaction(txid: string, name: string, height: number, blockHash: string): Promise<any>;
    indexTransactions(name: string, block: Block | BlockZcash): Promise<any>;
    getBlock(id: string | number, name: string): Promise<any>;
    findBlock(id: string | number, ds: Datastore): Promise<any>;
    findBlockByHeight(height: number, ds: Datastore): Promise<any>;
    findBlockByHash(hash: string, ds: Datastore): Promise<any>;
    stripShieldedTxData(block: BlockZcash): BlockZcash;
    saveBlock(name: string, block: Block | BlockZcash, confirmed?: boolean): Promise<any>;
    getBestBlockHeight(name: string): Promise<BestBlock>;
    getBlocksForCache(name: string): Promise<Array<ReducedBlockHeader>>;
}
export {};
