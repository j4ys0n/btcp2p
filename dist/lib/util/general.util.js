"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var Utils = /** @class */ (function () {
    function Utils() {
    }
    Utils.prototype.sha256 = function (buffer) {
        var hash1 = crypto.createHash('sha256');
        hash1.update(buffer);
        return hash1.digest();
    };
    Utils.prototype.sha256d = function (buffer) {
        return this.sha256(this.sha256(buffer));
    };
    Utils.prototype.varIntBuffer = function (n) {
        if (n < 0xfd) {
            return new Buffer([n]);
        }
        else if (n <= 0xffff) {
            var buff = new Buffer(3);
            buff[0] = 0xfd;
            buff.writeUInt16LE(n, 1);
            return buff;
        }
        else if (n <= 0xffffffff) {
            var buff = new Buffer(5);
            buff[0] = 0xfe;
            buff.writeUInt32LE(n, 1);
            return buff;
        }
        else {
            var buff = new Buffer(9);
            buff[0] = 0xff;
            this.packUInt16LE(n).copy(buff, 1);
            return buff;
        }
    };
    Utils.prototype.packUInt16LE = function (num) {
        var buff = new Buffer(2);
        buff.writeUInt16LE(num, 0);
        return buff;
    };
    Utils.prototype.packUInt16BE = function (num) {
        var buff = new Buffer(2);
        buff.writeUInt16BE(num, 0);
        return buff;
    };
    Utils.prototype.packUInt32LE = function (num) {
        var buff = new Buffer(4);
        buff.writeInt32LE(num, 0);
        return buff;
    };
    Utils.prototype.packInt64LE = function (num) {
        var buff = new Buffer(8);
        buff.writeUInt32LE(num % Math.pow(2, 32), 0);
        buff.writeUInt32LE(Math.floor(num / Math.pow(2, 32)), 4);
        return buff;
    };
    Utils.prototype.varStringBuffer = function (s) {
        var strBuff = new Buffer(s);
        return Buffer.concat([this.varIntBuffer(strBuff.length), strBuff]);
    };
    Utils.prototype.fixedLenStringBuffer = function (s, len) {
        var buff = Buffer.allocUnsafe(len);
        buff.fill(0);
        buff.write(s);
        return buff;
    };
    Utils.prototype.commandStringBuffer = function (s) {
        return this.fixedLenStringBuffer(s, 12);
    };
    // mp needs to be MessageParser, can't use as a type for some reason
    Utils.prototype.getCompactSize = function (mp) {
        var compactSize = mp.raw(1);
        if (compactSize >= 0xfd) {
            compactSize = Buffer.concat([
                compactSize, mp.raw(1)
            ]);
        }
        return parseInt(compactSize.toString('hex'), 16);
    };
    Utils.prototype.stopHash = function (len) {
        var h = '';
        while (len--) {
            h += '00';
        }
        return h;
    };
    Utils.prototype.reverseHexBytes = function (bytes) {
        var len = bytes.length / 2;
        var reversed = '';
        for (var i = 0; i < len; i++) {
            reversed = bytes.substr(i * 2, 2) + reversed;
        }
        return reversed;
    };
    return Utils;
}());
exports.Utils = Utils;
