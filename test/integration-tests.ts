import chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { MessageParser } from '../lib/util/Message'

import { BTCP2P } from '../lib/btcp2p';
import { MessageConsts } from '../lib/message/message.consts';
import {
  DisconnectEvent, RejectedEvent, PeerMessageEvent, HeadersEvent, BlockNotifyEvent
} from '../lib/interfaces/events.interface';

import {
  Block, BlockZcash
} from '../lib/interfaces/blocks.interface';

import { TransactionParser } from '../lib/transactions/transaction-parser';
import { Utils } from '../lib/util/general.util';

const integrationTestOptionsBTC = {
  name: 'bitcoin',
  host: '10.1.1.158',
  port: 8333,
  startServer: false,
  relayTransactions: false,
  persist: true,
  fetchMempool: false,
  skipBlockDownload: true,
  logLevel: 1,
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

const integrationTestOptionsARW = {
  name: 'arrow',
  host: '10.9.9.187',
  port: 7654,
  startServer: false,
  relayTransactions: false,
  persist: false,
  retryPause: 3,
  fetchMempool: false,
  logLevel: 1,
  network: {
    protocol: 'zcash',
    magic: '27a2261c',
    genesisTarget: '1f07ffff',
    genesisHash: '00028de97cd7b8e1b90918186387c0e6b9f65ac433bdde036aa93e184593da4e',
    protocolVersion: 170008,
    pubKeyVersion: 0,
    scriptVersion: 5
  },
  api: true,
  frontEndPath: 'front-end',
  apiPort: 8080
};

class BTCP2PTest extends BTCP2P {
  public util;
}

describe('Integration Tests', () => {
  let btcp2p: BTCP2PTest;
  // before((done) => {
  //   btcp2p = new BTCP2PTest(integrationTestOptions);
  //   done();
  // })

  it('should connect to arrowd, request blocks, then disconnect', (done) => {
    btcp2p = new BTCP2PTest(integrationTestOptionsARW);
    let nextHash = '';
    btcp2p.client.on('peer_message', (e: PeerMessageEvent) => {
      console.log('peer_message', e);
    });
    btcp2p.client.on('sent_message', (e: PeerMessageEvent) => {
      console.log('sent_message', e);
    });
    btcp2p.client.on('error', (e: any) => {
      console.log(e)
    })
    btcp2p.client.on('blockinv', (e: any) => {
      btcp2p.client.events.clearBlockInv();
      console.log(e)
      expect(e[0].parsed.hash).to.be.equal(nextHash);
      btcp2p.client.socket.end();
    });
    btcp2p.client.on('block', (e: Block) => {

    });
    btcp2p.client.on('getheaders', (e: any) => {
      btcp2p.client.events.clearGetHeaders();
      nextHash = e.parsed.hashes[0];
      console.log('requesting:', e.parsed.hashes[1]);
      console.log('next:', nextHash);
      btcp2p.client.message.sendGetBlocks(e.parsed.hashes[1]);
      // btcp2p.client.message.sendGetBlocks('44d74d50024f885a38b355c2da029436647d3cadadc298729ea6b2e068876fb4')
    });
    btcp2p.client.on('headers', (e: HeadersEvent) => {
      console.log('headers')
      console.log(e)
    })
    // btcp2p.client.on('connect', (e: ConnectEvent) => {
    //   btcp2p.client.events.clearConnect();
    //   setTimeout(() => {
    //     btcp2p.client.socket.end();
    //   }, 2000);
    // });
    btcp2p.client.on('disconnect', (e: DisconnectEvent) => {
      btcp2p.client.events.clearDisconnect();
      setTimeout(() => {
        done();
      }, 3000);
    });
    btcp2p.client.on('block', (e: any) => {
      // console.log(e)
      btcp2p.client.events.clearBlock();
      btcp2p.client.socket.end();
      done();
    })

    btcp2p.client.on('connect', (e: any) => {
      btcp2p.client.message.sendMessage(
        btcp2p.client.message.commands.mempool,
        Buffer.from([])
      )
      console.log('** connected!')
      //000000000000000005f78bb9a22b775946d5135cca251dfaecd5ba7497c0f97a
      btcp2p.client.message.sendGetBlocks('000000000000000005f78bb9a22b775946d5135cca251dfaecd5ba7497c0f97a')
      setTimeout(() => {
        btcp2p.client.socket.end();
      }, 30000)
    })
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

  after((done) => {
    btcp2p.client.socket.destroy();
    done();
  });
});

describe('Connection Retry Integration Tests', () => {
  let btcp2p: BTCP2PTest;
  const maxAttempts: number = 3;
  let attempts: number = 0;

  before((done) => {
    integrationTestOptionsARW.persist = true;
    integrationTestOptionsARW.api = false;
    done();
  })

  it('should connect to arrowd, disconnect, then retry', (done) => {
    btcp2p = new BTCP2PTest(integrationTestOptionsARW);

    btcp2p.client.on('connect', (e: any) => {
      console.log('** connected!')
      setTimeout(() => {
        if (attempts < maxAttempts) {
          attempts++;
          btcp2p.client.socket.end();
          btcp2p.client.socket.destroy();
          btcp2p.client.events.fire('error', {message: 'connection closed'})
        } else {
          done();
        }
      }, 15000);
    })

    btcp2p.client.on('sent_message', (e: PeerMessageEvent) => {
      console.log('sent_message', e);
    });

    btcp2p.client.on('error', (e: ErrorEvent) => {
      console.log('** error!')
      console.log(e)
    })

    btcp2p.client.on('disconnect', (e: DisconnectEvent) => {
      // btcp2p.client.events.clearDisconnect();
      console.log('** disconnected!')

    });
  })

  after((done) => {
    integrationTestOptionsARW.persist = false;
    done();
  })
})
