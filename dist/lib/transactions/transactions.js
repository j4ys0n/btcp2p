"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var Transactions = /** @class */ (function () {
    function Transactions(scope, util, dbUtil, options) {
        this.scope = scope;
        this.util = util;
        this.dbUtil = dbUtil;
        this.options = options;
    }
    Transactions.prototype.parseTransactionInv = function (payload) {
        return {
            version: parseInt(payload.slice(0, 4).reverse().toString('hex'), 16),
            hash: payload.slice(4, 36).reverse().toString('hex')
        };
    };
    Transactions.prototype.handleTransactionInv = function (payload) {
        var tx = this.parseTransactionInv(payload);
        this.scope.events.fire('txinv', tx);
        // const inv = Buffer.concat([this.util.varIntBuffer(1), payload]);
        // this.scope.message.sendGetData(inv);
    };
    Transactions.prototype.handleTransaction = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        var tx = this.parseTransactions(p, 1);
        this.scope.events.fire('tx', tx);
        // TODO
        // save tx to mempool
        // this.dbUtil.saveTxToMempool(this.options.name, tx);
    };
    Transactions.prototype.parseTransactions = function (mParser, count) {
        if (count === void 0) { count = 0; }
        if (count === 0) {
            count = mParser.readVarInt();
        }
        switch (this.options.protocol) {
            case 'bitcoin':
                return this.parseBitcoinTransactions(mParser, count);
            case 'zcash':
                return this.parseZcashTransactions(mParser, count);
        }
        return [];
    };
    Transactions.prototype.parseBitcoinTransactions = function (mParser, count) {
        var txes = [];
        for (var i = 0; i < count; i++) {
            var bytesStart = mParser.pointerPosition();
            var version = mParser.raw(4).reverse().toString('hex');
            var witnessFlag = (mParser.raw(2).reverse().toString('hex') === '0001') ?
                true : false;
            if (!witnessFlag) {
                mParser.incrPointer(-2);
            }
            var txIn = this.parseTransparentInputs(mParser);
            var txOut = this.parseTransparentOutputs(mParser);
            var witnesses = this.parseWitnesses(mParser, witnessFlag);
            var lockTime = mParser.readUInt32LE();
            var nExpiryHeight = mParser.readUInt32LE();
            var bytesEnd = mParser.pointerPosition();
            var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
            var txid = this.util.sha256d(rawBytes).reverse().toString('hex');
            var tx = {
                txid: txid,
                version: version,
                txIn: txIn,
                txOut: txOut,
                witnesses: witnesses,
                lockTime: lockTime,
                nExpiryHeight: nExpiryHeight
            };
            txes.push(tx);
        }
        return txes;
    };
    Transactions.prototype.parseZcashTransactions = function (mParser, count) {
        var txes = [];
        for (var i = 0; i < count; i++) {
            var bytesStart = mParser.pointerPosition();
            var header = mParser.raw(4).reverse().toString('hex');
            var nVersionGroupId = mParser.raw(4).reverse().toString('hex');
            var txIn = this.parseTransparentInputs(mParser);
            var txOut = this.parseTransparentOutputs(mParser);
            var lockTime = mParser.readUInt32LE();
            var nExpiryHeight = mParser.readUInt32LE();
            var saplingValueBalance = mParser.readUInt64LE();
            var shieldedInputs = this.parseShieldedInputs(mParser);
            var shieldedOutputs = this.parseShieldedOutputs(mParser);
            var nJoinSplits = mParser.readVarInt();
            var joinSplits = this.parseJoinSplits(mParser, nJoinSplits);
            var joinSplitPubKey = (nJoinSplits > 0) ?
                mParser.raw(32).reverse().toString('hex') : '';
            var joinSplitSig = (nJoinSplits > 0) ?
                mParser.raw(64).reverse().toString('hex') : '';
            var bindingSig = (shieldedInputs.length + shieldedOutputs.length > 0) ?
                mParser.raw(64).reverse().toString('hex') : '';
            var bytesEnd = mParser.pointerPosition();
            var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
            var txid = this.util.sha256d(rawBytes).reverse().toString('hex');
            var tx = {
                txid: txid,
                header: header,
                nVersionGroupId: nVersionGroupId,
                txIn: txIn,
                txOut: txOut,
                lockTime: lockTime,
                nExpiryHeight: nExpiryHeight,
                saplingValueBalance: saplingValueBalance,
                shieldedInputs: shieldedInputs,
                shieldedOutputs: shieldedOutputs,
                joinSplits: joinSplits,
                joinSplitPubKey: joinSplitPubKey,
                joinSplitSig: joinSplitSig,
                bindingSig: bindingSig
            };
            txes.push(tx);
        }
        return txes;
    };
    Transactions.prototype.parseWitnesses = function (mParser, witnessFlag) {
        var wits = [];
        if (witnessFlag) {
            var witnessCount = mParser.readVarInt();
            for (var i = 0; i < witnessCount; i++) {
                var scriptLength = mParser.readVarInt();
                var witness = mParser.raw(scriptLength).reverse().toString('hex');
                wits.push(witness);
            }
        }
        return wits;
    };
    Transactions.prototype.parseTransparentInputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('tx in count:', count);
        var inputs = [];
        for (var i = 0; i < count; i++) {
            var input = {
                outpoint: mParser.raw(36).reverse().toString('hex'),
                signatureScript: mParser.raw(mParser.readVarInt()).reverse().toString('hex'),
                sequence: mParser.raw(4).reverse().toString('hex')
            };
            inputs.push(input);
        }
        return inputs;
    };
    Transactions.prototype.parseTransparentOutputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('tx out count:', count);
        var outputs = [];
        for (var i = 0; i < count; i++) {
            var output = {
                value: mParser.readUInt64LE(),
                pkScript: mParser.raw(mParser.readVarInt()).reverse().toString('hex')
            };
            outputs.push(output);
        }
        return outputs;
    };
    Transactions.prototype.parseShieldedInputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('shielded in count:', count);
        var inputs = [];
        for (var i = 0; i < count; i++) {
            var input = {
                cv: mParser.raw(32).reverse().toString('hex'),
                anchor: mParser.raw(32).reverse().toString('hex'),
                nullifier: mParser.raw(32).reverse().toString('hex'),
                rk: mParser.raw(32).reverse().toString('hex'),
                zkProof: mParser.raw(192).toString('hex'),
                spendAuthSig: mParser.raw(64).reverse().toString('hex')
            };
            inputs.push(input);
        }
        return inputs;
    };
    Transactions.prototype.parseShieldedOutputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('shielded out count:', count);
        var outputs = [];
        for (var i = 0; i < count; i++) {
            var output = {
                cv: mParser.raw(32).reverse().toString('hex'),
                cmu: mParser.raw(32).reverse().toString('hex'),
                ephemeralKey: mParser.raw(32).reverse().toString('hex'),
                encCyphertext: mParser.raw(580).toString('hex'),
                outCyphertext: mParser.raw(80).toString('hex'),
                zkProof: mParser.raw(192).toString('hex')
            };
            outputs.push(output);
        }
        return outputs;
    };
    Transactions.prototype.parseJoinSplits = function (mParser, count) {
        // console.log('joinSplits count:', count);
        if (count > 0) {
            return mParser.raw(count * 1698).reverse().toString('hex');
        }
        return '';
    };
    return Transactions;
}());
exports.Transactions = Transactions;
