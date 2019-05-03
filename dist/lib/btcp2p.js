"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
// class imports
var events_1 = require("./events/events");
var general_util_1 = require("./util/general.util");
var message_1 = require("./message/message");
// testing flag
var ENV = process.env.NODE_ENV;
var ENVS = {
    test: 'test'
};
// general consts
var MINUTE = 60 * 1000;
var BTCP2P = /** @class */ (function () {
    /**
     * @param options: StartOptions = {
     *  name: string,
     *  peerMagic: string,
     *  relayTransactions: boolean,
     *  host: string,
     *  port: number,
     *  serverPort: number,
     *  startServer: boolean,
     *  protocolVersion: number,
     *  persist: boolean
     * }
     */
    function BTCP2P(options) {
        var _this = this;
        this.options = options;
        this.serverStarting = false;
        this.serverStarted = false;
        // separate event handlers for client and server (internal & external)
        this.clientEvents = new events_1.Events();
        // protected internalClientEvents: Events = new Events();
        this.serverEvents = new events_1.Events(true);
        // protected internalServerEvents: Events = new Events(true);
        // expose events to listen to for client and server
        this.onClient = this.clientEvents.on.bind(this.clientEvents);
        this.onServer = this.serverEvents.on.bind(this.serverEvents);
        this.util = new general_util_1.Utils();
        this.pingInterval = 5 * MINUTE;
        // if the remote peer acknowledges the version (verack), it can be considered connected
        this.clientConnected = false;
        this.serverConnected = false;
        this.clientEventHandlersAdded = false;
        this.rejectedRetryPause = MINUTE; // on disctonnect/reject
        this.errorRetryPause = 3 * MINUTE; // on node crash/restart
        this.waitingForHeaders = false;
        this.validConnectionConfig = true;
        //
        this.message = new message_1.Message({
            magic: this.options.peerMagic,
            protocolVersion: this.options.protocolVersion,
            relayTransactions: this.options.relayTransactions
        });
        if (!!this.options.serverPort) {
            this.serverPort = this.options.serverPort;
        }
        else {
            this.serverPort = this.options.port;
        }
        this.clientEvents.onConnectionRejected(function (event) {
            _this.clientEvents.fireError({ message: 'connection rejected, maybe banned, or old protocol version' });
            _this.restartClient(_this.rejectedRetryPause);
        });
        this.clientEvents.onDisconnect(function (event) {
            _this.restartClient(_this.rejectedRetryPause);
        });
        // start server if necessary and init connection
        if (this.options.startServer) {
            this.server = net.createServer(function (socket) {
                _this.serverSocket = socket;
                _this.message.setupMessageParser(_this.serverEvents, socket);
                _this.serverEventHandlers(_this.serverEvents, socket);
            });
            this.startServer()
                .then(function () {
                _this.serverEvents.fireServerStart(true);
                _this.initConnection();
            });
        }
        else {
            // if no server to start, just init connection
            this.initConnection();
        }
    }
    BTCP2P.prototype.startServer = function () {
        var _this = this;
        // not started by default unless specified
        return new Promise(function (resolve, reject) {
            if (!_this.serverStarted && !_this.serverStarting) {
                _this.serverStarting = true;
                _this.server.listen(_this.serverPort, function () {
                    console.log('  local server listening on', _this.serverPort);
                    _this.serverStarting = false;
                    _this.serverStarted = true;
                    resolve(true);
                });
            }
            else {
                reject('server is either starting up or already started');
            }
        });
    };
    BTCP2P.prototype.stopServer = function () {
        this.server.close();
    };
    BTCP2P.prototype.initConnection = function () {
        this.client = this.connect(this.options.host, this.options.port);
        this.message.setupMessageParser(this.clientEvents, this.client);
        if (!this.clientEventHandlersAdded) {
            this.clientEventHandlers(this.clientEvents, this.client);
        }
    };
    BTCP2P.prototype.restartClient = function (wait) {
        if (this.options.persist && !this.clientConnected) {
            return this.initRestartClient(wait);
        }
        else {
            return Promise.resolve(false);
        }
    };
    BTCP2P.prototype.initRestartClient = function (wait) {
        var _this = this;
        this.clientConnected = false;
        this.client.end();
        this.client.destroy();
        clearInterval(this.pings);
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                _this.initConnection();
                resolve(true);
            }, wait);
        });
    };
    // client only
    BTCP2P.prototype.connect = function (host, port) {
        var _this = this;
        if (host === void 0) { host = ''; }
        if (port === void 0) { port = 0; }
        var client = net.connect({
            host: (host === '') ? this.options.host : host,
            port: (port === 0) ? this.options.port : port
        }, function () {
            _this.message.sendVersion(_this.clientEvents, client);
            _this.startPings(_this.clientEvents, client);
        });
        client.on('close', function () {
            if (_this.clientConnected) {
                _this.clientConnected = false;
                _this.clientEvents.fireDisconnect({});
            }
            else if (_this.validConnectionConfig) {
                _this.clientEvents.fireConnectionRejected({});
            }
        });
        client.on('error', function (e) {
            if (e.code === 'ECONNREFUSED') {
                _this.clientEvents.fireError({ message: 'connection failed' });
            }
            else {
                _this.clientEvents.fireError({ message: 'socket error' });
            }
            _this.restartClient(_this.errorRetryPause);
        });
        return client;
    };
    BTCP2P.prototype.clientEventHandlers = function (events, socket) {
        var _this = this;
        events.onVerack(function (e) {
            if (!_this.clientConnected) {
                _this.clientConnected = true;
                events.fireConnect({});
            }
        });
        events.onGetHeaders(function (payload) {
            if (!_this.headers) {
                _this.waitingForHeaders = true;
                _this.message.sendGetHeaders(payload.raw, events, socket);
            }
            else {
                _this.message.sendHeaders(_this.headers, events, socket);
            }
        });
        events.onHeaders(function (payload) {
            if (_this.waitingForHeaders) {
                _this.headers = payload.raw;
                _this.waitingForHeaders = false;
                _this.message.sendHeaders(payload.raw, events, socket);
            }
            else {
                _this.headers = payload.raw;
            }
        });
        this.clientEventHandlersAdded = true;
    };
    BTCP2P.prototype.serverEventHandlers = function (events, socket) {
        var _this = this;
        events.onVerack(function (e) {
            if (!_this.serverConnected) {
                _this.serverConnected = true;
                events.fireConnect({});
            }
        });
        events.onGetHeaders(function (payload) {
            if (!_this.headers) {
                _this.waitingForHeaders = true;
                _this.message.sendGetHeaders(payload.raw, events, socket);
            }
            else {
                _this.message.sendHeaders(_this.headers, events, socket);
            }
        });
        events.onHeaders(function (payload) {
            if (_this.waitingForHeaders) {
                _this.headers = payload.raw;
                _this.waitingForHeaders = false;
                _this.message.sendHeaders(payload.raw, events, socket);
            }
            else {
                _this.headers = payload.raw;
            }
        });
    };
    BTCP2P.prototype.startPings = function (events, socket) {
        var _this = this;
        clearInterval(this.pings);
        this.pings = setInterval(function () {
            _this.message.sendPing(events, socket);
        }, this.pingInterval);
    };
    return BTCP2P;
}());
exports.BTCP2P = BTCP2P;
