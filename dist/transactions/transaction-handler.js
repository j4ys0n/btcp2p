"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var transactions_1 = require("./transactions");
var transaction_parser_1 = require("./transaction-parser");
var TransactionHandler = /** @class */ (function () {
    function TransactionHandler(scope, util, dbUtil, options) {
        this.scope = scope;
        this.util = util;
        this.dbUtil = dbUtil;
        this.options = options;
        this.saveMempool = false;
        this.transactions = new transactions_1.Transactions(this.scope, this.util, this.dbUtil, this.options);
        this.transactionParser = new transaction_parser_1.TransactionParser(this.util, this.options);
        if (this.options.fetchMempool !== undefined &&
            this.options.fetchMempool !== false) {
            this.saveMempool = true;
        }
    }
    TransactionHandler.prototype.handleTransactionInv = function (payload) {
        var tx = this.transactionParser.parseTransactionInv(payload);
        // console.log(tx.hash)
        if (this.options.mempoolTxHashOnly) {
            this.scope.events.fire('txinv', tx.hash);
        }
        else {
            this.scope.events.fire('txinv', tx);
        }
        if (this.saveMempool) {
            var inv = Buffer.concat([this.util.varIntBuffer(1), payload]);
            this.scope.message.sendGetData(inv);
        }
    };
    TransactionHandler.prototype.handleTransaction = function (payload) {
        // console.log(payload.toString('hex'));
        // TODO is this timestamp good?
        var time = Math.floor(Date.now() / 1000);
        var tx = this.transactionParser.parseTransactions(payload, 1, time);
        this.scope.events.fire('tx', tx);
        // TODO
        // save tx to mempool
        // this.dbUtil.saveTxToMempool(this.options.name, tx);
    };
    return TransactionHandler;
}());
exports.TransactionHandler = TransactionHandler;
