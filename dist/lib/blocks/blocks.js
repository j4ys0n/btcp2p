"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var Blocks = /** @class */ (function () {
    function Blocks() {
    }
    Blocks.prototype.parseBlockInv = function (payload) {
        var invLen = 36;
        var hashLen = 32;
        var blockInvs = [];
        var p = new crypto_binary_1.MessageParser(payload);
        var invCount = payload.length / invLen;
        while (invCount--) {
            var raw = new crypto_binary_1.MessageParser(Buffer.from(p.raw(invLen)));
            var blockInv = {
                raw: raw.buffer,
                parsed: {
                    version: raw.readUInt32LE(),
                    hash: raw.raw(hashLen).reverse().toString('hex')
                }
            };
            blockInvs.push(blockInv);
        }
        return blockInvs;
    };
    Blocks.prototype.handleBlockInv = function (payload) {
        var blockInvs = this.parseBlockInv(payload);
        return blockInvs;
    };
    return Blocks;
}());
exports.Blocks = Blocks;
var BlockHandler = /** @class */ (function () {
    function BlockHandler(scope, util) {
        this.scope = scope;
        this.util = util;
        this.blocks = new Blocks();
    }
    // initEventHandlers() {
    //   this.scope.events.on('blockinv', (payload: Buffer) => {
    //     const blockInvs = this.blocks.handleBlockInv(payload);
    //     console.log(blockInvs);
    //   });
    // }
    BlockHandler.prototype.handleBlockInv = function (payload) {
        var blockInvs = this.blocks.handleBlockInv(payload);
        this.scope.events.fire('blockinv', blockInvs);
    };
    BlockHandler.prototype.parseHashes = function (hashLen, mParser) {
        var hashes = [];
        var len = mParser.buffer.length - mParser.pointer;
        var stopHash = this.util.stopHash(hashLen);
        var cursor = 0;
        for (cursor; cursor < len; cursor += hashLen) {
            var hash = mParser.raw(hashLen).reverse().toString('hex');
            if (hash !== stopHash) {
                hashes.push(hash);
            }
        }
        return hashes;
    };
    BlockHandler.prototype.handleGetHeaders = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        var version = p.readUInt32LE();
        // const hashCount = p.raw(1).toString('hex');
        var hashCount = this.util.getCompactSize(p);
        var hashes = this.parseHashes(32, p);
        var parsed = {
            version: version,
            hashCount: hashCount,
            hashes: hashes
        };
        // console.log(parsed);
        this.scope.events.fire('getheaders', { raw: payload, parsed: parsed });
        return Promise.resolve({ raw: payload, parsed: parsed });
    };
    BlockHandler.prototype.parseHeader = function (mParser) {
        var header = {
            version: mParser.readUInt32LE(),
            hash: mParser.raw(32).reverse().toString('hex'),
            merkle_root: mParser.raw(32).reverse().toString('hex'),
            timestamp: new Date(mParser.readUInt32LE() * 1000),
            bits: mParser.readUInt32LE(),
            nonce: mParser.readUInt32LE()
        };
        return header;
    };
    BlockHandler.prototype.parseHeaders = function (count, mParser) {
        var headers = [];
        for (var i = 0; i < count; i++) {
            var header = this.parseHeader(mParser);
            headers.push(header);
        }
        return headers;
    };
    BlockHandler.prototype.handleHeaders = function (payload) {
        var p = new crypto_binary_1.MessageParser(payload);
        var hashCount = this.util.getCompactSize(p);
        console.log('headers', hashCount);
        var hashes = this.parseHeaders(hashCount, p);
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
