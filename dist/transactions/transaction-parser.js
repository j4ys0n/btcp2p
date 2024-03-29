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
var Message_1 = require("../util/Message");
var address_util_1 = require("../util/address.util");
var SEGWIT_ACTIVATION_EPOCH = 1503539857; // height = 481824
var TransactionParser = /** @class */ (function () {
    function TransactionParser(util, options) {
        this.util = util;
        this.options = options;
        this.addressUtil = new address_util_1.AddressUtil(this.options);
    }
    TransactionParser.prototype.parseTransactionInv = function (payload) {
        var mParser = new Message_1.MessageParser(payload);
        var raw = Buffer.allocUnsafe(36);
        payload.copy(raw);
        var versionBytes = mParser.raw(4);
        if (!versionBytes) {
            throw new Error('parseTransactionInv versionBytes undefined');
        }
        var version = parseInt(versionBytes.reverse().toString('hex'), 16);
        var hashBytes = mParser.raw(32);
        if (!hashBytes) {
            throw new Error('parseTransactionInv hashBytes undefined');
        }
        var hash = hashBytes.reverse().toString('hex');
        var txInv = {
            version: version,
            hash: hash,
            raw: raw
        };
        return txInv;
    };
    TransactionParser.prototype.parseTransactions = function (payload, count, blockTime) {
        if (count === void 0) { count = 0; }
        var mParser = new Message_1.MessageParser(payload);
        if (count === 0) {
            count = mParser.readVarInt() || 0;
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
        var _loop_1 = function (i) {
            var bytesStart = mParser.pointerPosition();
            var version = mParser.readUInt32LE() || 0;
            // const versionBytesEnd = mParser.pointerPosition();
            var witnessFlagBytes = mParser.raw(2) || Buffer.from([]);
            var witnessFlag = witnessFlagBytes.toString('hex');
            var witness = (witnessFlag === '0001' &&
                blockTime >= SEGWIT_ACTIVATION_EPOCH) ? true : false;
            if (!witness) {
                mParser.incrPointer(-2);
            }
            var inputs = this_1.parseTransparentInputs(mParser);
            var vout = this_1.parseTransparentOutputs(mParser);
            var witnesses = this_1.parseWitnesses(mParser, witness, inputs.length);
            var lockTime = mParser.readUInt32LE() || 0;
            var vin = (witness && inputs.length > 0 && witnesses.length > 0)
                ? inputs.map(function (v, j) { return ((witnesses[j].length > 0) ? __assign({}, v, { txinwitness: witnesses[j] }) : v); }) : inputs;
            var bytesEnd = mParser.pointerPosition();
            var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
            if (!rawBytes) {
                throw new Error('parseBitcoinTransactions rawBytes undefined');
            }
            var txid = this_1.util.sha256d(rawBytes).reverse().toString('hex');
            var tx = {
                txid: txid,
                version: version,
                vin: vin,
                vout: vout,
                lockTime: lockTime
            };
            // console.log(JSON.stringify(tx))
            txes.push(tx);
        };
        var this_1 = this;
        for (var i = 0; i < count; i++) {
            _loop_1(i);
        }
        return txes;
    };
    TransactionParser.prototype.parseZcashTransactions = function (mParser, count) {
        var txes = [];
        for (var i = 0; i < count; i++) {
            var bytesStart = mParser.pointerPosition();
            var headerBytes = mParser.raw(4);
            if (!headerBytes) {
                throw new Error('parseZcashTransactions headerBytes undefined');
            }
            var header = headerBytes.reverse().toString('hex');
            var nVersionGroupIdBytes = mParser.raw(4);
            if (!nVersionGroupIdBytes) {
                throw new Error('parseZcashTransactions nVersionGroupIdBytes undefined');
            }
            var nVersionGroupId = nVersionGroupIdBytes.reverse().toString('hex');
            var txIn = this.parseTransparentInputs(mParser);
            var txOut = this.parseTransparentOutputs(mParser);
            var lockTime = mParser.readUInt32LE();
            var nExpiryHeight = mParser.readUInt32LE();
            var saplingValueBalance = mParser.readUInt64LE();
            var shieldedInputs = this.parseShieldedInputs(mParser);
            var shieldedOutputs = this.parseShieldedOutputs(mParser);
            var nJoinSplits = mParser.readVarInt();
            if (nJoinSplits == null) {
                throw new Error('parseZcashTransactions nJoinSplits undefined');
            }
            var joinSplits = this.parseJoinSplits(mParser, nJoinSplits);
            var joinSplitPubKey = (nJoinSplits > 0) ?
                (mParser.raw(32) || []).reverse().toString('hex') : '';
            var joinSplitSig = (nJoinSplits > 0) ?
                (mParser.raw(64) || []).reverse().toString('hex') : '';
            var bindingSig = (shieldedInputs.length + shieldedOutputs.length > 0) ?
                (mParser.raw(64) || []).reverse().toString('hex') : '';
            var bytesEnd = mParser.pointerPosition();
            var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
            if (!rawBytes) {
                throw new Error('parseZcashTransactions rawBytes undefined');
            }
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
    TransactionParser.prototype.parseWitnesses = function (mParser, witnessFlag, count) {
        var wits = [];
        if (witnessFlag) {
            for (var i = 0; i < count; i++) {
                var w = [];
                var witnessCount = mParser.readVarInt() || 0;
                for (var i_1 = 0; i_1 < witnessCount; i_1++) {
                    var scriptLength = mParser.readVarInt() || 0;
                    var witness = (mParser.raw(scriptLength) || []).toString('hex');
                    w.push(witness);
                }
                wits.push(w);
            }
        }
        return wits;
    };
    TransactionParser.prototype.parseTransparentInputs = function (mParser) {
        var count = mParser.readVarInt() || 0;
        var inputs = [];
        for (var i = 0; i < count; i++) {
            var txidBytes = mParser.raw(32) || Buffer.from([]);
            var txid = txidBytes.reverse().toString('hex');
            var vout = mParser.readUInt32LE();
            if (vout == null) {
                throw new Error('parseTransparentInputs outpoint index undefined');
            }
            var sigScriptLength = mParser.readVarInt() || 0;
            var sigScriptBytes = mParser.raw(sigScriptLength) || Buffer.from([]);
            var hex = sigScriptBytes.reverse().toString('hex');
            var sequence = mParser.readUInt32LE() || 0;
            var input = {
                txid: txid,
                vout: vout,
                scriptSig: {
                    hex: hex
                },
                sequence: sequence
            };
            inputs.push(input);
        }
        return inputs;
    };
    TransactionParser.prototype.parseTransparentOutputs = function (mParser) {
        var count = mParser.readVarInt() || 0;
        // console.log('tx out count:', count);
        var outputs = [];
        for (var i = 0; i < count; i++) {
            var valueSatoshis = mParser.readUInt64LE() || 0;
            var value = valueSatoshis / (Math.pow(10, 8));
            var pkScriptBytes = mParser.raw(mParser.readVarInt() || 0);
            var hex = (pkScriptBytes) ? pkScriptBytes.toString('hex') : '';
            var address = this.addressUtil.classifyAndEncodeAddress(hex);
            var output = {
                value: value,
                n: i,
                scriptPubKey: {
                    hex: hex,
                    address: address
                }
            };
            outputs.push(output);
        }
        return outputs;
    };
    TransactionParser.prototype.parseShieldedInputs = function (mParser) {
        var count = mParser.readVarInt() || 0;
        // console.log('shielded in count:', count);
        var inputs = [];
        for (var i = 0; i < count; i++) {
            var cvBytes = mParser.raw(32) || Buffer.from([]);
            var anchorBytes = mParser.raw(32) || Buffer.from([]);
            var nullifierBytes = mParser.raw(32) || Buffer.from([]);
            var rkBytes = mParser.raw(32) || Buffer.from([]);
            var zkProofBytes = mParser.raw(192) || Buffer.from([]);
            var spendAuthSigBytes = mParser.raw(64) || Buffer.from([]);
            var input = {
                cv: cvBytes.reverse().toString('hex'),
                anchor: anchorBytes.reverse().toString('hex'),
                nullifier: nullifierBytes.reverse().toString('hex'),
                rk: rkBytes.reverse().toString('hex'),
                zkProof: zkProofBytes.toString('hex'),
                spendAuthSig: spendAuthSigBytes.reverse().toString('hex')
            };
            inputs.push(input);
        }
        return inputs;
    };
    TransactionParser.prototype.parseShieldedOutputs = function (mParser) {
        var count = mParser.readVarInt() || 0;
        // console.log('shielded out count:', count);
        var outputs = [];
        for (var i = 0; i < count; i++) {
            var cvBytes = mParser.raw(32) || Buffer.from([]);
            var cmuBytes = mParser.raw(32) || Buffer.from([]);
            var ephemeralKeyBytes = mParser.raw(32) || Buffer.from([]);
            var encCyphertextBytes = mParser.raw(580) || Buffer.from([]);
            var outCyphertextBytes = mParser.raw(80) || Buffer.from([]);
            var zkProofBytes = mParser.raw(192) || Buffer.from([]);
            var output = {
                cv: cvBytes.reverse().toString('hex'),
                cmu: cmuBytes.reverse().toString('hex'),
                ephemeralKey: ephemeralKeyBytes.reverse().toString('hex'),
                encCyphertext: encCyphertextBytes.toString('hex'),
                outCyphertext: outCyphertextBytes.toString('hex'),
                zkProof: zkProofBytes.toString('hex')
            };
            outputs.push(output);
        }
        return outputs;
    };
    TransactionParser.prototype.parseJoinSplits = function (mParser, count) {
        // console.log('joinSplits count:', count);
        if (count > 0) {
            var joinSplitBytes = mParser.raw(count * 1698) || Buffer.from([]);
            return joinSplitBytes.reverse().toString('hex');
        }
        return '';
    };
    return TransactionParser;
}());
exports.TransactionParser = TransactionParser;
