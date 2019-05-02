"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var btcp2p_1 = require("../lib/btcp2p");
// const net = require('net');
var net = require("net");
var unitTestOptions = {
    name: 'litecoin',
    peerMagic: 'fbc0b6db',
    disableTransactions: true,
    host: 'localhost',
    port: 3003,
    protocolVersion: 70015,
    persist: false
};
var integrationTestOptions = {
    name: 'litecoin',
    peerMagic: 'fbc0b6db',
    disableTransactions: true,
    host: '34.201.114.34',
    port: 9333,
    protocolVersion: 70015,
    persist: false
};
describe('Unit tests', function () {
    var btcp2p;
    var server;
    before(function (done) {
        server = net.createServer(function (socket) {
            socket.on('data', function (data) {
                console.log('local:', data);
            });
        });
        server.listen(unitTestOptions.port, function () {
            console.log('  local server listening on', unitTestOptions.port);
            btcp2p = new btcp2p_1.BTCP2P(unitTestOptions);
            done();
        });
    });
    describe('internal methods', function () {
        it('should convert command strings to a fixed length buffer', function (done) {
            var buff = btcp2p.internal().commandStringBuffer('block');
            var isBuffer = Buffer.isBuffer(buff);
            var bufferLen = buff.length;
            expect(isBuffer).to.be.true;
            expect(bufferLen).to.be.equal(12);
            done();
        });
    });
    after(function () {
        btcp2p.client.end();
        btcp2p.client.destroy();
        server.close();
    });
});
describe('Integration Tests', function () {
    var btcp2p;
    describe('functional methods', function () {
        it('should connect to litecoin, then disconnect', function (done) {
            btcp2p = new btcp2p_1.BTCP2P(integrationTestOptions);
            btcp2p.on('connect', function (e) {
                btcp2p.client.end();
            });
            btcp2p.on('disconnect', function (e) {
                done();
            });
        });
    });
    after(function () {
        btcp2p.client.destroy();
    });
});
