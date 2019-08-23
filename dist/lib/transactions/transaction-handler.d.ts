/// <reference types="node" />
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { TransactionParser } from './transaction-parser';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
export declare class TransactionHandler {
    private scope;
    private util;
    private dbUtil;
    private options;
    private transactions;
    private saveMempool;
    transactionParser: TransactionParser;
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    handleTransactionInv(payload: Buffer): void;
    handleTransaction(payload: Buffer): void;
}
