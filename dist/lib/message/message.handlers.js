"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var IPV6_IPV4_PADDING = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
var MessageHandlers = /** @class */ (function () {
    function MessageHandlers(util) {
        this.util = util;
        // https://en.bitcoin.it/wiki/Protocol_specification#Inventory_Vectors
        this.invCodes = {
            error: 0,
            tx: 1,
            block: 2,
            blockFiltered: 3,
            blockCompact: 4
        };
        // https://en.bitcoin.it/wiki/Protocol_documentation#reject
        this.rejectCodes = {
            1: 'REJECT_MALFORMED',
            10: 'REJECT_INVALID',
            11: 'REJECT_OBSOLETE',
            12: 'REJECT_DUPLICATE',
            40: 'REJECT_NONSTANDARD',
            41: 'REJECT_DUST',
            42: 'REJECT_INSUFFICIENTFEE',
            43: 'REJECT_CHECKPOINT'
        };
    }
    MessageHandlers.prototype.handlePing = function (payload, events) {
        var nonce = this.parseNonce(payload);
        events.firePing(nonce);
        return Promise.resolve({ nonce: nonce });
    };
    MessageHandlers.prototype.handlePong = function (payload, events) {
        var nonce = this.parseNonce(payload);
        events.firePong(nonce);
        return Promise.resolve({ nonce: nonce });
    };
    MessageHandlers.prototype.handleReject = function (payload, events) {
        var p = new crypto_binary_1.MessageParser(payload);
        var messageLen = p.readInt8();
        var message = p.raw(messageLen).toString();
        var ccode = p.readInt8();
        var name = this.rejectCodes[ccode];
        var reasonLen = p.readInt8();
        var reason = p.raw(reasonLen).toString();
        var extraLen = (p.buffer.length - 1) - (p.pointer - 1);
        var extra = (extraLen > 0) ? p.raw(extraLen).toString() : '';
        var rejected = {
            message: message,
            ccode: ccode,
            name: name,
            reason: reason,
            extra: extra
        };
        events.fireReject(rejected);
        return Promise.resolve(rejected);
    };
    MessageHandlers.prototype.handleVersion = function (payload, events) {
        var s = new crypto_binary_1.MessageParser(payload);
        // https://en.bitcoin.it/wiki/Protocol_documentation#version
        var parsed = {
            version: s.readUInt32LE(),
            services: parseInt(s.raw(8).slice(0, 1).toString('hex'), 16),
            time: s.raw(8),
            addr_recv: s.raw(26).toString('hex'),
            addr_from: s.raw(26).toString('hex'),
            nonce: s.raw(8).toString('hex'),
            client: s.readVarString(),
            height: s.readUInt32LE(),
            relay: Boolean(s.raw(1))
        };
        if (parsed.time !== false && parsed.time.readUInt32LE(4) === 0) {
            parsed.time = new Date(parsed.time.readUInt32LE(0) * 1000);
        }
        events.fireVersion(parsed);
        return Promise.resolve(parsed);
    };
    MessageHandlers.prototype.handleAddr = function (payload, events) {
        var addrs = {
            addresses: this.parseAddrMessage(payload, events)
        };
        events.fireAddr(addrs);
        return Promise.resolve(addrs);
    };
    MessageHandlers.prototype.parseHashes = function (hashLen, mParser) {
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
    MessageHandlers.prototype.handleGetHeaders = function (payload, events) {
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
        events.fireGetHeaders({ raw: payload, parsed: parsed });
        return Promise.resolve({ raw: payload, parsed: parsed });
    };
    MessageHandlers.prototype.parseHeaders = function (count, mParser) {
        var headers = [];
        for (var i = 0; i < count; i++) {
            var header = {
                version: mParser.readUInt32LE(),
                prev_block: mParser.raw(32).reverse().toString('hex'),
                merkle_root: mParser.raw(32).reverse().toString('hex'),
                timestamp: new Date(mParser.readUInt32LE(0) * 1000),
                bits: mParser.readUInt32LE(),
                nonce: mParser.readUInt32LE()
            };
            headers.push(header);
        }
        return headers;
    };
    MessageHandlers.prototype.handleHeaders = function (payload, events) {
        var p = new crypto_binary_1.MessageParser(payload);
        var hashCount = this.util.getCompactSize(p);
        var hashes = this.parseHeaders(hashCount, p);
        var parsed = {
            hashCount: hashCount,
            hashes: hashes
        };
        // console.log(parsed);
        events.fireHeaders({ raw: payload, parsed: parsed });
        return Promise.resolve({ raw: payload, parsed: parsed });
    };
    MessageHandlers.prototype.handleInv = function (payload, events) {
        var count = payload.readUInt8(0);
        payload = payload.slice(1);
        if (count >= 0xfd) {
            count = payload.readUInt16LE(0);
            payload = payload.slice(2);
        }
        while (count--) {
            var type = void 0;
            try {
                type = payload.readUInt32LE(0);
            }
            catch (e) {
            }
            if (type) {
                events.firePeerMessage({ command: 'inv', payload: { type: type } });
            }
            switch (type) {
                case this.invCodes.error:
                    console.log('error, you can ignore this');
                    break;
                case this.invCodes.tx:
                    var tx = payload.slice(4, 36).toString('hex');
                    events.fireTxNotify({ hash: tx });
                    break;
                case this.invCodes.block:
                    var block = payload.slice(4, 36).reverse().toString('hex');
                    events.fireBlockNotify({ hash: block });
                    break;
                case this.invCodes.blockFiltered:
                    var fBlock = payload.slice(4, 36).reverse().toString('hex');
                    console.log('filtered block:', fBlock);
                    break;
                case this.invCodes.blockCompact:
                    var cBlock = payload.slice(4, 36).reverse().toString('hex');
                    console.log('compact block:', cBlock);
                    break;
            }
            payload = payload.slice(36);
        }
    };
    MessageHandlers.prototype.parseNonce = function (payload) {
        var nonce;
        if (payload.length) {
            nonce = new crypto_binary_1.MessageParser(payload).raw(8);
        }
        else {
            /* istanbul ignore next */
            nonce = Buffer.from([]);
        }
        return nonce;
    };
    MessageHandlers.prototype.getHost = function (buff) {
        if (buff.slice(0, 12).toString('hex') === IPV6_IPV4_PADDING.toString('hex')) {
            //IPv4
            return { host: buff.slice(12).join('.'), version: 4 };
        }
        else {
            //IPv6
            // non-null type guard (!) https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Advanced%20Types.md#type-guards-and-type-assertions
            return { host: buff.slice(0, 16).toString('hex')
                    .match(/(.{1,4})/g)
                    .join(':')
                    .replace(/\:(0{1,3})/g, ':')
                    .replace(/^(0{1,3})/g, ''),
                version: 6 };
        }
    };
    MessageHandlers.prototype.getAddr = function (buff, events) {
        var addr = {
            hostRaw: Buffer.from([]),
            host: '',
            port: 0,
            ipVersion: 0
        };
        var host = {
            host: '',
            version: 0
        };
        var svc;
        if (buff.length === 30) {
            addr.timestamp = buff.readUInt32LE(0) * 1000; // to miliseconds
            svc = Buffer.allocUnsafe(8);
            buff.copy(svc, 0, 4, 12);
            addr.services = svc.toString('hex');
            addr.hostRaw = Buffer.allocUnsafe(16);
            buff.copy(addr.hostRaw, 0, 12, 28);
            host = this.getHost(addr.hostRaw);
            addr.host = host.host;
            addr.ipVersion = host.version;
            addr.port = buff.readUInt16BE(28);
        }
        else {
            /* istanbul ignore next */
            events.fireError({ message: 'address field length not 30', payload: buff });
        }
        return addr;
    };
    MessageHandlers.prototype.parseAddrMessage = function (payload, events) {
        var s = new crypto_binary_1.MessageParser(payload);
        var addrs = [];
        var addrNum = s.readVarInt();
        for (var i = 0; i < addrNum; i++) {
            var addr = this.getAddr(s.raw(30), events);
            addrs.push(addr);
        }
        return addrs;
    };
    return MessageHandlers;
}());
exports.MessageHandlers = MessageHandlers;
