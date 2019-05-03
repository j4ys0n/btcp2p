"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var btcp2p_1 = require("../lib/btcp2p");
var unitTestOptions = {
    name: 'litecoin',
    peerMagic: 'fbc0b6db',
    relayTransactions: false,
    host: 'localhost',
    port: 3003,
    serverPort: 3003,
    startServer: true,
    protocolVersion: 70015,
    persist: false
};
var integrationTestOptions = {
    name: 'litecoin',
    peerMagic: 'fbc0b6db',
    relayTransactions: false,
    host: '34.201.114.34',
    port: 9333,
    startServer: false,
    protocolVersion: 70015,
    persist: false
};
var BTCP2PTest = /** @class */ (function (_super) {
    __extends(BTCP2PTest, _super);
    function BTCP2PTest() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BTCP2PTest;
}(btcp2p_1.BTCP2P));
describe('Unit tests', function () {
    var btcp2p;
    before(function (done) {
        btcp2p = new BTCP2PTest(unitTestOptions);
        btcp2p.serverEvents.onServerStart(function () {
            btcp2p.serverEvents.clearServerStart();
            done();
        });
    });
    describe('internal methods', function () {
        it('should convert command strings to a fixed length buffer', function (done) {
            var buff = btcp2p.util.commandStringBuffer('block');
            var isBuffer = Buffer.isBuffer(buff);
            var bufferLen = buff.length;
            expect(isBuffer).to.be.true;
            expect(bufferLen).to.be.equal(12);
            done();
        });
    });
    describe('events', function () {
        it('should throw error when trying to listen for non-existent event', function (done) {
            btcp2p.onClient('error', function (error) {
                expect(error.message).to.be.equal('badevent event does not exist');
                done();
            });
            btcp2p.onClient('badevent', function (response) {
                // should fire error
            });
        });
        it('client should send event for sent_message when message sent (version)', function (done) {
            btcp2p.onClient('sent_message', function (msg) {
                btcp2p.clientEvents.clearSentMessage();
                expect(msg.command).to.be.equal('version');
                done();
            });
            btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
        });
        it('server should send event for peer_message when message received (version)', function (done) {
            btcp2p.onServer('peer_message', function (msg) {
                btcp2p.serverEvents.clearPeerMessage();
                expect(msg.command).to.be.equal(btcp2p.message.commands.version.toString());
                done();
            });
            btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
        });
        it('server should get version when client sends version', function (done) {
            btcp2p.onServer('version', function () {
                btcp2p.serverEvents.clearVersion();
                done();
            });
            btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
        });
        it('client should get verack when client sends version', function (done) {
            btcp2p.onClient('verack', function () {
                btcp2p.clientEvents.clearVerack();
                done();
            });
            btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
        });
        it('client should fire reject event when server sends reject message', function (done) {
            var msg = 'block';
            var ccode = 0x01;
            var name = 'REJECT_MALFORMED';
            var reason = 'bad command - malformed';
            var extra = 'asdfghjkl';
            btcp2p.onClient('reject', function (rejected) {
                btcp2p.clientEvents.clearReject();
                expect(rejected.message).to.be.equal(msg);
                expect(rejected.ccode).to.be.equal(ccode);
                expect(rejected.name).to.be.equal(name);
                expect(rejected.reason).to.be.equal(reason);
                expect(rejected.extra).to.be.equal(extra);
                done();
            });
            btcp2p.message.sendReject(msg, ccode, reason, extra, btcp2p.serverSocket);
        });
        it('server should get ping and client should get pong with matching nonce when client sends ping', function (done) {
            var pingNonce;
            var pongNonce;
            var checkNonces = function () {
                if (pingNonce !== undefined && pongNonce !== undefined) {
                    if (pingNonce.toString('hex') === pongNonce.toString('hex')) {
                        done();
                    }
                    else {
                        done(new Error('nonces should match'));
                    }
                }
            };
            btcp2p.onServer('ping', function (nonce) {
                btcp2p.serverEvents.clearPing();
                pingNonce = nonce;
                checkNonces();
            });
            btcp2p.onClient('pong', function (nonce) {
                btcp2p.serverEvents.clearPong();
                pongNonce = nonce;
                checkNonces();
            });
            btcp2p.message.sendPing(btcp2p.clientEvents, btcp2p.client);
        });
        it('server should get address when client sends address', function (done) {
            var ip = '192.0.2.51';
            var port = unitTestOptions.port;
            btcp2p.onServer('addr', function (payload) {
                btcp2p.serverEvents.clearAddr();
                // console.log(payload);
                var firstAddr = payload.addresses[0];
                expect(firstAddr.host).to.be.equal(ip);
                expect(firstAddr.port).to.be.equal(port);
                done();
            });
            btcp2p.message.sendAddr(btcp2p.clientEvents, btcp2p.client, ip, port);
        });
    });
    after(function () {
        btcp2p.client.end();
        btcp2p.client.destroy();
        btcp2p.stopServer();
    });
});
describe('Integration Tests', function () {
    var btcp2p;
    // before((done) => {
    //   btcp2p = new BTCP2PTest(integrationTestOptions);
    //   done();
    // })
    it('should connect to litecoin, request blocks, then disconnect', function (done) {
        btcp2p = new BTCP2PTest(integrationTestOptions);
        var nextHash = '';
        // btcp2p.onClient('peer_message', (e: PeerMessageEvent) => {
        //   console.log(e);
        // });
        btcp2p.onClient('block', function (e) {
            btcp2p.clientEvents.clearBlockNotify();
            expect(e.hash).to.be.equal(nextHash);
            btcp2p.client.end();
        });
        btcp2p.onClient('getheaders', function (e) {
            btcp2p.clientEvents.clearGetHeaders();
            // console.log(e);
            nextHash = e.parsed.hashes[0];
            btcp2p.message.sendGetBlocks(btcp2p.clientEvents, btcp2p.client, e.parsed.hashes[1]);
            // done();
        });
        btcp2p.onClient('connect', function (e) {
            btcp2p.clientEvents.clearConnect();
            // setTimeout(() => {
            //   btcp2p.client.end();
            // }, 2000);
        });
        btcp2p.onClient('disconnect', function (e) {
            btcp2p.clientEvents.clearDisconnect();
            done();
        });
    });
    // it('should connect to litecoin, get addresses then disconnect', (done) => {
    //   btcp2p = new BTCP2PTest(integrationTestOptions);
    //
    //   btcp2p.onClient('peer_message', (e: PeerMessageEvent) => {
    //     console.log(e);
    //   });
    //   btcp2p.onClient('connect', (e: ConnectEvent) => {
    //     btcp2p.message.sendGetAddr(btcp2p.clientEvents, btcp2p.client);
    //   });
    //   btcp2p.onClient('addr', (e) => {
    //     btcp2p.client.end();
    //   })
    //   btcp2p.onClient('disconnect', (e: DisconnectEvent) => {
    //     done();
    //   });
    // });
    after(function () {
        btcp2p.client.destroy();
    });
});
