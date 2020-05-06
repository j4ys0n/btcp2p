"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var IPV6_IPV4_PADDING = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
var PeerHandler = /** @class */ (function () {
    function PeerHandler(scope) {
        this.scope = scope;
    }
    PeerHandler.prototype.getHost = function (buff) {
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
    PeerHandler.prototype.getAddr = function (buff) {
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
            this.scope.events.fire('error', { message: 'address field length not 30', payload: buff });
        }
        return addr;
    };
    PeerHandler.prototype.parseAddrMessage = function (payload) {
        var s = new crypto_binary_1.MessageParser(payload);
        var addrs = [];
        var addrNum = s.readVarInt();
        for (var i = 0; i < addrNum; i++) {
            var addr = this.getAddr(s.raw(30));
            addrs.push(addr);
        }
        return addrs;
    };
    PeerHandler.prototype.handleAddr = function (payload) {
        var addrs = {
            addresses: this.parseAddrMessage(payload)
        };
        this.scope.events.fire('addr', addrs);
        return Promise.resolve(addrs);
    };
    return PeerHandler;
}());
exports.PeerHandler = PeerHandler;
