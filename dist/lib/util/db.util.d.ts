import * as Datastore from 'nestdb';
import { Utils } from '../util/general.util';
import { Block, BlockZcash, BestBlock, ReducedBlockHeader } from '../interfaces/blocks.interface';
interface GetCollectionOptions {
    name: string;
    persistent: boolean;
}
export declare class DbUtil {
    protected util: Utils;
    private datastores;
    constructor();
    getCollection(options: GetCollectionOptions, index?: any): Promise<Datastore>;
    loadCollection(filename: string): Promise<Datastore>;
    memoryCollection(): Promise<Datastore>;
    saveTxToMempool(name: string, tx: any): Promise<any>;
    deleteBlockFromHold(name: string, hash: string): Promise<any>;
    saveBlock(name: string, block: Block | BlockZcash, confirmed?: boolean): Promise<any>;
    getBestBlockHeight(name: string): Promise<BestBlock>;
    getBlocksForCache(name: string): Promise<Array<ReducedBlockHeader>>;
}
export {};
