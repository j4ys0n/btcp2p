const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import * as net from 'net';

import { BTCP2P } from '../lib/btcp2p';
import { Events } from '../lib/events/events';
import { ConnectEvent, DisconnectEvent } from '../lib/interfaces/events.interface'


const unitTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  disableTransactions: true,
  host: 'localhost',
  port: 3003,
  listenPort: 3003,
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

class BTCP2PTest extends BTCP2P {
  public clientEvents;
  public serverEvents;
  public util;

  public sendPing(events: Events, socket: net.Socket): void {
    super.sendPing(events, socket);
  }
  public sendVersion(events: Events, socket: net.Socket): void {
    super.sendVersion(events, socket);
  }
  public sendMessage
}

describe('Unit tests', () => {
  let btcp2p: BTCP2PTest;
  before((done) => {
    btcp2p = new BTCP2PTest(unitTestOptions);
    btcp2p.startServer()
    .then(() => {
      done();
    })
  });

  describe('internal methods', () => {
    it('should convert command strings to a fixed length buffer', (done) => {
      const buff = btcp2p.util.commandStringBuffer('block');
      const isBuffer = Buffer.isBuffer(buff);
      const bufferLen = buff.length;
      expect(isBuffer).to.be.true;
      expect(bufferLen).to.be.equal(12);
      done();
    });
  });

  describe('events', () => {
    it('server should get version when client sends version', (done) => {
      btcp2p.onServer('version', () => {
        btcp2p.serverEvents.clearVersion();
        done();
      });
      btcp2p.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });

    it('client should get verack when client sends version', (done) => {
      btcp2p.onClient('verack', () => {
        btcp2p.clientEvents.clearVerack();
        done();
      });
      btcp2p.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });

    it('server should get ping and client should get pong with matching nonce when client sends ping', (done) => {
      let pingNonce: Buffer;
      let pongNonce: Buffer;
      const checkNonces = () => {
        if (pingNonce !== undefined && pongNonce !== undefined) {
          if (pingNonce.toString('hex') === pongNonce.toString('hex')) {
            done();
          } else {
            done(new Error('nonces should match'));
          }
        }
      };
      btcp2p.onServer('ping', (nonce) => {
        btcp2p.serverEvents.clearPing();
        pingNonce = nonce;
        checkNonces();
      });
      btcp2p.onClient('pong', (nonce) => {
        btcp2p.serverEvents.clearPong();
        pongNonce = nonce;
        checkNonces();
      });
      btcp2p.sendPing(btcp2p.clientEvents, btcp2p.client);
    });

  })

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

      btcp2p.onClient('connect', (e: ConnectEvent) => {
        btcp2p.client.end();
      });
      btcp2p.onClient('disconnect', (e: DisconnectEvent) => {
        done();
      });
    });

    it('should connect to litecoin, get addresses then disconnect', (done) => {
      btcp2p = new BTCP2P(integrationTestOptions);

      btcp2p.onClient('connect', (e: ConnectEvent) => {
        btcp2p.getAddresses(btcp2p.client);
      });
      btcp2p.onClient('addr', (e) => {
        btcp2p.client.end();
      })
      btcp2p.onClient('disconnect', (e: DisconnectEvent) => {
        done();
      });
    });
  });

  after(() => {
    btcp2p.client.destroy();
  });
});
