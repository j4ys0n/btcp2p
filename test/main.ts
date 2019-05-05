const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { BTCP2P } from '../lib/btcp2p';
import {
  ConnectEvent, DisconnectEvent, PeerMessageEvent, RejectedEvent,
  BlockNotifyEvent
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
  public util;
}

describe('Unit tests', () => {
  let btcp2p: BTCP2PTest;
  let firstPingDone = false;
  before((done) => {
    btcp2p = new BTCP2PTest(unitTestOptions);
    let serverStarted = false;
    let clientConnected = false;
    const serverStartedAndClientConnected = () => {
      if (serverStarted && clientConnected) {
        done();
      }
    }
    btcp2p.server.events.onServerStart(() => {
      btcp2p.server.events.clearServerStart();
      serverStarted = true;
      serverStartedAndClientConnected();
    });
    btcp2p.client.events.on('connect', () => {
      clientConnected = true;
      serverStartedAndClientConnected();
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
      btcp2p.client.on('error', (error) => {
        expect(error.message).to.be.equal('badevent event does not exist');
        done();
      });
      btcp2p.client.on('badevent', (response) => {
        // should fire error
      })
    });
    it('client should send event for sent_message when message sent (ping)', (done) => {
      btcp2p.client.on('sent_message', (msg) => {
        if (msg.command === 'ping') {
          // btcp2p.client.events.clearPing();
          if (!firstPingDone) {
            expect(msg.command).to.be.equal('ping');
            firstPingDone = true;
            done();
          }
        }
      });
      btcp2p.client.message.sendPing();
    });
    it('server should send event for peer_message when message received (version)', (done) => {
      btcp2p.server.on('peer_message', (msg) => {
        btcp2p.server.events.clearPeerMessage();
        expect(msg.command).to.be.equal(btcp2p.server.message.commands.version.toString());
        done();
      });
      btcp2p.client.message.sendVersion();
    });
    it('server should get version when client sends version', (done) => {
      btcp2p.server.on('version', () => {
        btcp2p.server.events.clearVersion();
        done();
      });
      btcp2p.client.message.sendVersion();
    });
    it('client should get verack when client sends version', (done) => {
      btcp2p.client.on('verack', () => {
        btcp2p.client.events.clearVerack();
        done();
      });
      btcp2p.client.message.sendVersion();
    });
    it('client should fire reject event when server sends reject message', (done) => {
      const msg = 'block';
      const ccode = 0x01;
      const name = 'REJECT_MALFORMED';
      const reason = 'bad command - malformed'
      const extra = 'asdfghjkl';

      btcp2p.client.on('reject', (rejected: RejectedEvent) => {
        btcp2p.client.events.clearReject();
        expect(rejected.message).to.be.equal(msg);
        expect(rejected.ccode).to.be.equal(ccode);
        expect(rejected.name).to.be.equal(name);
        expect(rejected.reason).to.be.equal(reason);
        expect(rejected.extra).to.be.equal(extra);
        done();
      });

      btcp2p.server.message.sendReject(msg, ccode, reason, extra);
    });

    it('server should get ping and client should get pong with matching nonce when client sends ping', (done) => {
      let pingNonce: Buffer;
      let pongNonce: Buffer;
      const checkNonces = () => {
        if (pingNonce !== undefined && pongNonce !== undefined && firstPingDone) {
          btcp2p.server.events.clearPing();
          btcp2p.server.events.clearPong();
          if (pingNonce.toString('hex') === pongNonce.toString('hex')) {
            done();
          } else {
            done(new Error('nonces should match'));
          }
        }
      };
      btcp2p.server.on('ping', (nonce) => {
        pingNonce = nonce;
        checkNonces();
      });
      btcp2p.client.on('pong', (nonce) => {
        pongNonce = nonce;
        checkNonces();
      });
      btcp2p.client.message.sendPing();
    });

    it('server should get address when client sends address', (done) => {
      const ip = '192.0.2.51';
      const port = unitTestOptions.port;
      btcp2p.server.on('addr', (payload) => {
        btcp2p.server.events.clearAddr();
        // console.log(payload);
        const firstAddr = payload.addresses[0];
        expect(firstAddr.host).to.be.equal(ip);
        expect(firstAddr.port).to.be.equal(port);
        done();
      });
      btcp2p.client.message.sendAddr(ip, port);
    });

  })

  after((done) => {
    btcp2p.client.socket.end();
    btcp2p.client.socket.destroy();
    btcp2p.stopServer()
    .then(() => {
      done();
    });
  });
});

describe('Integration Tests', () => {
  let btcp2p: BTCP2PTest;
  // before((done) => {
  //   btcp2p = new BTCP2PTest(integrationTestOptions);
  //   done();
  // })

  it('should connect to litecoin, request blocks, then disconnect', (done) => {
    btcp2p = new BTCP2PTest(integrationTestOptions);
    let nextHash = '';
    // btcp2p.client.on('peer_message', (e: PeerMessageEvent) => {
    //   console.log(e);
    // });
    btcp2p.client.on('blockinv', (e: any) => {
      btcp2p.client.events.clearBlockInv();
      expect(e[0].parsed.hash).to.be.equal(nextHash);
      btcp2p.client.socket.end();
    });
    btcp2p.client.on('getheaders', (e: any) => {
      btcp2p.client.events.clearGetHeaders();
      nextHash = e.parsed.hashes[0];
      console.log('requesting:', e.parsed.hashes[1]);
      console.log('next:', nextHash);
      btcp2p.client.message.sendGetBlocks(e.parsed.hashes[1]);
    });
    // btcp2p.client.on('connect', (e: ConnectEvent) => {
    //   btcp2p.client.events.clearConnect();
    //   setTimeout(() => {
    //     btcp2p.client.socket.end();
    //   }, 2000);
    // });
    btcp2p.client.on('disconnect', (e: DisconnectEvent) => {
      btcp2p.client.events.clearDisconnect();
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
  //     btcp2p.message.sendGetAddr(btcp2p.clientEvents, btcp2p.clientSocket);
  //   });
  //   btcp2p.onClient('addr', (e) => {
  //     btcp2p.clientSocket.end();
  //   })
  //   btcp2p.onClient('disconnect', (e: DisconnectEvent) => {
  //     done();
  //   });
  // });

  // after(() => {
  //   btcp2p.client.socket.destroy();
  // });
});
