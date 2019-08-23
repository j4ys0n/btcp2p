"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var general_util_1 = require("../util/general.util");
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
    function Events(scope) {
        if (scope === void 0) { scope = { client: true, server: false }; }
        this.scope = scope;
        this.util = new general_util_1.Utils();
        this.scopedTo = '';
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
        this.blockDispatcher = new EventDispatcher();
        // block inv notify
        this.blockInvDispatcher = new EventDispatcher();
        // tx notify
        this.txDispatcher = new EventDispatcher();
        // tx inv notify
        this.txInvDispatcher = new EventDispatcher();
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
        this.scopedTo = (scope.client) ? 'client' : (scope.server) ? 'server' : 'internal';
        this.util.log('core', 'debug', 'initializing events for ' + this.scopedTo);
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
    Events.prototype.onBlock = function (handler) {
        this.blockDispatcher.register(handler);
    };
    Events.prototype.fireBlock = function (event) {
        this.blockDispatcher.fire(event);
    };
    Events.prototype.clearBlock = function () {
        this.blockDispatcher.clear();
    };
    Events.prototype.onBlockInv = function (handler) {
        this.blockInvDispatcher.register(handler);
    };
    Events.prototype.fireBlockInv = function (event) {
        this.blockInvDispatcher.fire(event);
    };
    Events.prototype.clearBlockInv = function () {
        this.blockInvDispatcher.clear();
    };
    Events.prototype.onTx = function (handler) {
        this.txDispatcher.register(handler);
    };
    Events.prototype.fireTx = function (event) {
        this.txDispatcher.fire(event);
    };
    Events.prototype.clearTx = function () {
        this.txDispatcher.clear();
    };
    Events.prototype.onTxInv = function (handler) {
        this.txInvDispatcher.register(handler);
    };
    Events.prototype.fireTxInv = function (event) {
        this.txInvDispatcher.fire(event);
    };
    Events.prototype.clearTxInv = function () {
        this.txInvDispatcher.clear();
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
        if (this.scope.server) {
            this.serverStartDispatcher.register(handler);
        }
    };
    Events.prototype.fireServerStart = function (event) {
        if (this.scope.server) {
            this.serverStartDispatcher.fire(event);
        }
    };
    Events.prototype.clearServerStart = function () {
        if (this.scope.server) {
            this.serverStartDispatcher.clear();
        }
    };
    Events.prototype.fire = function (event, payload) {
        var command = (payload.command) ? ' -->' + payload.command : '';
        this.util.log('core', 'debug', '[' + this.scopedTo + '] firing event for ' + event + command);
        var triggerMapping = {
            'connect': this.fireConnect,
            'connection_rejected': this.fireConnectionRejected,
            'disconnect': this.fireDisconnect,
            'version': this.fireVersion,
            'verack': this.fireVerack,
            'ping': this.firePing,
            'pong': this.firePong,
            'error': this.fireError,
            'reject': this.fireReject,
            'block': this.fireBlock,
            'blockinv': this.fireBlockInv,
            'tx': this.fireTx,
            'txinv': this.fireTxInv,
            'addr': this.fireAddr,
            'getheaders': this.fireGetHeaders,
            'headers': this.fireHeaders,
            'peer_message': this.firePeerMessage,
            'sent_message': this.fireSentMessage
        };
        var keys = Object.keys(triggerMapping);
        if (keys.indexOf(event) > -1) {
            var trigger = triggerMapping[event].bind(this);
            trigger(payload);
        }
        else {
            this.fireError({
                message: event + ' event does not exist',
                payload: new Error()
            });
        }
    };
    // event handlers
    Events.prototype.on = function (event, handler) {
        this.util.log('core', 'debug', '[' + this.scopedTo + '] adding event listener for ' + event);
        var handlerMapping = {
            'connect': this.onConnect,
            'connection_rejected': this.onConnectionRejected,
            'disconnect': this.onDisconnect,
            'version': this.onVersion,
            'verack': this.onVerack,
            'ping': this.onPing,
            'pong': this.onPong,
            'error': this.onError,
            'reject': this.onReject,
            'block': this.onBlock,
            'blockinv': this.onBlockInv,
            'tx': this.onTx,
            'txinv': this.onTxInv,
            'addr': this.onAddr,
            'getheaders': this.onGetHeaders,
            'headers': this.onHeaders,
            'peer_message': this.onPeerMessage,
            'sent_message': this.onSentMessage
        };
        var keys = Object.keys(handlerMapping);
        if (keys.indexOf(event) > -1) {
            var registerHandler = handlerMapping[event].bind(this);
            registerHandler(handler);
        }
        else {
            this.fireError({
                message: event + ' event does not exist',
                payload: new Error()
            });
        }
    };
    Events.prototype.clearAllListeners = function () {
        this.clearConnect();
        this.clearDisconnect();
        this.clearVersion();
        this.clearVerack();
        this.clearPing();
        this.clearPong();
        this.clearError();
        this.clearReject();
        this.clearBlock();
        this.clearTx();
        this.clearAddr();
        this.clearGetHeaders();
        this.clearPeerMessage();
        this.clearSentMessage();
    };
    return Events;
}());
exports.Events = Events;
