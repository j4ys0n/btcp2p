const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

const BTCP2P = require('../dist/btcp2p').BTCP2P;

const net = require('net');

const unitTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  disableTransactions: true,
  host: 'localhost',
  port: 3003,
  protocolVersion: 70015,
  persist: false
};

const integrationTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  disableTransactions: true,
  host: '34.201.114.34',
  port: 9333,
  protocolVersion: 70015,
  persist: false
};

describe('Unit tests', () => {
  let btcp2p;
  let server;
  before((done) => {
    server = net.createServer((socket) => {
      socket.on('data', (data) => {
        // console.log('local:', data);
      });
    });
    server.listen(unitTestOptions.port, () => {
      console.log('  local server listening on', unitTestOptions.port);
      btcp2p = new BTCP2P(unitTestOptions);
      done();
    });
  });

  describe('internal methods', () => {
    it('should convert command strings to a fixed length buffer', (done) => {
      const buff = btcp2p.internal().commandStringBuffer('block');
      const isBuffer = Buffer.isBuffer(buff);
      const bufferLen = buff.length;
      expect(isBuffer).to.be.true;
      expect(bufferLen).to.be.equal(12);
      done();
    });
  });

  after(() => {
    btcp2p.client.end();
    btcp2p.client.destroy();
    server.close();
  });
});

describe('Integration Tests', () => {
  let btcp2p;
  describe('functional methods', () => {
    it('should connect to litecoin, then disconnect', (done) => {
      btcp2p = new BTCP2P(integrationTestOptions);
      btcp2p.on('connect', (e) => {
        btcp2p.client.end();
      });
      btcp2p.on('disconnect', (e) => {
        done();
      });
    });
  });

  after(() => {
    btcp2p.client.destroy();
  });
});
