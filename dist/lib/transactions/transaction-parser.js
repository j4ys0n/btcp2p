"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var address_util_1 = require("../util/address.util");
var SEGWIT_ACTIVATION_EPOCH = 1503539857; // height = 481824
var TransactionParser = /** @class */ (function () {
    function TransactionParser(util, options) {
        this.util = util;
        this.options = options;
        this.addressUtil = new address_util_1.AddressUtil(this.options);
    }
    TransactionParser.prototype.parseTransactionInv = function (payload) {
        var mParser = new crypto_binary_1.MessageParser(payload);
        var raw = Buffer.allocUnsafe(36);
        payload.copy(raw);
        var version = parseInt(mParser.raw(4).reverse().toString('hex'), 16);
        var hash = mParser.raw(32).reverse().toString('hex');
        var txInv = {
            version: version,
            hash: hash,
            raw: raw
        };
        return txInv;
    };
    TransactionParser.prototype.parseTransactions = function (mParser, count, blockTime) {
        if (count === void 0) { count = 0; }
        if (count === 0) {
            count = mParser.readVarInt();
        }
        switch (this.options.network.protocol) {
            case 'bitcoin':
                return this.parseBitcoinTransactions(mParser, count, blockTime);
            case 'zcash':
                return this.parseZcashTransactions(mParser, count);
        }
        return [];
    };
    TransactionParser.prototype.parseBitcoinTransactions = function (mParser, count, blockTime) {
        var txes = [];
        for (var i = 0; i < count; i++) {
            var bytesStart = mParser.pointerPosition();
            var version = mParser.raw(4).reverse().toString('hex');
            var witnessFlag = (mParser.readInt8() === 1 &&
                blockTime >= SEGWIT_ACTIVATION_EPOCH) ? true : false;
            if (!witnessFlag) {
                mParser.incrPointer(-1);
            }
            var txIn = this.parseTransparentInputs(mParser);
            var txOut = this.parseTransparentOutputs(mParser);
            var witnesses = this.parseWitnesses(mParser, witnessFlag);
            var lockTime = mParser.readUInt32LE();
            var bytesEnd = mParser.pointerPosition();
            var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
            var txid = this.util.sha256d(rawBytes).reverse().toString('hex');
            var tx = {
                txid: txid,
                version: version,
                txIn: txIn,
                txOut: txOut,
                witnesses: witnesses,
                lockTime: lockTime
            };
            txes.push(tx);
        }
        return txes;
    };
    TransactionParser.prototype.parseZcashTransactions = function (mParser, count) {
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
    TransactionParser.prototype.parseWitnesses = function (mParser, witnessFlag) {
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
    TransactionParser.prototype.parseTransparentInputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('tx in count:', count);
        var inputs = [];
        for (var i = 0; i < count; i++) {
            var input = {
                txid: mParser.raw(32).reverse().toString('hex'),
                outpointIndex: mParser.readUInt32LE(),
                signatureScript: mParser.raw(mParser.readVarInt()).reverse().toString('hex'),
                sequence: mParser.raw(4).reverse().toString('hex')
                // or sequence: mParser.readUInt32LE()
            };
            inputs.push(input);
        }
        return inputs;
    };
    TransactionParser.prototype.parseTransparentOutputs = function (mParser) {
        var count = mParser.readVarInt();
        // console.log('tx out count:', count);
        var outputs = [];
        for (var i = 0; i < count; i++) {
            var valueSatoshis = mParser.readUInt64LE();
            var value = valueSatoshis / (Math.pow(10, 8));
            var pkScript = mParser.raw(mParser.readVarInt()).toString('hex');
            var address = this.addressUtil.classifyAndEncodeAddress(pkScript);
            var output = {
                value: value,
                valueSatoshis: valueSatoshis,
                pkScript: pkScript,
                address: address
            };
            outputs.push(output);
        }
        return outputs;
    };
    TransactionParser.prototype.parseShieldedInputs = function (mParser) {
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
    TransactionParser.prototype.parseShieldedOutputs = function (mParser) {
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
    TransactionParser.prototype.parseJoinSplits = function (mParser, count) {
        // console.log('joinSplits count:', count);
        if (count > 0) {
            return mParser.raw(count * 1698).reverse().toString('hex');
        }
        return '';
    };
    return TransactionParser;
}());
exports.TransactionParser = TransactionParser;
