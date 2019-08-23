"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_binary_1 = require("crypto-binary");
var block_handler_1 = require("../blocks/block-handler");
var transactions_1 = require("../transactions/transactions");
var MessageHandlers = /** @class */ (function () {
    function MessageHandlers(scope, util, dbUtil, options) {
        this.scope = scope;
        this.util = util;
        this.dbUtil = dbUtil;
        this.options = options;
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
        this.blockHandler = new block_handler_1.BlockHandler(this.scope, this.util, this.dbUtil, this.options);
        this.transactions = new transactions_1.Transactions(this.scope, this.util, this.dbUtil, this.options);
    }
    MessageHandlers.prototype.handlePing = function (payload) {
        var nonce = this.parseNonce(payload);
        this.scope.events.fire('ping', nonce);
        return Promise.resolve({ nonce: nonce });
    };
    MessageHandlers.prototype.handlePong = function (payload) {
        var nonce = this.parseNonce(payload);
        this.scope.events.fire('pong', nonce);
        return Promise.resolve({ nonce: nonce });
    };
    MessageHandlers.prototype.handleReject = function (payload) {
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
        this.scope.events.fire('reject', rejected);
        return Promise.resolve(rejected);
    };
    MessageHandlers.prototype.handleVersion = function (payload) {
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
        this.scope.shared.externalHeight = parsed.height;
        if (parsed.time !== false && parsed.time.readUInt32LE(4) === 0) {
            parsed.time = new Date(parsed.time.readUInt32LE(0) * 1000);
        }
        this.util.log('core', 'info', JSON.stringify(parsed));
        this.scope.events.fire('version', parsed);
        return Promise.resolve(parsed);
    };
    MessageHandlers.prototype.handleInv = function (payload) {
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
                this.scope.events.fire('peer_message', { command: 'inv', payload: { type: type } });
            }
            switch (type) {
                case this.invCodes.error:
                    console.log('error, you can ignore this');
                    break;
                case this.invCodes.tx:
                    this.transactions.handleTransactionInv(payload);
                    break;
                case this.invCodes.block:
                    this.blockHandler.handleBlockInv(payload);
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
    return MessageHandlers;
}());
exports.MessageHandlers = MessageHandlers;
