const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { BTCP2P } from '../lib/btcp2p';
import {
  ConnectEvent, DisconnectEvent, PeerMessageEvent, RejectedEvent
} from '../lib/interfaces/events.interface'


const unitTestOptions = {
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

const integrationTestOptions = {
  name: 'litecoin',
  peerMagic: 'fbc0b6db',
  relayTransactions: false,
  host: '34.201.114.34',
  port: 9333,
  startServer: false,
  protocolVersion: 70015,
  persist: false
};

class BTCP2PTest extends BTCP2P {
  public clientEvents;
  public serverEvents;
  public util;
  public message;
}

describe('Unit tests', () => {
  let btcp2p: BTCP2PTest;
  before((done) => {
    btcp2p = new BTCP2PTest(unitTestOptions);
    btcp2p.serverEvents.onServerStart(() => {
      btcp2p.serverEvents.clearServerStart();
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
    it('should throw error when trying to listen for non-existent event', (done) => {
      btcp2p.onClient('error', (error) => {
        expect(error.message).to.be.equal('badevent event does not exist');
        done();
      });
      btcp2p.onClient('badevent', (response) => {
        // should fire error
      })
    });
    it('client should send event for sent_message when message sent (version)', (done) => {
      btcp2p.onClient('sent_message', (msg) => {
        btcp2p.clientEvents.clearSentMessage();
        expect(msg.command).to.be.equal('version');
        done();
      });
      btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });
    it('server should send event for peer_message when message received (version)', (done) => {
      btcp2p.onServer('peer_message', (msg) => {
        btcp2p.serverEvents.clearPeerMessage();
        expect(msg.command).to.be.equal(btcp2p.message.commands.version.toString());
        done();
      });
      btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });
    it('server should get version when client sends version', (done) => {
      btcp2p.onServer('version', () => {
        btcp2p.serverEvents.clearVersion();
        done();
      });
      btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });
    it('client should get verack when client sends version', (done) => {
      btcp2p.onClient('verack', () => {
        btcp2p.clientEvents.clearVerack();
        done();
      });
      btcp2p.message.sendVersion(btcp2p.clientEvents, btcp2p.client);
    });
    it('client should fire reject event when server sends reject message', (done) => {
      const msg = 'block';
      const ccode = 0x01;
      const name = 'REJECT_MALFORMED';
      const reason = 'bad command - malformed'
      const extra = 'asdfghjkl';

      btcp2p.onClient('reject', (rejected: RejectedEvent) => {
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
      btcp2p.message.sendPing(btcp2p.clientEvents, btcp2p.client);
    });

    it('server should get address when client sends address', (done) => {
      const ip = '192.0.2.51';
      const port = unitTestOptions.port;
      btcp2p.onServer('addr', (payload) => {
        btcp2p.serverEvents.clearAddr();
        // console.log(payload);
        const firstAddr = payload.addresses[0];
        expect(firstAddr.host).to.be.equal(ip);
        expect(firstAddr.port).to.be.equal(port);
        done();
      });
      btcp2p.message.sendAddr(btcp2p.clientEvents, btcp2p.client, ip, port);
    });

  })

  after(() => {
    btcp2p.client.end();
    btcp2p.client.destroy();
    btcp2p.stopServer();
  });
});

describe('Integration Tests', () => {
  let btcp2p: BTCP2PTest;
  // before((done) => {
  //   btcp2p = new BTCP2PTest(integrationTestOptions);
  //   done();
  // })

  it('should connect to litecoin, wait 2 seconds, then disconnect', (done) => {
    btcp2p = new BTCP2PTest(integrationTestOptions);
    btcp2p.onClient('peer_message', (e: PeerMessageEvent) => {
      // console.log(e);
    });
    btcp2p.onClient('connect', (e: ConnectEvent) => {
      btcp2p.clientEvents.clearConnect();
      setTimeout(() => {
        btcp2p.client.end();
      }, 2000);
    });
    btcp2p.onClient('disconnect', (e: DisconnectEvent) => {
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

  after(() => {
    btcp2p.client.destroy();
  });
});
