"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var blocks_1 = require("./blocks");
var block_parser_1 = require("./block-parser");
var transaction_parser_1 = require("../transactions/transaction-parser");
var BlockHandler = /** @class */ (function () {
    function BlockHandler(scope, util, dbUtil, options) {
        this.scope = scope;
        this.util = util;
        this.dbUtil = dbUtil;
        this.options = options;
        this.blocks = new blocks_1.Blocks(this.scope, this.util, this.dbUtil, this.options);
        this.blockParser = new block_parser_1.BlockParser(this.options, this.util);
        this.transactionParser = new transaction_parser_1.TransactionParser(this.util, this.options);
    }
    BlockHandler.prototype.handleBlockInv = function (payload) {
        var _this = this;
        var blockInvs = this.blockParser.parseBlockInv(payload);
        this.scope.events.fire('blockinv', blockInvs);
        blockInvs.forEach(function (blockInv) {
            _this.blocks.updateBlockListWithInv(blockInv.parsed);
            // inv = Buffer.concat([inv, blockInv.raw]);
            // not sure why requesting all at once doesn't work well
        });
        var inv = Buffer.concat([this.util.varIntBuffer(1), blockInvs[0].raw]);
        this.blocks.updateBlockInFlight(blockInvs[0].parsed.hash);
        this.scope.message.sendGetData(inv);
    };
    BlockHandler.prototype.handleBlock = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        // parse block header
        var blockHeader = this.blockParser.parseHeader(p);
        // parse transactions
        var txes = this.transactionParser.parseTransactions(p, 0, blockHeader.timestamp);
        var block = __assign({}, blockHeader, { transactions: txes });
        this.scope.events.fire('block', block);
        if (!this.options.skipBlockDownload) {
            this.blocks.updateBlockList(block);
        }
        // TODO
        // save block to db (parsed and raw) if prevBlock matches actual prev block..
        // if prevBlock does notmatch prev block, keep going back, maybe reorg.
        // remove transactions from mempool
    };
    BlockHandler.prototype.handleGetHeaders = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        var version = p.readUInt32LE();
        var hashCount = this.util.getCompactSize(p);
        var hashes = this.blockParser.parseHashes(32, p);
        var parsed = {
            version: version,
            hashCount: hashCount,
            hashes: hashes
        };
        this.scope.events.fire('getheaders', { raw: payload, parsed: parsed });
        return Promise.resolve({ raw: payload, parsed: parsed });
    };
    BlockHandler.prototype.handleHeaders = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        var hashCount = this.util.getCompactSize(p);
        // console.log('headers', hashCount)
        var hashes = this.blockParser.parseHeaders(hashCount, p);
        var parsed = {
            hashCount: hashCount,
            hashes: hashes
        };
        // console.log(parsed);
        this.scope.events.fire('headers', { raw: payload, parsed: parsed });
        return Promise.resolve({ raw: payload, parsed: parsed });
    };
    return BlockHandler;
}());
exports.BlockHandler = BlockHandler;
