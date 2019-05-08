import { Utils } from '../util/general.util';

export class MessageConsts {
  constructor(private util: Utils) {}

  public commands = {
    addr: this.util.commandStringBuffer('addr'), // send or receive peer addresses
    // alert: this.util.commandStringBuffer('alert'), // deprecated - removed
    block: this.util.commandStringBuffer('block'), // send or receive transactions in block
    blocktxn: this.util.commandStringBuffer('blocktxn'), // send in response to getblocktxn, should validate/reconstruct block on receipt
    cmpctblock: this.util.commandStringBuffer('cmpctblock'), // don't send if can't reply to getblocktxn
    // checkorder: this.util.commandStringBuffer('checkorder'), // deprecated
    feefilter: this.util.commandStringBuffer('feefilter'), // set fee rate, don't relay txes less than fee (optional)
    getaddr: this.util.commandStringBuffer('getaddr'), // send or receive peer addresses
    getblocks: this.util.commandStringBuffer('getblocks'), // send or receive blocks
    getblocktxn: this.util.commandStringBuffer('getblocktxn'), // send in response to compact block to get transaction in said block. BIP 152 (>70014)
    getdata: this.util.commandStringBuffer('getdata'), // in response to inv to get block/tx data
    getheaders: this.util.commandStringBuffer('getheaders'), // ask peer for block headers
    headers: this.util.commandStringBuffer('headers'), // returns block headers from getheaders
    inv: this.util.commandStringBuffer('inv'), // received unsolicided (new blocks/txes) or in response to getblocks
    mempool: this.util.commandStringBuffer('mempool'), // ask peer for txes that have been verified but not confirmed
    notfound: this.util.commandStringBuffer('notfound'), // request from getdata not found
    ping: this.util.commandStringBuffer('ping'), // send pong
    pong: this.util.commandStringBuffer('pong'), // ping has been received
    reject: this.util.commandStringBuffer('reject'), // when a message is rejected
    // reply: this.util.commandStringBuffer('reply'), // deprecated
    sendcmpct: this.util.commandStringBuffer('sendcmpct'), // send compact blocks (usually part of handshake)
    sendheaders: this.util.commandStringBuffer('sendheaders'), // send or receive headers
    // submitorder: this.util.commandStringBuffer('submitorder'), // deprecated
    tx: this.util.commandStringBuffer('tx'), // send or receive transaction
    verack: this.util.commandStringBuffer('verack'), // acknowledge version (part of handshake)
    version: this.util.commandStringBuffer('version') // send or receive version (part of handshake)
  }
}
