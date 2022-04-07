"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message_1 = require("../util/Message");
var block_handler_1 = require("../blocks/block-handler");
var message_consts_1 = require("./message.consts");
var transaction_handler_1 = require("../transactions/transaction-handler");
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
        this.blockHandler = new block_handler_1.BlockHandler(this.scope, this.util, this.dbUtil, this.options);
        this.messageConsts = new message_consts_1.MessageConsts(this.util);
        this.transactionHandler = new transaction_handler_1.TransactionHandler(this.scope, this.util, this.dbUtil, this.options);
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
        var p = new Message_1.MessageParser(payload);
        var messageLen = p.readInt8() || 0;
        var messageBytes = p.raw(messageLen) || Buffer.from([]);
        var message = messageBytes.toString();
        var ccode = p.readInt8() || 0;
        var name = this.messageConsts.rejectCodes[ccode];
        var reasonLen = p.readInt8() || 0;
        var reasonBytes = p.raw(reasonLen) || Buffer.from([]);
        var reason = reasonBytes.toString();
        var extraLen = (p.buffer.length - 1) - (p.pointer - 1);
        var extraBytes = p.raw(extraLen) || Buffer.from([]);
        var extra = (extraLen > 0) ? extraBytes.toString() : '';
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
        var s = new Message_1.MessageParser(payload);
        // https://en.bitcoin.it/wiki/Protocol_documentation#version
        var version = s.readUInt32LE() || 0;
        var servicesBytes = s.raw(8) || Buffer.from([]);
        var services = parseInt(servicesBytes.slice(0, 1).toString('hex'), 16);
        var time = s.raw(8) || Buffer.from([]);
        var addr_recvBytes = s.raw(26) || Buffer.from([]);
        var addr_recv = addr_recvBytes.toString('hex');
        var addr_fromBytes = s.raw(26) || Buffer.from([]);
        var addr_from = addr_fromBytes.toString('hex');
        var nonceBytes = s.raw(8) || Buffer.from([]);
        var nonce = nonceBytes.toString('hex');
        var parsed = {
            version: version,
            services: services,
            time: time,
            addr_recv: addr_recv,
            addr_from: addr_from,
            nonce: nonce,
            client: s.readVarString() || '',
            height: s.readUInt32LE() || 0,
            relay: Boolean(s.raw(1))
        };
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
                    this.transactionHandler.handleTransactionInv(payload);
                    break;
                case this.invCodes.block:
                    if (!this.options.skipBlockProcessing) {
                        this.blockHandler.handleBlockInv(payload);
                    }
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
        return (payload.length) ? new Message_1.MessageParser(payload).raw(8) || Buffer.from([]) : Buffer.from([]);
    };
    MessageHandlers.prototype.handleNotFound = function (payload) {
        var count = payload.readUInt8(0);
        payload = payload.slice(1);
        if (count >= 0xfd) {
            count = payload.readUInt16LE(0);
            payload = payload.slice(2);
        }
        var type;
        var hash;
        var mp = new Message_1.MessageParser(payload);
        try {
            type = mp.readUInt32LE() || 0;
        }
        catch (e) {
        }
        var object = {
            count: count,
            type: type
        };
        switch (type) {
            case this.invCodes.tx:
                var hashBytesTx = mp.raw(32) || Buffer.from([]);
                hash = hashBytesTx.reverse().toString('hex');
                object['hash'] = hash;
                break;
            case this.invCodes.block:
                var hashBytesBlock = mp.raw(32) || Buffer.from([]);
                hash = hashBytesBlock.reverse().toString('hex');
                object['hash'] = hash;
                break;
        }
        this.scope.events.fireNotFound(object);
    };
    return MessageHandlers;
}());
exports.MessageHandlers = MessageHandlers;
