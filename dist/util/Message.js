"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var spareBytes = 512;
var isDate = function (item) {
    return item.getMonth !== undefined;
};
var MessageBuilder = /** @class */ (function () {
    function MessageBuilder(maxBytes) {
        this.maxBytes = maxBytes || 20000000;
        this.buffer = Buffer.alloc(Math.min(this.maxBytes, 10000));
        this.cursor = 0;
    }
    MessageBuilder.prototype.raw = function () {
        var out = Buffer.alloc(this.cursor);
        this.buffer.copy(out, 0, 0, this.cursor);
        return out;
    };
    MessageBuilder.prototype.pad = function (num) {
        var data = Buffer.alloc(num);
        data.fill(0);
        return this.put(data);
    };
    MessageBuilder.prototype.put = function (data) {
        if (typeof data == 'number' && data <= 255) {
            this.ensureSize(1);
            this.buffer[this.cursor] = data;
            this.cursor += 1;
            return this;
        }
        this.ensureSize(data.length);
        data.copy(this.buffer, this.cursor);
        this.cursor += data.length;
        return this;
    };
    MessageBuilder.prototype.putInt8 = function (num) {
        if (Buffer.isBuffer(num)) {
            return this.put(num.slice(0, 1));
        }
        return this.put(num);
    };
    MessageBuilder.prototype.putInt16 = function (num) {
        if (Buffer.isBuffer(num)) {
            return this.put(num.slice(0, 2));
        }
        var data = Buffer.alloc(2);
        data.writeUInt16LE(num, 0);
        return this.put(data);
    };
    MessageBuilder.prototype.putInt32 = function (num) {
        if (Buffer.isBuffer(num)) {
            return this.put(num.slice(0, 4));
        }
        else if (isDate(num)) {
            return this.putInt32(num.getTime() / 1000); // Pull timestamp from Date object
        }
        var data = Buffer.alloc(4);
        data.writeUInt32LE(num, 0);
        return this.put(data);
    };
    MessageBuilder.prototype.putInt64 = function (num) {
        if (Buffer.isBuffer(num)) {
            return this.put(num.slice(0, 8));
        }
        else if (isDate(num)) {
            return this.putInt64(num.getTime() / 1000); // Pull timestamp from Date object
        }
        // Pad a 32-bit number to fit in a 64-bit space
        var data = Buffer.alloc(8);
        data.fill(0);
        data.writeUInt32LE(num, 0);
        return this.put(data);
    };
    MessageBuilder.prototype.putString = function (str) {
        var data = Buffer.alloc(str.length);
        for (var i = 0; i < str.length; i++) {
            data[i] = str.charCodeAt(i);
        }
        return this.put(data);
    };
    MessageBuilder.prototype.putVarInt = function (num) {
        if (num < 0xfd) {
            return this.put(num);
        }
        else if (num <= 0xffff) {
            return this.put(0xfd).putInt16(num);
        }
        else if (num <= 0xffffffff) {
            return this.put(0xfe).putInt32(num);
        }
        else {
            return this.put(0xff).putInt64(num);
        }
    };
    MessageBuilder.prototype.putVarString = function (str) {
        return this.putVarInt(str.length).putString(str);
    };
    MessageBuilder.prototype.ensureSize = function (additionalBytes) {
        var requiredBytes = this.cursor + additionalBytes;
        if (requiredBytes > this.maxBytes) {
            throw new Error('Message size is limited to ' + this.maxBytes + ' bytes');
        }
        else if (requiredBytes > this.buffer.length) {
            var oldBuffer = this.buffer;
            this.buffer = Buffer.alloc(Math.min(this.maxBytes, requiredBytes + spareBytes));
            oldBuffer.copy(this.buffer);
        }
        return this;
    };
    return MessageBuilder;
}());
exports.MessageBuilder = MessageBuilder;
var MessageParser = /** @class */ (function () {
    function MessageParser(raw) {
        this.buffer = Buffer.alloc(raw.length);
        raw.copy(this.buffer);
        this.pointer = 0;
        this.hasFailed = false;
        this.failedStack = false;
    }
    MessageParser.prototype.markFailed = function () {
        if (this.hasFailed)
            return false;
        this.hasFailed = true;
        this.failedStack = new Error().stack;
        return true;
    };
    MessageParser.prototype.pointerCheck = function (num) {
        num = (num) ? +num : 0;
        if (this.buffer.length < this.pointer + num) {
            this.markFailed();
            return false;
        }
        return true;
    };
    MessageParser.prototype.pointerPosition = function () {
        var pos = this.pointer;
        return pos;
    };
    MessageParser.prototype.incrPointer = function (amount) {
        if (this.hasFailed)
            return false;
        if (typeof amount !== 'number') {
            this.markFailed();
            return false;
        }
        this.pointer += amount;
        this.pointerCheck();
        return true;
    };
    MessageParser.prototype.setPointer = function (amount) {
        if (this.hasFailed)
            return false;
        if (typeof amount !== 'number') {
            this.markFailed();
            return false;
        }
        this.pointer = amount;
        this.pointerCheck();
    };
    MessageParser.prototype.readInt8 = function () {
        if (this.hasFailed || this.pointerCheck() === false)
            return undefined;
        var out = this.buffer[this.pointer];
        this.incrPointer(1);
        return out;
    };
    MessageParser.prototype.readUInt16LE = function () {
        if (this.hasFailed || this.pointerCheck(2) === false)
            return undefined;
        var out = this.buffer.readUInt16LE(this.pointer);
        this.incrPointer(2);
        return out;
    };
    MessageParser.prototype.readUInt32LE = function () {
        if (this.hasFailed || this.pointerCheck(4) === false)
            return undefined;
        var out = this.buffer.readUInt32LE(this.pointer);
        this.incrPointer(4);
        return out;
    };
    MessageParser.prototype.readUInt64LE = function () {
        if (this.hasFailed || this.pointerCheck(8) === false)
            return undefined;
        var bytes = this.raw(8);
        if (bytes == null)
            return undefined;
        var out = parseInt(bytes.reverse().toString('hex'), 16);
        // const out = this.buffer.readBigInt64LE(this.pointer)
        return parseInt(out.toString(), 10);
    };
    MessageParser.prototype.readVarInt = function () {
        if (this.hasFailed || this.pointerCheck() === false)
            return undefined;
        var flag = this.readInt8();
        if (flag != null) {
            if (flag < 0xfd) {
                return flag;
            }
            else if (flag == 0xfd) {
                return this.readUInt16LE();
            }
            else if (flag == 0xfe) {
                return this.readUInt32LE();
            }
            else {
                return this.readUInt64LE();
            }
        }
    };
    MessageParser.prototype.readVarString = function () {
        if (this.hasFailed || this.pointerCheck() === false)
            return undefined;
        var length = this.readVarInt();
        if (length == null)
            return undefined;
        var str = [];
        for (var i = 0; i < length; i++) {
            var int = this.readInt8();
            if (int) {
                str.push(String.fromCharCode(int));
            }
        }
        return str.join('');
    };
    MessageParser.prototype.raw = function (length, increment) {
        if (increment === void 0) { increment = true; }
        if (this.hasFailed || this.pointerCheck(length) === false)
            return undefined;
        if (typeof length !== 'number') {
            this.markFailed();
            return undefined;
        }
        var out = Buffer.alloc(length);
        this.buffer.copy(out, 0, this.pointer, this.pointer + length);
        if (increment) {
            this.incrPointer(length);
        }
        return out;
    };
    MessageParser.prototype.rawSegment = function (start, end) {
        var length = end - start;
        if (length > this.buffer.length) {
            this.markFailed();
            return undefined;
        }
        var out = Buffer.alloc(length);
        this.buffer.copy(out, 0, start, end);
        return out;
    };
    MessageParser.prototype.rawRemainder = function () {
        return this.rawSegment(this.pointer, this.buffer.length);
    };
    return MessageParser;
}());
exports.MessageParser = MessageParser;
