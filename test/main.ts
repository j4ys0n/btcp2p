const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { BTCP2P } from '../lib/btcp2p';
import { ConnectEvent, DisconnectEvent } from '../lib/interfaces/events.interface'

// const net = require('net');
import * as net from 'net'

const unitTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  disableTransactions: true,
  connectHost: 'localhost',
  connectPort: 3003,
  listenPort: 3003,
  protocolVersion: 70015,
  persist: false
};

const integrationTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  disableTransactions: true,
  connectHost: '34.201.114.34',
  connectPort: 9333,
  protocolVersion: 70015,
  persist: false
};

describe('Unit tests', () => {
  let btcp2p: BTCP2P;
  let server: net.Server;
  before((done) => {
    btcp2p = new BTCP2P(unitTestOptions);
    btcp2p.startServer()
    .then(() => {
      done();
    })
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
    btcp2p.stopServer();
  });
});

describe('Integration Tests', () => {
  let btcp2p: BTCP2P;
  describe('functional methods', () => {
    it('should connect to litecoin, then disconnect', (done) => {
      btcp2p = new BTCP2P(integrationTestOptions);
      btcp2p.on('connect', (e: ConnectEvent) => {
        btcp2p.client.end();
      });
      btcp2p.on('disconnect', (e: DisconnectEvent) => {
        done();
      });
    });
  });

  after(() => {
    btcp2p.client.destroy();
  });
});
