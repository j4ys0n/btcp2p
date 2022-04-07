import chai = require('chai');
const expect = chai.expect;
const should = chai.should();

import { MessageParser } from '../lib/util/Message'
import { BTCP2P } from '../lib/btcp2p';
import { MessageConsts } from '../lib/message/message.consts';
import { TransactionParser } from '../lib/transactions/transaction-parser'
import { Utils } from '../lib/util/general.util';

import { segwitTxn, segwitTxnTaproot, txn2 } from './fixtures'

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

describe('Transaction Unit Tests', () => {
  const utils = new Utils();

  it('should decode a segwit transaction', (done) => {
    const txparser = new TransactionParser(utils, integrationTestOptionsBTC)
    const p = new MessageParser(Buffer.from(segwitTxn.hex, 'hex'));
    const txes = txparser.parseBitcoinTransactions(p, 1, segwitTxn.time)
    expect(txes[0].txOut[0].pkScript).to.be.equal(segwitTxn.decoded.txOut[0].pkScript);
    done();
  })

  it('should decode a taproot segwit transaction', (done) => {
    const txparser = new TransactionParser(utils, integrationTestOptionsBTC)
    const p = new MessageParser(Buffer.from(segwitTxnTaproot.hex, 'hex'));
    const txes = txparser.parseBitcoinTransactions(p, 1, segwitTxnTaproot.time)
    expect(txes[0].txOut[1].pkScript).to.be.equal(segwitTxnTaproot.decoded.txOut[1].pkScript);
    done();
  })

  // it('should decode another segwit transaction', (done) => {
  //   const txparser = new TransactionParser(utils, integrationTestOptionsBTC)
  //   const p = new MessageParser(Buffer.from(txn2.hex, 'hex'));
  //   const txes = txparser.parseBitcoinTransactions(p, 1, segwitTxnTaproot.time)
  //   expect(txes[0].txOut[1].pkScript).to.be.equal(segwitTxnTaproot.decoded.txOut[1].pkScript);
  //   done();
  // })
})