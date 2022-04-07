"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message_1 = require("../util/Message");
var BlockParser = /** @class */ (function () {
    function BlockParser(options, util) {
        this.options = options;
        this.util = util;
    }
    BlockParser.prototype.parseBlockInv = function (payload) {
        var invLen = 36;
        var hashLen = 32;
        var blockInvs = [];
        var p = new Message_1.MessageParser(payload);
        var invCount = payload.length / invLen;
        while (invCount--) {
            var invBytes = p.raw(invLen) || Buffer.from([]);
            var raw = new Message_1.MessageParser(Buffer.from(invBytes));
            var version = raw.readUInt32LE() || 0;
            var hashBytes = raw.raw(hashLen) || Buffer.from([]);
            var hash = hashBytes.reverse().toString('hex');
            var blockInv = {
                raw: raw.buffer,
                parsed: {
                    version: version,
                    hash: hash
                }
            };
            blockInvs.push(blockInv);
        }
        return blockInvs;
    };
    BlockParser.prototype.parseHashes = function (hashLen, mParser) {
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
    BlockParser.prototype.parseHeader = function (mp) {
        var _a = (this.options.network.protocol === 'zcash')
            ? this.parseZcashHeader(mp) : this.parseBitcoinHeader(mp), header = _a.header, mParser = _a.mParser;
        return {
            header: header,
            remainingBuffer: mParser.rawRemainder() || Buffer.from([])
        };
    };
    BlockParser.prototype.parseHeaders = function (count, mParser) {
        var headers = [];
        for (var i = 0; i < count; i++) {
            var header = this.parseHeader(mParser).header;
            headers.push(header);
        }
        return headers;
    };
    BlockParser.prototype.getTargetParts = function (bits) {
        var part1HexStr = '0x' + bits.substring(0, 2);
        var part2HexStr = '0x' + bits.substring(2);
        var part1 = parseInt(part1HexStr, 16);
        var part2 = parseInt(part2HexStr, 16);
        return { part1: part1, part2: part2 };
    };
    BlockParser.prototype.calculateDifficulty = function (bits) {
        var genTargetParts = this.getTargetParts(this.options.network.genesisTarget);
        var blkTargetParts = this.getTargetParts(bits);
        var currentTarget = blkTargetParts.part2 * Math.pow(2, (8 * (blkTargetParts.part1 - 3)));
        var genesisTarget = genTargetParts.part2 * Math.pow(2, (8 * (genTargetParts.part1 - 3)));
        var difficulty = genesisTarget / currentTarget;
        return difficulty;
    };
    BlockParser.prototype.parseZcashHeader = function (mParser) {
        var bytesStart = mParser.pointerPosition();
        var version = mParser.readUInt32LE();
        var prevBlock = mParser.raw(32).reverse().toString('hex');
        var hashMerkleRoot = mParser.raw(32).reverse().toString('hex');
        var hashFinalSaplingRoot = mParser.raw(32).reverse().toString('hex');
        var timestamp = mParser.readUInt32LE();
        var bits = mParser.raw(4).reverse().toString('hex');
        var nonce = mParser.raw(32).reverse().toString('hex');
        var solution = mParser.raw(mParser.readVarInt()).toString('hex');
        var bytesEnd = mParser.pointerPosition();
        var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
        var hash = this.util.sha256d(rawBytes).reverse().toString('hex');
        var difficulty = this.calculateDifficulty(bits);
        var header = {
            hash: hash,
            version: version,
            prevBlock: prevBlock,
            hashMerkleRoot: hashMerkleRoot,
            hashFinalSaplingRoot: hashFinalSaplingRoot,
            timestamp: timestamp,
            bits: bits,
            nonce: nonce,
            solution: solution,
            difficulty: difficulty
        };
        return {
            header: header,
            mParser: mParser
        };
    };
    BlockParser.prototype.parseBitcoinHeader = function (mParser) {
        var bytesStart = mParser.pointerPosition();
        var version = mParser.readUInt32LE();
        var prevBlock = mParser.raw(32).reverse().toString('hex');
        var hashMerkleRoot = mParser.raw(32).reverse().toString('hex');
        var timestamp = mParser.readUInt32LE();
        var bits = mParser.raw(4).reverse().toString('hex');
        var nonce = mParser.readUInt32LE();
        var bytesEnd = mParser.pointerPosition();
        var rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
        var hash = this.util.sha256d(rawBytes).reverse().toString('hex');
        var difficulty = this.calculateDifficulty(bits);
        var header = {
            hash: hash,
            version: version,
            prevBlock: prevBlock,
            hashMerkleRoot: hashMerkleRoot,
            timestamp: timestamp,
            bits: bits,
            nonce: nonce,
            difficulty: difficulty
        };
        return {
            header: header,
            mParser: mParser
        };
    };
    return BlockParser;
}());
exports.BlockParser = BlockParser;
