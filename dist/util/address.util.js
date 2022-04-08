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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var bitcoinjslib = __importStar(require("bitcoinjs-lib"));
var bitcoinjslibClassify = __importStar(require("bitcoinjs-lib/src/classify"));
var bitcoin = __assign({}, bitcoinjslib, { classify: bitcoinjslibClassify });
var network = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
};
var AddressUtil = /** @class */ (function () {
    function AddressUtil(options) {
        this.options = options;
        network.pubKeyHash = this.options.network.pubKeyVersion;
        network.scriptHash = this.options.network.scriptVersion;
    }
    AddressUtil.prototype.classifyHex = function (hex) {
        var hexBuffer = Buffer.from(hex, 'hex');
        var type;
        try {
            type = bitcoin.classify.output(hexBuffer);
        }
        catch (e) {
            // invalid hex scripts start with '6a' which translates to OP_RETURN
            type = 'invalid';
        }
        return type;
    };
    AddressUtil.prototype.encodePubKeyAddress = function (hex) {
        var hexBuff = Buffer.from(hex, 'hex');
        var bytes = parseInt(hexBuff.slice(0, 1).toString('hex'), 16);
        var pubkey = hexBuff.slice(1, 1 + bytes);
        var hash160 = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(pubkey));
        return bitcoin.address.toBase58Check(hash160, network.pubKeyHash);
    };
    AddressUtil.prototype.encodeMultisigAddress = function (hex) {
        var hexBuff = Buffer.from(hex, 'hex');
        var hash160 = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(hexBuff));
        return bitcoin.address.toBase58Check(hash160, network.scriptHash);
    };
    AddressUtil.prototype.encodeAddress = function (type, hex) {
        var addr = '';
        if (type === 'multisig') {
            addr = this.encodeMultisigAddress(hex);
        }
        else if (type === 'pubkey') {
            addr = this.encodePubKeyAddress(hex);
        }
        else if (type === 'pubkeyhash') {
            addr = bitcoin.address.fromOutputScript(Buffer.from(hex, 'hex'), network);
        }
        else if (type === 'witnesscommitment') {
            // do nothing
        }
        else if (type === 'nonstandard') {
            // do nothing
        }
        else if (type === 'nulldata') {
            // do nothing
        }
        else if (type === 'invalid') {
            // do nothing
        }
        else {
            addr = bitcoin.address.fromOutputScript(Buffer.from(hex, 'hex'), network);
        }
        return addr;
    };
    AddressUtil.prototype.classifyAndEncodeAddress = function (hex) {
        var type = this.classifyHex(hex);
        return this.encodeAddress(type, hex);
    };
    return AddressUtil;
}());
exports.AddressUtil = AddressUtil;
