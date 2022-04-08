/// <reference types="node" />
import { MessageParser } from '../util/Message';
import { Utils } from '../util/general.util';
import { StartOptions } from '../interfaces/peer.interface';
import { TxInvEvent } from '../interfaces/events.interface';
import { BitcoinTransaction, ZcashTransaction, TxInput, TxOutput, ShieldedInputs, ShieldedOutputs } from '../interfaces/transactions.interface';
export declare class TransactionParser {
    private util;
    private options;
    private addressUtil;
    constructor(util: Utils, options: StartOptions);
    parseTransactionInv(payload: Buffer): TxInvEvent;
    parseTransactions(payload: Buffer, count: number | undefined, blockTime: number): Array<BitcoinTransaction | ZcashTransaction>;
    parseBitcoinTransactions(mParser: MessageParser, count: number, blockTime: number): Array<BitcoinTransaction>;
    parseZcashTransactions(mParser: MessageParser, count: number): Array<ZcashTransaction>;
    parseWitnesses(mParser: MessageParser, witnessFlag: boolean, count: number): Array<Array<string>>;
    parseTransparentInputs(mParser: MessageParser): Array<TxInput>;
    parseTransparentOutputs(mParser: MessageParser): Array<TxOutput>;
    parseShieldedInputs(mParser: MessageParser): Array<ShieldedInputs>;
    parseShieldedOutputs(mParser: MessageParser): Array<ShieldedOutputs>;
    parseJoinSplits(mParser: MessageParser, count: number): string;
}
