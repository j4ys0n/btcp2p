import chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { MessageParser } from '../lib/util/Message'

import { BTCP2P } from '../lib/btcp2p';
import { MessageConsts } from '../lib/message/message.consts';
import {
  RejectedEvent
} from '../lib/interfaces/events.interface';

import {
  Block, BlockZcash
} from '../lib/interfaces/blocks.interface';

import { TransactionParser } from '../lib/transactions/transaction-parser';
import { BlockParser } from '../lib/blocks/block-parser';
import { Utils } from '../lib/util/general.util';

import { bitcoinBlock } from './fixtures'

const unitTestOptions = {
  name: 'arrow',
  host: 'localhost',
  port: 3003,
  serverPort: 3003,
  startServer: true,
  relayTransactions: false,
  persist: false,
  fetchMempool: false,
  network: {
    protocol: 'zcash',
    magic: '27a2261c',
    genesisTarget: '1f07ffff',
    genesisHash: '00028de97cd7b8e1b90918186387c0e6b9f65ac433bdde036aa93e184593da4e',
    protocolVersion: 170007,
    pubKeyVersion: 0,
    scriptVersion: 5
  }
};

const integrationTestOptionsBTC = {
  name: 'bitcoin',
  host: '34.207.89.35',
  port: 8333,
  startServer: false,
  relayTransactions: false,
  persist: true,
  fetchMempool: false,
  skipBlockDownload: true,
  network: {
    protocol: 'bitcoin',
    magic: 'f9beb4d9',
    genesisTarget: '1d00ffff',
    genesisHash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    protocolVersion: 170001,
    pubKeyVersion: 0,
    scriptVersion: 5
  }
};


class BTCP2PTest extends BTCP2P {
  public util;
}

describe('Unit tests', () => {
  let btcp2p: BTCP2PTest;
  let firstPingDone = false;
  let messageConsts: MessageConsts;
  const utils = new Utils();
  before((done) => {
    btcp2p = new BTCP2PTest(unitTestOptions);
    messageConsts = new MessageConsts(btcp2p.util);
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
        btcp2p.client.events.clearError();
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
        expect(msg.command).to.be.equal(messageConsts.commands.version.toString());
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

    it('should decode a transaction', (done) => {
      const txparser = new TransactionParser(utils, integrationTestOptionsBTC)
      const p = new MessageParser(Buffer.from('0100000001baa5ec1b07ab16b8c1b55b27d703e012f59693ff1ffddc91a6e4502bb38ad85b0100000000ffffffff01c0a1fc53020000001976a9148ed74a478d6655dbe3397b2cf4f2bee225af9c8088aca8f80800', 'hex'));
      const txes = txparser.parseBitcoinTransactions(p, 1, 1503539856)
      // console.log(txes);
      expect(txes[0].vout[0].scriptPubKey.hex).to.be.equal('76a9148ed74a478d6655dbe3397b2cf4f2bee225af9c8088ac');
      done();
    })

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

    it('should decode a bitcoin block header', (done) => {
      const mp = new MessageParser(Buffer.from(bitcoinBlock.bytes, 'hex'))
      const blkParser = new BlockParser(integrationTestOptionsBTC, utils);
      const {header} = blkParser.parseHeader(mp);
      expect(header.hash).to.be.equal(bitcoinBlock.hash);
      expect(header.prevBlock).to.be.equal(bitcoinBlock.prevBlock);
      expect(header.hashMerkleRoot).to.be.equal(bitcoinBlock.hashMerkleRoot);
      done();
    });

    it('should decode bitcoin transactions in a block', (done) => {
      const mp = new MessageParser(Buffer.from(bitcoinBlock.bytes, 'hex'));
      const blkParser = new BlockParser(integrationTestOptionsBTC, utils);
      const {header, remainingBuffer} = blkParser.parseHeader(mp);
      const txparser = new TransactionParser(utils, integrationTestOptionsBTC)
      const transactions = txparser.parseTransactions(remainingBuffer, 0, bitcoinBlock.time)
      // console.log(transactions.length)
      expect(transactions.length).to.be.equal(bitcoinBlock.transactions.total);
      expect(transactions[0].txid).to.be.equal(bitcoinBlock.transactions[0].txid);
      expect(transactions[1].txid).to.be.equal(bitcoinBlock.transactions[1].txid);
      expect(transactions[232].txid).to.be.equal(bitcoinBlock.transactions[232].txid);
      done();
    })

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
