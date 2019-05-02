"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
var crypto = require("crypto");
var crypto_binary_1 = require("crypto-binary");
// class imports
var general_util_1 = require("./util/general.util");
// testing flag
var ENV = process.env.NODE_ENV;
var ENVS = {
    test: 'test'
};
// general consts
var MINUTE = 60 * 1000;
var CONNECTION_RETRY = 5 * MINUTE;
var PING_INTERVAL = 5 * MINUTE;
var IPV6_IPV4_PADDING = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255]);
var EventDispatcher = /** @class */ (function () {
    function EventDispatcher() {
        this.handlers = [];
    }
    EventDispatcher.prototype.fire = function (event) {
        for (var _i = 0, _a = this.handlers; _i < _a.length; _i++) {
            var h = _a[_i];
            h(event);
        }
    };
    EventDispatcher.prototype.register = function (handler) {
        this.handlers.push(handler);
    };
    return EventDispatcher;
}());
var fixedLenStringBuffer = function (s, len) {
    var buff = Buffer.allocUnsafe(len);
    buff.fill(0);
    buff.write(s);
    return buff;
};
var commandStringBuffer = function (s) {
    return fixedLenStringBuffer(s, 12);
};
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
    return crypto.pseudoRandomBytes(8);
};
var BTCP2P = /** @class */ (function () {
    /**
     * @param options: StartOptions = {
     *  name: string,
     *  peerMagic: string,
     *  disableTransactions: boolean,
     *  host: string,
     *  port: number,
     *  listenPort: number,
     *  protocolVersion: number,
     *  persist: boolean
     * }
     */
    function BTCP2P(options) {
        var _this = this;
        this.options = options;
        this.util = new general_util_1.Utils();
        this.magicInt = 0;
        this.networkServices = Buffer.from('0100000000000000', 'hex'); //NODE_NETWORK services (value 1 packed as uint64)
        this.emptyNetAddress = Buffer.from('010000000000000000000000000000000000ffff000000000000', 'hex');
        this.userAgent = this.util.varStringBuffer('/btcp2p/');
        this.blockStartHeight = Buffer.from('00000000', 'hex'); //block start_height, can be empty
        //If protocol version is new enough, add do not relay transactions flag byte, outlined in BIP37
        //https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki#extensions-to-existing-messages
        this.relayTransactions = Buffer.from([0x00]); // false by default
        //https://en.bitcoin.it/wiki/Protocol_specification#Inventory_Vectors
        this.invCodes = {
            error: 0,
            tx: 1,
            block: 2,
            blockFiltered: 3,
            blockCompact: 4
        };
        this.verack = false;
        this.rejectedRetryMax = 3;
        this.rejectedRetryAttempts = 0;
        this.rejectedRetryPause = 2000;
        this.waitingForHeaders = false;
        //generalized vars
        this.validConnectionConfig = true;
        this.commands = {
            addr: commandStringBuffer('addr'),
            alert: commandStringBuffer('alert'),
            block: commandStringBuffer('block'),
            blocktxn: commandStringBuffer('blocktxn'),
            checkorder: commandStringBuffer('checkorder'),
            feefilter: commandStringBuffer('feefilter'),
            getaddr: commandStringBuffer('getaddr'),
            getblocks: commandStringBuffer('getblocks'),
            getblocktxn: commandStringBuffer('getblocktxn'),
            getdata: commandStringBuffer('getdata'),
            getheaders: commandStringBuffer('getheaders'),
            headers: commandStringBuffer('headers'),
            inv: commandStringBuffer('inv'),
            mempool: commandStringBuffer('mempool'),
            notfound: commandStringBuffer('notfound'),
            ping: commandStringBuffer('ping'),
            pong: commandStringBuffer('pong'),
            reject: commandStringBuffer('reject'),
            reply: commandStringBuffer('reply'),
            sendcmpct: commandStringBuffer('sendcmpct'),
            sendheaders: commandStringBuffer('sendheaders'),
            submitorder: commandStringBuffer('submitorder'),
            tx: commandStringBuffer('tx'),
            verack: commandStringBuffer('verack'),
            version: commandStringBuffer('version')
        };
        // events
        // connect
        this.connectDispatcher = new EventDispatcher();
        // disconnect
        this.disconnectDispatcher = new EventDispatcher();
        // connection rejected
        this.connectionRejectedDispatcher = new EventDispatcher();
        // error
        this.errorDispatcher = new EventDispatcher();
        // message
        this.sentMessageDispatcher = new EventDispatcher();
        // block notify
        this.blockNotifyDispatcher = new EventDispatcher();
        // tx notify
        this.txNotifyDispatcher = new EventDispatcher();
        // peer message
        this.peerMessageDispatcher = new EventDispatcher();
        // version message
        this.versionDispatcher = new EventDispatcher();
        this.magic = Buffer.from(options.peerMagic, 'hex');
        try {
            this.magicInt = this.magic.readUInt32LE(0);
        }
        catch (e) {
            this.fireError({ message: 'read peer magic failed in constructor' });
            return;
        }
        if (!options.disableTransactions) {
            this.relayTransactions = Buffer.from([]);
        }
        this.onConnectionRejected(function (event) {
            _this.fireError({ message: 'connection rejected, maybe banned, or old protocol version' });
            if (_this.options.persist) {
                // pause for 2 seconds, try again.
                if (_this.rejectedRetryAttempts < _this.rejectedRetryMax) {
                    _this.rejectedRetryAttempts++;
                    setTimeout(function () {
                        _this.connect();
                    }, _this.rejectedRetryPause);
                }
                else {
                    _this.fireError({ message: 'max rejected retries hit (' + _this.rejectedRetryMax + ')' });
                }
            }
        });
        this.onDisconnect(function (event) {
            _this.verack = false;
            if (_this.options.persist) {
                _this.connect();
            }
        });
        this.client = this.connect(this.options.host, this.options.port);
        this.setupMessageParser(this.client);
    }
    BTCP2P.prototype.onConnect = function (handler) {
        this.connectDispatcher.register(handler);
    };
    BTCP2P.prototype.fireConnect = function (event) {
        this.connectDispatcher.fire(event);
    };
    BTCP2P.prototype.onDisconnect = function (handler) {
        this.disconnectDispatcher.register(handler);
    };
    BTCP2P.prototype.fireDisconnect = function (event) {
        this.disconnectDispatcher.fire(event);
    };
    BTCP2P.prototype.onConnectionRejected = function (handler) {
        this.connectionRejectedDispatcher.register(handler);
    };
    BTCP2P.prototype.fireConnectionRejected = function (event) {
        this.connectionRejectedDispatcher.fire(event);
    };
    BTCP2P.prototype.onError = function (handler) {
        this.errorDispatcher.register(handler);
    };
    BTCP2P.prototype.fireError = function (event) {
        this.errorDispatcher.fire(event);
    };
    BTCP2P.prototype.onSentMessage = function (handler) {
        this.sentMessageDispatcher.register(handler);
    };
    BTCP2P.prototype.fireSentMessage = function (event) {
        this.sentMessageDispatcher.fire(event);
    };
    BTCP2P.prototype.onBlockNotify = function (handler) {
        this.blockNotifyDispatcher.register(handler);
    };
    BTCP2P.prototype.fireBlockNotify = function (event) {
        this.blockNotifyDispatcher.fire(event);
    };
    BTCP2P.prototype.onTxNotify = function (handler) {
        this.txNotifyDispatcher.register(handler);
    };
    BTCP2P.prototype.fireTxNotify = function (event) {
        this.txNotifyDispatcher.fire(event);
    };
    BTCP2P.prototype.onPeerMessage = function (handler) {
        this.peerMessageDispatcher.register(handler);
    };
    BTCP2P.prototype.firePeerMessage = function (event) {
        this.peerMessageDispatcher.fire(event);
    };
    BTCP2P.prototype.onVersion = function (handler) {
        this.versionDispatcher.register(handler);
    };
    BTCP2P.prototype.fireVersion = function (event) {
        this.versionDispatcher.fire(event);
    };
    // event handlers
    BTCP2P.prototype.on = function (event, handler) {
        switch (event) {
            case 'connect':
                this.onConnect(handler);
                break;
            case 'disconnect':
                this.onDisconnect(handler);
                break;
            case 'version':
                this.onVersion(handler);
                break;
            case 'error':
                this.onError(handler);
                break;
            case 'block':
                this.onBlockNotify(handler);
                break;
            case 'tx':
                this.onTxNotify(handler);
                break;
            case 'peer_message':
                this.onPeerMessage(handler);
                break;
            case 'sent_message':
                this.onSentMessage(handler);
                break;
            default:
                console.error('no event named', event);
                break;
        }
    };
    BTCP2P.prototype.startServer = function () {
        var _this = this;
        var server = net.createServer(function (socket) {
            socket.on('data', function (data) {
                console.log('local server:');
                console.log(data);
            });
        });
        return new Promise(function (resolve, reject) {
            server.listen(_this.options.listenPort, function () {
                resolve(true);
            });
        });
    };
    BTCP2P.prototype.connect = function (host, port) {
        var _this = this;
        if (host === void 0) { host = ''; }
        if (port === void 0) { port = 0; }
        var client = net.connect({
            host: (host === '') ? this.options.host : host,
            port: (port === 0) ? this.options.port : port
        }, function () {
            _this.rejectedRetryAttempts = 0;
            _this.sendVersion();
            _this.startPings();
        });
        client.on('close', function () {
            if (_this.verack) {
                _this.fireDisconnect({});
            }
            else if (_this.validConnectionConfig) {
                _this.fireConnectionRejected({});
            }
        });
        client.on('error', function (e) {
            if (e.code === 'ECONNREFUSED') {
                _this.fireError({ message: 'connection failed' });
            }
            else {
                _this.fireError({ message: 'socket error' });
            }
            if (_this.options.persist) {
                setTimeout(function () {
                    _this.connect();
                }, CONNECTION_RETRY);
            }
        });
        return client;
    };
    BTCP2P.prototype.sendVersion = function () {
        var payload = Buffer.concat([
            this.util.packUInt32LE(this.options.protocolVersion),
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
        this.fireSentMessage({ command: 'version' });
    };
    BTCP2P.prototype.setupMessageParser = function (client) {
        var _this = this;
        var beginReadingMessage = function (preRead) {
            readFlowingBytes(client, 24, preRead, function (header, lopped) {
                var msgMagic;
                try {
                    msgMagic = header.readUInt32LE(0);
                }
                catch (e) {
                    _this.fireError({ message: 'read peer magic failed in setupMessageParser' });
                    return;
                }
                if (msgMagic !== _this.magicInt) {
                    _this.fireError({ message: 'bad magic' });
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
                readFlowingBytes(client, msgLength, lopped, function (payload, lopped) {
                    if (_this.util.sha256d(payload).readUInt32LE(0) !== msgChecksum) {
                        _this.fireError({ message: 'bad payload - failed checksum' });
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
    BTCP2P.prototype.handleInv = function (payload) {
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
                this.firePeerMessage({ command: 'inv', payload: { type: type } });
            }
            switch (type) {
                case this.invCodes.error:
                    console.log('error, you can ignore this');
                    break;
                case this.invCodes.tx:
                    var tx = payload.slice(4, 36).toString('hex');
                    this.fireTxNotify({ hash: tx });
                    break;
                case this.invCodes.block:
                    var block = payload.slice(4, 36).reverse().toString('hex');
                    this.fireBlockNotify({ hash: block });
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
    BTCP2P.prototype.handleVersion = function (payload) {
        var s = new crypto_binary_1.MessageParser(payload);
        var parsed = {
            version: s.readUInt32LE(0),
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
        this.fireVersion(parsed);
    };
    BTCP2P.prototype.handleReject = function (payload) {
        console.log(payload);
    };
    BTCP2P.prototype.getHost = function (buff) {
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
    BTCP2P.prototype.getAddr = function (buff) {
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
            this.fireError({ message: 'address field length not 30', payload: buff });
        }
        return addr;
    };
    BTCP2P.prototype.handleAddr = function (payload) {
        var addrs = this.parseAddrMessage(payload);
        this.firePeerMessage({ command: 'addr', payload: { host: this.options.host, port: this.options.port, addresses: addrs } });
    };
    BTCP2P.prototype.parseAddrMessage = function (payload) {
        var s = new crypto_binary_1.MessageParser(payload);
        var addrs = [];
        var addrNum = s.readVarInt();
        for (var i = 0; i < addrNum; i++) {
            var addr = this.getAddr(s.raw(30));
            addrs.push(addr);
        }
        return addrs;
    };
    BTCP2P.prototype.startPings = function () {
        var _this = this;
        setInterval(function () {
            _this.sendPing();
        }, PING_INTERVAL);
    };
    BTCP2P.prototype.sendPing = function () {
        var payload = Buffer.concat([crypto.pseudoRandomBytes(8)]);
        this.sendMessage(this.commands.ping, payload);
        this.fireSentMessage({ command: 'ping' });
    };
    BTCP2P.prototype.handlePing = function (payload) {
        var nonce = '';
        var sendBack;
        if (payload.length) {
            nonce = new crypto_binary_1.MessageParser(payload).raw(8).toString('hex');
            // nonce = payload.readUInt16BE(0);
            // nonce += payload.readUInt16BE(2);
            // nonce += payload.readUInt16BE(4);
            // nonce += payload.readUInt16BE(6);
        }
        if (nonce !== '') {
            // sendBack = fixedLenStringBuffer(nonce, 8);
            sendBack = payload;
        }
        else {
            sendBack = Buffer.from([]);
        }
        // console.log(sendBack);
        this.sendMessage(this.commands.pong, sendBack);
        this.fireSentMessage({ command: 'pong', payload: { message: 'nonce: ' + nonce } });
    };
    BTCP2P.prototype.sendHeadersBack = function (payload) {
        this.sendMessage(this.commands.headers, payload);
        this.fireSentMessage({ command: 'headers', payload: {} });
    };
    BTCP2P.prototype.handleHeaders = function (payload) {
        this.headers = payload;
    };
    BTCP2P.prototype.handleHeaderRequest = function (payload) {
        if (this.headers === undefined) {
            this.waitingForHeaders = true;
            this.sendMessage(this.commands.getheaders, payload);
            this.fireSentMessage({ command: 'getheaders', payload: {} });
        }
        else {
            this.sendHeadersBack(this.headers);
        }
    };
    BTCP2P.prototype.handleMessage = function (command, payload) {
        this.firePeerMessage({ command: command });
        // console.log(payload);
        switch (command) {
            case this.commands.ping.toString():
                this.handlePing(payload);
                break;
            case this.commands.inv.toString():
                this.handleInv(payload);
                break;
            case this.commands.addr.toString():
                this.handleAddr(payload);
                break;
            case this.commands.verack.toString():
                if (!this.verack) {
                    this.verack = true;
                    this.fireConnect({});
                }
                break;
            case this.commands.version.toString():
                this.sendMessage(this.commands.verack, Buffer.from([]));
                this.fireSentMessage({ command: 'verack' });
                this.handleVersion(payload);
                break;
            case this.commands.reject.toString():
                this.handleReject(payload);
                break;
            case this.commands.getheaders.toString():
                this.handleHeaderRequest(payload);
                break;
            case this.commands.headers.toString():
                if (this.waitingForHeaders) {
                    this.headers = payload;
                    this.waitingForHeaders = false;
                    this.sendHeadersBack(payload);
                }
                else {
                    this.handleHeaders(payload);
                }
                break;
            default:
                // nothing
                break;
        }
    };
    BTCP2P.prototype.sendMessage = function (command, payload) {
        var message = Buffer.concat([
            this.magic,
            command,
            this.util.packUInt32LE(payload.length),
            this.util.sha256d(payload).slice(0, 4),
            payload
        ]);
        this.client.write(message);
    };
    BTCP2P.prototype.internal = function () {
        if (ENV === ENVS.test) {
            return {
                commandStringBuffer: commandStringBuffer,
                readFlowingBytes: readFlowingBytes
            };
        }
        else {
            return null;
        }
    };
    return BTCP2P;
}());
exports.BTCP2P = BTCP2P;
