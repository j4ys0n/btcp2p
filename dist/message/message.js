"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = __importStar(require("crypto"));
var Message_1 = require("../util/Message");
var message_consts_1 = require("./message.consts");
var general_util_1 = require("../util/general.util");
var message_handlers_1 = require("./message.handlers");
var block_handler_1 = require("../blocks/block-handler");
var transaction_handler_1 = require("../transactions/transaction-handler");
var peers_1 = require("../peers/peers");
var readFlowingBytes = function (stream, amount, preRead, callback) {
    var buff = (preRead) ? preRead : Buffer.from([]);
    var readData = function (data) {
        buff = Buffer.concat([buff, data]);
        if (buff.length >= amount) {
            var returnData = buff.slice(0, amount);
            var lopped = (buff.length > amount) ? buff.slice(amount) : null;
            callback(returnData, lopped);
        }
        else {
            stream.once('data', readData);
        }
    };
    readData(Buffer.from([]));
};
// TODO create nonce for sending with ping
var createNonce = function () {
    return crypto.randomBytes(8);
};
var IPV6_IPV4_PADDING = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
var Message = /** @class */ (function () {
    /**
     * @param messageOptions: MessageOptions = {
     *  magic: string,
     *  relayTransactions: boolean,
     *  protocolVersion: number,
     * }
     */
    function Message(options, scope, dbUtil) {
        this.options = options;
        this.scope = scope;
        this.dbUtil = dbUtil;
        this.util = new general_util_1.Utils();
        this.messageConsts = new message_consts_1.MessageConsts(this.util);
        this.magicInt = 0;
        // version message vars
        this.networkServices = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
        this.emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
        this.userAgent = this.util.varStringBuffer('/btcp2p/');
        this.blockStartHeight = Buffer.from('00000000', 'hex'); //block start_height, can be empty
        //If protocol version is new enough, add do not relay transactions flag byte, outlined in BIP37
        //https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki#extensions-to-existing-messages
        this.relayTransactions = Buffer.from('0x00', 'hex'); // false by default
        this.commands = this.messageConsts.commands;
        this.magic = Buffer.from(this.options.network.magic, 'hex');
        try {
            this.magicInt = this.magic.readUInt32LE(0);
        }
        catch (e) {
            throw new Error('read peer magic failed in constructor');
        }
        if (this.options.relayTransactions) {
            this.relayTransactions = Buffer.from('0x01', 'hex');
        }
        else {
            this.relayTransactions = Buffer.from('0x00', 'hex');
        }
        this.handlers = new message_handlers_1.MessageHandlers(this.scope, this.util, this.dbUtil, this.options);
        this.blockHandler = new block_handler_1.BlockHandler(this.scope, this.util, this.dbUtil, this.options);
        this.transactionHandler = new transaction_handler_1.TransactionHandler(this.scope, this.util, this.dbUtil, this.options);
        this.peerHandler = new peers_1.PeerHandler(this.scope);
    }
    Message.prototype.sendMessage = function (command, payload) {
        var message = Buffer.concat([
            this.magic,
            command,
            this.util.packUInt32LE(payload.length),
            this.util.sha256d(payload).slice(0, 4),
            payload
        ]);
        this.scope.socket.write(message);
    };
    Message.prototype.sendVersion = function () {
        // https://en.bitcoin.it/wiki/Protocol_documentation#version
        var payload = Buffer.concat([
            this.util.packUInt32LE(this.options.network.protocolVersion),
            this.networkServices,
            this.util.packInt64LE(Date.now() / 1000 | 0),
            this.emptyNetAddress,
            this.emptyNetAddress,
            createNonce(),
            this.userAgent,
            this.blockStartHeight,
            this.relayTransactions
        ]);
        this.sendMessage(this.commands.version, payload);
        this.scope.events.fire('sent_message', { command: 'version' });
    };
    Message.prototype.sendVerack = function () {
        // TODO lets actually check the version here instead of just confirming
        this.sendMessage(this.commands.verack, Buffer.from([]));
        this.scope.events.fire('sent_message', { command: 'verack' });
    };
    Message.prototype.sendPing = function () {
        var payload = Buffer.concat([crypto.randomBytes(8)]);
        this.sendMessage(this.commands.ping, payload);
        this.scope.events.fire('sent_message', { command: 'ping' });
    };
    Message.prototype.sendHeaders = function (payload) {
        this.sendMessage(this.commands.headers, payload);
        this.scope.events.fire('sent_message', { command: 'headers', payload: {} });
    };
    Message.prototype.sendGetHeaders = function (payload) {
        this.sendMessage(this.commands.getheaders, payload);
        this.scope.events.fire('sent_message', { command: 'getheaders', payload: {} });
    };
    Message.prototype.sendGetAddr = function () {
        this.sendMessage(this.commands.getaddr, Buffer.from([]));
        this.scope.events.fire('sent_message', { command: 'getaddr', payload: {} });
    };
    Message.prototype.sendGetBlocks = function (hash) {
        var hashCount = Buffer.from([0x01]);
        var headerHashes = Buffer.from(this.util.reverseHexBytes(hash), 'hex');
        var stopHash = Buffer.from(this.util.stopHash(32));
        var payload = Buffer.concat([
            this.util.packUInt32LE(this.options.network.protocolVersion),
            hashCount,
            headerHashes,
            stopHash
        ]);
        this.sendMessage(this.commands.getblocks, payload);
        this.scope.events.fire('sent_message', { command: 'getblocks', payload: {} });
    };
    Message.prototype.sendGetData = function (payload) {
        this.sendMessage(this.commands.getdata, payload);
        this.scope.events.fire('sent_message', { command: 'getdata', payload: payload });
    };
    Message.prototype.sendAddr = function (ip, port) {
        var count = Buffer.from([0x01]);
        var date = this.util.packUInt32LE(Date.now() / 1000 | 0);
        var host = this.ipTo16ByteBuffer(ip);
        var prt = this.util.packUInt16BE(port);
        var payload = Buffer.concat([
            count, date, this.networkServices, host, prt
        ]);
        this.sendMessage(this.commands.addr, payload);
        this.scope.events.fire('sent_message', { command: 'getaddr', payload: payload });
    };
    Message.prototype.sendReject = function (msg, ccode, reason, extra) {
        var msgBytes = msg.length;
        var reasonBytes = reason.length;
        var extraBytes = extra.length;
        var len = 1 + msgBytes + 1 + 1 + reasonBytes + extraBytes;
        var message = new Message_1.MessageBuilder(len);
        message.putInt8(msgBytes);
        message.putString(msg);
        message.putInt8(ccode);
        message.putInt8(reasonBytes);
        message.putString(reason);
        message.putString(extra);
        this.sendMessage(this.commands.reject, message.buffer);
    };
    Message.prototype.setupMessageParser = function () {
        var _this = this;
        var beginReadingMessage = function (preRead) {
            readFlowingBytes(_this.scope.socket, 24, preRead, function (header, lopped) {
                var msgMagic;
                try {
                    msgMagic = header.readUInt32LE(0);
                }
                catch (e) {
                    _this.scope.events.fire('error', { message: 'read peer magic failed in setupMessageParser' });
                    return;
                }
                if (msgMagic !== _this.magicInt) {
                    _this.scope.events.fire('error', { message: 'bad magic' });
                    try {
                        while (header.readUInt32LE(0) !== _this.magicInt && header.length >= 4) {
                            header = header.slice(1);
                        }
                        if (header.readUInt32LE(0) === _this.magicInt) {
                            beginReadingMessage(header);
                        }
                        else {
                            beginReadingMessage(Buffer.from([]));
                        }
                    }
                    catch (e) {
                        // TODO: fix this
                        // related to parsing new segwit transactions?
                        // https://github.com/bitpay/insight/issues/842
                        // add rpcserialversion=0 to wallet .conf file
                    }
                    return;
                }
                var msgCommand = header.slice(4, 16).toString();
                var msgLength = header.readUInt32LE(16);
                var msgChecksum = header.readUInt32LE(20);
                // console.log('--', msgCommand, '--', header);
                readFlowingBytes(_this.scope.socket, msgLength, lopped, function (payload, lopped) {
                    if (_this.util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
                        _this.scope.events.fire('error', { message: 'bad payload - failed checksum' });
                        // beginReadingMessage(null); // TODO do we need this?
                        return;
                    }
                    _this.handleMessage(msgCommand, payload);
                    beginReadingMessage(lopped);
                });
            });
        };
        beginReadingMessage(Buffer.from([]));
    };
    Message.prototype.ipTo16ByteBuffer = function (ip) {
        var ipv4Addr = ip.split('.').map(function (segment) {
            return parseInt(segment, 10);
        });
        var ipv6Padded = [
            IPV6_IPV4_PADDING,
            Buffer.from(ipv4Addr)
        ];
        return Buffer.concat(ipv6Padded);
    };
    Message.prototype.handleMessage = function (command, payload) {
        var _this = this;
        this.scope.events.fire('peer_message', { command: command });
        // console.log(payload);
        switch (command) {
            case this.commands.verack.toString():
                this.scope.events.fire('verack', true);
                break;
            case this.commands.version.toString():
                this.handlers.handleVersion(payload)
                    .then(function (version) {
                    _this.sendVerack();
                });
                break;
            case this.commands.ping.toString():
                this.handlers.handlePing(payload)
                    .then(function (ping) {
                    // send pong
                    _this.sendMessage(_this.commands.pong, ping.nonce);
                    _this.scope.events.fire('sent_message', { command: 'pong', payload: {
                            message: 'nonce: ' + ping.nonce.toString('hex')
                        } });
                });
                break;
            case this.commands.pong.toString():
                this.handlers.handlePong(payload);
                break;
            case this.commands.inv.toString():
                this.handlers.handleInv(payload);
                break;
            case this.commands.addr.toString():
                this.peerHandler.handleAddr(payload);
                break;
            case this.commands.reject.toString():
                this.handlers.handleReject(payload);
                break;
            case this.commands.getheaders.toString():
                this.blockHandler.handleGetHeaders(payload);
                break;
            case this.commands.headers.toString():
                this.blockHandler.handleHeaders(payload);
                break;
            case this.commands.block.toString():
                this.blockHandler.handleBlock(payload);
                break;
            case this.commands.tx.toString():
                this.transactionHandler.handleTransaction(payload);
                break;
            case this.commands.notfound.toString():
                this.handlers.handleNotFound(payload);
                break;
            case this.commands.sendheaders.toString():
                // TODO
                break;
            default:
                // nothing
                this.scope.events.fire('error', {
                    message: 'unhandled peer message ' + command,
                    payload: payload
                });
                break;
        }
    };
    return Message;
}());
exports.Message = Message;
