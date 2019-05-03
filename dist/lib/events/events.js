"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    EventDispatcher.prototype.clear = function () {
        this.handlers = [];
    };
    return EventDispatcher;
}());
var Events = /** @class */ (function () {
    function Events(server) {
        if (server === void 0) { server = false; }
        this.server = server;
        // connect
        this.connectDispatcher = new EventDispatcher();
        // disconnect
        this.disconnectDispatcher = new EventDispatcher();
        // connection rejected
        this.connectionRejectedDispatcher = new EventDispatcher();
        // error
        this.errorDispatcher = new EventDispatcher();
        // error
        this.rejectDispatcher = new EventDispatcher();
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
        // version message
        this.verackDispatcher = new EventDispatcher();
        // ping
        this.pingDispatcher = new EventDispatcher();
        // pong
        this.pongDispatcher = new EventDispatcher();
        // addresses received
        this.addrDispatcher = new EventDispatcher();
        // headers requested (getheaders)
        this.getHeadersDispatcher = new EventDispatcher();
        // headers send (headers)
        this.headersDispatcher = new EventDispatcher();
        // server only events
        this.serverStartDispatcher = new EventDispatcher();
    }
    Events.prototype.onConnect = function (handler) {
        this.connectDispatcher.register(handler);
    };
    Events.prototype.fireConnect = function (event) {
        this.connectDispatcher.fire(event);
    };
    Events.prototype.clearConnect = function () {
        this.connectDispatcher.clear();
    };
    Events.prototype.onDisconnect = function (handler) {
        this.disconnectDispatcher.register(handler);
    };
    Events.prototype.fireDisconnect = function (event) {
        this.disconnectDispatcher.fire(event);
    };
    Events.prototype.clearDisconnect = function () {
        this.disconnectDispatcher.clear();
    };
    Events.prototype.onConnectionRejected = function (handler) {
        this.connectionRejectedDispatcher.register(handler);
    };
    Events.prototype.fireConnectionRejected = function (event) {
        this.connectionRejectedDispatcher.fire(event);
    };
    Events.prototype.clearConnectionRejected = function () {
        this.connectionRejectedDispatcher.clear();
    };
    Events.prototype.onError = function (handler) {
        this.errorDispatcher.register(handler);
    };
    Events.prototype.fireError = function (event) {
        this.errorDispatcher.fire(event);
    };
    Events.prototype.clearError = function () {
        this.errorDispatcher.clear();
    };
    Events.prototype.onReject = function (handler) {
        this.rejectDispatcher.register(handler);
    };
    Events.prototype.fireReject = function (event) {
        this.rejectDispatcher.fire(event);
    };
    Events.prototype.clearReject = function () {
        this.rejectDispatcher.clear();
    };
    Events.prototype.onSentMessage = function (handler) {
        this.sentMessageDispatcher.register(handler);
    };
    Events.prototype.fireSentMessage = function (event) {
        this.sentMessageDispatcher.fire(event);
    };
    Events.prototype.clearSentMessage = function () {
        this.sentMessageDispatcher.clear();
    };
    Events.prototype.onBlockNotify = function (handler) {
        this.blockNotifyDispatcher.register(handler);
    };
    Events.prototype.fireBlockNotify = function (event) {
        this.blockNotifyDispatcher.fire(event);
    };
    Events.prototype.clearBlockNotify = function () {
        this.blockNotifyDispatcher.clear();
    };
    Events.prototype.onTxNotify = function (handler) {
        this.txNotifyDispatcher.register(handler);
    };
    Events.prototype.fireTxNotify = function (event) {
        this.txNotifyDispatcher.fire(event);
    };
    Events.prototype.clearTxNotify = function () {
        this.txNotifyDispatcher.clear();
    };
    Events.prototype.onPeerMessage = function (handler) {
        this.peerMessageDispatcher.register(handler);
    };
    Events.prototype.firePeerMessage = function (event) {
        this.peerMessageDispatcher.fire(event);
    };
    Events.prototype.clearPeerMessage = function () {
        this.peerMessageDispatcher.clear();
    };
    Events.prototype.onVersion = function (handler) {
        this.versionDispatcher.register(handler);
    };
    Events.prototype.fireVersion = function (event) {
        this.versionDispatcher.fire(event);
    };
    Events.prototype.clearVersion = function () {
        this.versionDispatcher.clear();
    };
    Events.prototype.onVerack = function (handler) {
        this.verackDispatcher.register(handler);
    };
    Events.prototype.fireVerack = function (event) {
        this.verackDispatcher.fire(event);
    };
    Events.prototype.clearVerack = function () {
        this.verackDispatcher.clear();
    };
    Events.prototype.onPing = function (handler) {
        this.pingDispatcher.register(handler);
    };
    Events.prototype.firePing = function (event) {
        this.pingDispatcher.fire(event);
    };
    Events.prototype.clearPing = function () {
        this.pingDispatcher.clear();
    };
    Events.prototype.onPong = function (handler) {
        this.pongDispatcher.register(handler);
    };
    Events.prototype.firePong = function (event) {
        this.pongDispatcher.fire(event);
    };
    Events.prototype.clearPong = function () {
        this.pongDispatcher.clear();
    };
    Events.prototype.onAddr = function (handler) {
        this.addrDispatcher.register(handler);
    };
    Events.prototype.fireAddr = function (event) {
        this.addrDispatcher.fire(event);
    };
    Events.prototype.clearAddr = function () {
        this.addrDispatcher.clear();
    };
    Events.prototype.onGetHeaders = function (handler) {
        this.getHeadersDispatcher.register(handler);
    };
    Events.prototype.fireGetHeaders = function (event) {
        this.getHeadersDispatcher.fire(event);
    };
    Events.prototype.clearGetHeaders = function () {
        this.getHeadersDispatcher.clear();
    };
    Events.prototype.onHeaders = function (handler) {
        this.headersDispatcher.register(handler);
    };
    Events.prototype.fireHeaders = function (event) {
        this.headersDispatcher.fire(event);
    };
    Events.prototype.clearHeaders = function () {
        this.headersDispatcher.clear();
    };
    Events.prototype.onServerStart = function (handler) {
        if (this.server) {
            this.serverStartDispatcher.register(handler);
        }
    };
    Events.prototype.fireServerStart = function (event) {
        if (this.server) {
            this.serverStartDispatcher.fire(event);
        }
    };
    Events.prototype.clearServerStart = function () {
        if (this.server) {
            this.serverStartDispatcher.clear();
        }
    };
    // event handlers
    Events.prototype.on = function (event, handler) {
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
            case 'verack':
                this.onVerack(handler);
                break;
            case 'ping':
                this.onPing(handler);
                break;
            case 'pong':
                this.onPong(handler);
                break;
            case 'error':
                this.onError(handler);
                break;
            case 'reject':
                this.onReject(handler);
                break;
            case 'block':
                this.onBlockNotify(handler);
                break;
            case 'tx':
                this.onTxNotify(handler);
                break;
            case 'addr':
                this.onAddr(handler);
                break;
            case 'getheaders':
                this.onGetHeaders(handler);
                break;
            case 'peer_message':
                this.onPeerMessage(handler);
                break;
            case 'sent_message':
                this.onSentMessage(handler);
                break;
            default:
                this.fireError({
                    message: event + ' event does not exist',
                    payload: new Error()
                });
                break;
        }
    };
    return Events;
}());
exports.Events = Events;
