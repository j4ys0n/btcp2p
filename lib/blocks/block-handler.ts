import { MessageParser } from '../util/Message'

import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { Blocks } from './blocks';
import { BlockParser } from './block-parser'
import { TransactionParser } from '../transactions/transaction-parser';

import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
import { HeadersEvent } from '../interfaces/events.interface';
import {
  BlockHeader, BlockHeaderZcash,
  Block, BlockZcash
} from '../interfaces/blocks.interface';
import {
  BitcoinTransaction, ZcashTransaction
} from '../interfaces/transactions.interface';

export class BlockHandler {
  public blocks: Blocks;
  private blockParser: BlockParser;
  private transactionParser: TransactionParser;
  constructor(
    private scope: ProtocolScope,
    private util: Utils,
    private dbUtil: DbUtil,
    private options: StartOptions
  ) {
    this.blocks = new Blocks(this.scope, this.util, this.dbUtil, this.options)
    this.blockParser = new BlockParser(this.options, this.util);
    this.transactionParser = new TransactionParser(this.util, this.options);
  }

  handleBlockInv(payload: Buffer): void {
    const blockInvs = this.blockParser.parseBlockInv(payload);
    this.scope.events.fire('blockinv', blockInvs);

    blockInvs.forEach((blockInv: any) => {
      this.blocks.updateBlockListWithInv(blockInv.parsed);
      // inv = Buffer.concat([inv, blockInv.raw]);
      // not sure why requesting all at once doesn't work well
    })
    const inv = Buffer.concat([this.util.varIntBuffer(1), blockInvs[0].raw]);

    this.blocks.updateBlockInFlight(blockInvs[0].parsed.hash);

    this.scope.message.sendGetData(inv);
  }

  handleBlock(payload: Buffer) {
    const p = new MessageParser(payload);
    // parse block header
    const {header, remainingBuffer} = this.blockParser.parseHeader(p);

    // parse transactions
    let txes: Array<BitcoinTransaction | ZcashTransaction>;
    if (this.options.skipTransactions) {
      txes = [];
    } else {
      txes = this.transactionParser.parseTransactions(remainingBuffer, 0, header.timestamp);
    }
    const block: Block | BlockZcash = {...header, ...{transactions: txes}};
    this.scope.events.fire('block', block);
    if (!this.options.skipBlockDownload) {
      this.blocks.updateBlockList(block);
    }
    // TODO
    // save block to db (parsed and raw) if prevBlock matches actual prev block..
    // if prevBlock does notmatch prev block, keep going back, maybe reorg.
    // remove transactions from mempool
  }

  handleGetHeaders(payload: Buffer): Promise<HeadersEvent> {
    const p = new MessageParser(payload);
    const version = p.readUInt32LE();
    const hashCount = this.util.getCompactSize(p);
    const hashes = this.blockParser.parseHashes(32, p);
    const parsed = {
      version,
      hashCount,
      hashes
    }
    this.scope.events.fire('getheaders', {raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }

  handleHeaders(payload: Buffer): Promise<HeadersEvent> {
    const p = new MessageParser(payload);
    const hashCount = this.util.getCompactSize(p);
    // console.log('headers', hashCount)
    const hashes = this.blockParser.parseHeaders(hashCount, p);
    const parsed = {
      hashCount,
      hashes
    }
    // console.log(parsed);
    this.scope.events.fire('headers', {raw: payload, parsed: parsed});
    return Promise.resolve({raw: payload, parsed: parsed});
  }
}
