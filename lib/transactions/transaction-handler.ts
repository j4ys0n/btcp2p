import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { Transactions } from './transactions';
import { TransactionParser } from './transaction-parser';

import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';

export class TransactionHandler {
  private transactions: Transactions;
  private saveMempool: boolean = false;
  public transactionParser: TransactionParser;
  constructor(
    private scope: ProtocolScope,
    private util: Utils,
    private dbUtil: DbUtil,
    private options: StartOptions
  ) {
    this.transactions = new Transactions(this.scope, this.util, this.dbUtil, this.options);
    this.transactionParser = new TransactionParser(this.util, this.options);
    if (
      this.options.fetchMempool !== undefined &&
      this.options.fetchMempool !== false
    ) {
      this.saveMempool = true;
    }
  }

  handleTransactionInv(payload: Buffer): void {
    const tx = this.transactionParser.parseTransactionInv(payload);
    // console.log(tx.hash)
    if (this.options.mempoolTxHashOnly) {
      this.scope.events.fire('txinv', tx.hash);
    } else {
      this.scope.events.fire('txinv', tx);
    }
    if (this.saveMempool) {
      const inv = Buffer.concat([this.util.varIntBuffer(1), payload]);
      this.scope.message.sendGetData(inv);
    }
  }

  handleTransaction(payload: Buffer): void {
    // console.log(payload.toString('hex'));
    // TODO is this timestamp good?
    const time = Math.floor(Date.now() / 1000);
    const tx = this.transactionParser.parseTransactions(payload, 1, time);
    this.scope.events.fire('tx', tx);
    // TODO
    // save tx to mempool
    // this.dbUtil.saveTxToMempool(this.options.name, tx);
  }


}
