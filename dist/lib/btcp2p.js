"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
// class imports
var events_1 = require("./events/events");
var events_internal_1 = require("./events/events.internal");
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
        // separate scope package for client, server and internal
        this.clientEvents = new events_1.Events({ client: true, server: false });
        this.client = {
            events: this.clientEvents,
            on: this.clientEvents.on.bind(this.clientEvents),
            socket: this.clientSocket,
            message: this.message,
            connected: false
        };
        this.serverEvents = new events_1.Events({ client: false, server: true });
        this.server = {
            events: this.serverEvents,
            on: this.serverEvents.on.bind(this.serverEvents),
            socket: this.serverSocket,
            message: this.message,
            connected: false
        };
        this.internalEvents = new events_internal_1.InternalEvents({
            client: false,
            server: false,
            scopes: {
                clientEvents: this.clientEvents,
                serverEvents: this.serverEvents
            }
        });
        this.internal = {
            events: this.internalEvents,
            on: this.internalEvents.on.bind(this.internalEvents),
            socket: this.serverSocket,
            message: this.message,
            connected: false
        };
        // protected internalServerEvents: Events = new Events(true);
        // expose events to listen to for client and server
        // public onClient: Events['on'] = this.clientEvents.on.bind(this.clientEvents);
        // public onServer: Events['on'] = this.serverEvents.on.bind(this.serverEvents);
        this.util = new general_util_1.Utils();
        this.pingInterval = 5 * MINUTE;
        // if the remote peer acknowledges the version (verack), it can be considered connected
        this.internalScopeInit = false;
        this.serverScopeInit = false;
        this.clientScopeInit = false;
        this.rejectedRetryPause = MINUTE; // on disctonnect/reject
        this.errorRetryPause = 3 * MINUTE; // on node crash/restart
        this.waitingForHeaders = false;
        this.validConnectionConfig = true;
        if (!!this.options.serverPort) {
            this.serverPort = this.options.serverPort;
        }
        else {
            this.serverPort = this.options.port;
        }
        this.util.log('core', 'info', 'server port: ' + this.serverPort);
        this.clientEvents.on('connection_rejected', function (event) {
            _this.util.log('core', 'critical', 'connection rejected');
            _this.clientEvents.fire('error', { message: 'connection rejected, maybe banned, or old protocol version' });
            _this.restartClient(_this.rejectedRetryPause);
        });
        this.clientEvents.on('disconnect', function (event) {
            _this.util.log('core', 'warn', 'client disconnected');
            _this.restartClient(_this.rejectedRetryPause);
        });
        // start server if necessary and init connection
        if (this.options.startServer) {
            this.serverInstance = net.createServer(function (socket) {
                _this.util.log('core', 'debug', 'server created');
                _this.serverSocket = socket;
                _this.initInternalScope(_this.serverSocket);
                _this.initServerScope(_this.serverSocket);
            });
            this.startServer()
                .then(function () {
                _this.util.log('core', 'info', 'server listening on port ' + _this.serverPort);
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
                _this.util.log('core', 'info', 'server starting');
                _this.serverStarting = true;
                _this.serverInstance.listen(_this.serverPort, function () {
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
    BTCP2P.prototype.initInternalScope = function (socket) {
        // if (!this.internalScopeInit) {
        //   this.internalScopeInit = true;
        //   this.util.log('core', 'debug', 'initializing internal message & event handling');
        //   this.internal.socket = socket;
        //   this.internal.message = new Message({
        //     magic: this.options.peerMagic,
        //     protocolVersion: this.options.protocolVersion,
        //     relayTransactions: this.options.relayTransactions
        //   }, this.internal);
        //   this.internal.message.setupMessageParser();
        // } else {
        //   this.util.log('core', 'debug', 'internal message & event handling already instantiated');
        // }
    };
    BTCP2P.prototype.initServerScope = function (socket) {
        if (!this.serverScopeInit) {
            this.serverScopeInit = true;
            this.util.log('core', 'debug', 'initializing server message & event handling');
            this.server.socket = socket;
            this.server.message = new message_1.Message({
                magic: this.options.peerMagic,
                protocolVersion: this.options.protocolVersion,
                relayTransactions: this.options.relayTransactions
            }, this.server);
            this.server.message.setupMessageParser();
            this.initEventHandlers(this.server);
        }
        else {
            this.util.log('core', 'debug', 'server message & event handling already instantiated');
        }
    };
    BTCP2P.prototype.initClientScope = function (socket) {
        if (!this.clientScopeInit) {
            this.clientScopeInit = true;
            this.util.log('core', 'debug', 'initializing client message & event handling');
            this.client.socket = socket;
            this.client.message = new message_1.Message({
                magic: this.options.peerMagic,
                protocolVersion: this.options.protocolVersion,
                relayTransactions: this.options.relayTransactions
            }, this.client);
            this.client.message.setupMessageParser();
            this.initEventHandlers(this.client);
        }
        else {
            this.util.log('core', 'debug', 'client message & event handling already instantiated');
        }
    };
    BTCP2P.prototype.stopServer = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.util.log('core', 'info', 'server stopping');
            _this.serverInstance.on('close', function () {
                _this.util.log('core', 'info', 'server stopped');
                resolve();
            });
            _this.serverInstance.close();
        });
    };
    BTCP2P.prototype.initConnection = function () {
        var _this = this;
        this.connect(this.options.host, this.options.port)
            .then(function (response) {
            if (response.success) {
                _this.util.log('core', 'info', 'client connection successful');
                _this.clientSocket = response.socket;
                _this.initInternalScope(_this.clientSocket);
                _this.initClientScope(_this.clientSocket);
                _this.client.message.sendVersion();
            }
        });
    };
    BTCP2P.prototype.restartClient = function (wait) {
        if (this.options.persist && !this.client.connected) {
            return this.initRestartClient(wait);
        }
        else {
            return Promise.resolve(false);
        }
    };
    BTCP2P.prototype.initRestartClient = function (wait) {
        var _this = this;
        this.client.connected = false;
        this.clientSocket.end();
        this.clientSocket.destroy();
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
        return new Promise(function (resolve, reject) {
            var h = (host === '') ? _this.options.host : host;
            var p = (port === 0) ? _this.options.port : port;
            _this.util.log('core', 'info', 'attempting to connect to ' + h + ':' + p);
            var client = net.connect({ host: h, port: p }, function () {
                resolve({
                    success: true,
                    socket: client
                });
            });
            client.on('close', function () {
                if (_this.client.connected) {
                    _this.client.connected = false;
                    _this.clientEvents.fire('disconnect', {});
                }
                else if (_this.validConnectionConfig) {
                    _this.clientEvents.fire('connection_rejected', {});
                }
            });
            client.on('error', function (e) {
                if (e.code === 'ECONNREFUSED') {
                    _this.clientEvents.fire('error', { message: 'connection failed' });
                    resolve({
                        success: false,
                        socket: client
                    });
                }
                else {
                    _this.clientEvents.fire('error', { message: 'socket error' });
                }
                _this.restartClient(_this.errorRetryPause);
            });
        });
    };
    BTCP2P.prototype.initEventHandlers = function (scope) {
        var _this = this;
        scope.events.on('verack', function (e) {
            if (!scope.connected) {
                scope.connected = true;
                scope.events.fire('connect', {});
            }
        });
        scope.events.on('getheaders', function (payload) {
            if (!_this.headers) {
                _this.waitingForHeaders = true;
                scope.message.sendGetHeaders(payload.raw);
            }
            else {
                scope.message.sendHeaders(_this.headers);
            }
        });
        scope.events.on('headers', function (payload) {
            if (_this.waitingForHeaders) {
                _this.headers = payload.raw;
                _this.waitingForHeaders = false;
                scope.message.sendHeaders(payload.raw);
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
            _this.message.sendPing();
        }, this.pingInterval);
    };
    return BTCP2P;
}());
exports.BTCP2P = BTCP2P;
