import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
import { TxInvEvent } from '../interfaces/events.interface';
import { BitcoinTransaction, ZcashTransaction, TxInput, TxOutput, ShieldedInputs, ShieldedOutputs } from '../interfaces/transactions.interface';
export declare class Transactions {
    private scope;
    private util;
    private dbUtil;
    private options;
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    parseTransactionInv(payload: Buffer): TxInvEvent;
    handleTransactionInv(payload: Buffer): void;
    handleTransaction(payload: Buffer): void;
    parseTransactions(mParser: any, count?: number): Array<BitcoinTransaction | ZcashTransaction>;
    parseBitcoinTransactions(mParser: any, count: number): Array<BitcoinTransaction>;
    parseZcashTransactions(mParser: any, count: number): Array<ZcashTransaction>;
    parseWitnesses(mParser: any, witnessFlag: boolean): Array<string>;
    parseTransparentInputs(mParser: any): Array<TxInput>;
    parseTransparentOutputs(mParser: any): Array<TxOutput>;
    parseShieldedInputs(mParser: any): Array<ShieldedInputs>;
    parseShieldedOutputs(mParser: any): Array<ShieldedOutputs>;
    parseJoinSplits(mParser: any, count: number): string;
}
