// classes
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';

// interfaces
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
import {
  BlockList, InFlight, Block, BlockZcash,
  BestBlock, ReducedBlockHeader
} from '../interfaces/blocks.interface';

export class Blocks {

  private blockList: BlockList = {};
  private blockCheckInterval: number = 15 * 1000;
  private blockCheckTimer: any;
  private blocksInFlight: InFlight = {};
  private lastBlockChecked!: string;
  // wait until blocks have this many confirmations before saving to db.
  private confirmationThreshold: number = 25;

  constructor(
    private scope: ProtocolScope,
    private util: Utils,
    private dbUtil: DbUtil,
    private options: StartOptions
  ) {}

  startFetch(block: BestBlock): void {
    console.log(this.scope.shared);
    this.blockList[this.options.network.genesisHash] = {
      requested: false,
      invReceived: false,
      blockReceived: false,
      height: 0
    }
    if (block.height === 0) {
      this.lastBlockChecked = this.options.network.genesisHash;
    } else {
      this.lastBlockChecked = block.hash;
    }
    this.dbUtil.getBlocksForCache(this.options.name)
    .then((blocks: Array<ReducedBlockHeader>) => {
      blocks.forEach((b: ReducedBlockHeader) => {
        this.blockList[b.hash] = {
          blockReceived: true,
          height: b.height,
          prevBlock: b.prevBlock,
          nextBlock: b.nextBlock
        }
      });
      this.util.log('block', 'debug', 'block list loaded');
    })
    .then(() => {
      this.blockCheckTimer = setInterval(() => {
        this.groomBlockList()
        .then(() => {
          this.checkForNewBlocks();
        });
      }, this.blockCheckInterval);
      this.groomBlockList()
      .then(() => {
        this.checkForNewBlocks();
      });
    })
  }

  getBlockHashAtHeight(currentHeight: number): string {
    const hashes = Object.keys(this.blockList);
    let hash: string = '';
    hashes.some((h: string): boolean => {
      if (this.blockList[h].height === currentHeight) {
        hash = h;
        return true;
      }
      return false;
    });
    return hash;
  }

  requestBlocksFromPeer(currentHeight: number): void {
    const hash: string = this.getBlockHashAtHeight(currentHeight);
    this.util.log('block', 'debug', 'requesting blocks from peer');
    console.log(this.scope.shared)
    this.scope.message.sendGetBlocks(hash);
  }

  inFlight(): boolean {
    const blocksInFlight = Object.keys(this.blocksInFlight);
    if (blocksInFlight.length === 0) {
      return false;
    }
    // check to see if blocks are synced and don't have a height,
    // that means they're likely newer blocks (not part of hisotric sync)
    let inFlight = false;
    blocksInFlight.forEach((b: string) => {
      const prevBlock = this.blockList[b].prevBlock;
      if (prevBlock !== undefined) {
        if (this.blockList[prevBlock] !== undefined) {
          inFlight = true;
        }
      }
    });
    return inFlight;
  }

  checkForNewBlocks(): void {
    this.util.log('block', 'debug', 'checking for new blocks');
    const currentHeight = this.scope.shared.internalHeight;
    const inFlight: boolean = this.inFlight();
    if (
      currentHeight < this.scope.shared.externalHeight &&
      !inFlight
    ) {
      // get next set of blocks
      this.requestBlocksFromPeer(currentHeight);
    } else {
      this.checkIfFullySynced();
    }
  }

  checkIfFullySynced() {
    const currentHeight = this.scope.shared.internalHeight;
    if (
      currentHeight >= this.scope.shared.externalHeight &&
      !this.scope.shared.synced
    ) {
      this.chainFullySynced(currentHeight);
    }
  }

  chainFullySynced(height: number) {
    clearInterval(this.blockCheckTimer);
    //run one more time in case there's a gap
    this.requestBlocksFromPeer(height);
    this.scope.shared.synced = true;
    this.util.log('block', 'info', this.options.name + ' chain fully synced');
  }

  saveNextBlock(): Promise<any> {
    const nextBlockHeightToSave: number = this.scope.shared.dbHeight + 1;
    const nextBlockHashToSave: string = this.getBlockHashAtHeight(nextBlockHeightToSave);
    if (nextBlockHashToSave !== undefined) {
      const nextBlockToSave = <Block | BlockZcash>this.blockList[nextBlockHashToSave].data;
      return this.dbUtil.saveBlock(this.options.name, nextBlockToSave)
      .then((): Promise<any> => {
        this.scope.shared.dbHeight = nextBlockHeightToSave;
        return Promise.resolve();
      })
    }
    return Promise.reject(nextBlockHeightToSave)
  }

  calcBlockHeight(hash: string): Promise<any> {
    const nextBlock = this.blockList[hash].nextBlock;
    const height = this.blockList[hash].height;
    if (
      nextBlock !== undefined &&
      nextBlock !== 'undefined' && // TODO is this a bug?
      height !== undefined
    ) {
      const nextHeight = <number>height + 1;
      this.blockList[nextBlock].height = nextHeight;
      this.lastBlockChecked = hash;
      if (nextHeight > this.scope.shared.internalHeight) {
        // this.scope.shared.internalHeight = nextHeight;
        if (this.blocksInFlight[nextBlock]) {
          delete this.blocksInFlight[nextBlock];
        }
        this.util.log('block', 'info', ['new block',nextHeight,nextBlock].join(' - '));
      }
      if (this.scope.shared.synced && nextHeight > this.scope.shared.externalHeight) {
        this.scope.shared.externalHeight = nextHeight;

        return this.saveNextBlock()
        .then((): Promise<any> => {
          this.scope.shared.internalHeight = nextHeight;
          return this.calcBlockHeight(nextBlock);
        })
        .catch((error: any) => {
          this.util.log('block', 'warn', ['saveNextBlock, blockList[height].data not saved', error].join(' - '))
          return Promise.resolve();
        })
      }

      // save to db, then move on
      console.log('height', height, 'internalHeight', this.scope.shared.internalHeight, 'externalHeight', this.scope.shared.externalHeight)
      if (
        height > this.scope.shared.internalHeight &&
        height < this.scope.shared.externalHeight - this.confirmationThreshold - 1
      ) {
        const block = <Block | BlockZcash>this.blockList[hash].data;
        block.height = height;
        block.nextBlock = this.blockList[hash].nextBlock;
        this.util.log('block', 'info', ['saving block',height].join(' - '));
        return this.dbUtil.saveBlock(this.options.name, block)
        .then((): Promise<any> => {
          this.scope.shared.dbHeight = height;
          this.scope.shared.internalHeight = height;
          return this.calcBlockHeight(nextBlock);
        });
      }
      this.scope.shared.internalHeight = height;
      return this.calcBlockHeight(nextBlock);
    }
    return Promise.resolve();
  }

  groomBlockList(): Promise<any> {
    const blocks = Object.keys(this.blockList);
    // link the list

    // backwards
    blocks.forEach((block: string) => {
      const prevBlock = <string>this.blockList[block].prevBlock
      if (this.blockList[prevBlock] !== undefined) {
        this.blockList[prevBlock].nextBlock = block;
      } else {
        this.blockList[prevBlock] = {
          nextBlock: block,
          blockReceived: false
        };
      }
    });

    // forwards
    blocks.forEach((block: string) => {
      const nextBlock = <string>this.blockList[block].nextBlock;
      if (this.blockList[nextBlock] !== undefined) {
        this.blockList[nextBlock].prevBlock = block;
      } else {
        this.blockList[nextBlock] = {
          prevBlock: block,
          blockReceived: false
        };
      }
    });

    // determine block numbers and save blocks
    return this.calcBlockHeight(this.lastBlockChecked);
  }

  updateBlockInFlight(hash: string): void {
    this.blocksInFlight[hash] = true;
  }

  updateBlockList(block: any): void {
    if (this.blockList[block.hash] === undefined) {
      this.blockList[block.hash] = {
        blockReceived: true,
        prevBlock: block.prevBlock,
        data: block
      }
    } else {
      this.blockList[block.hash].blockReceived = true;
      this.blockList[block.hash].prevBlock = block.prevBlock;
      this.blockList[block.hash].data = block;
    }
    if (this.blockList[block.prevBlock] === undefined) {
      this.blockList[block.prevBlock] = {
        blockReceived: false,
        nextBlock: block.hash
      }
    } else {
      this.blockList[block.prevBlock].nextBlock = block.hash;
    }
    if (this.blockList[block.prevBlock].height !== undefined) {
      let blockHeight = <number>this.blockList[block.prevBlock].height;
      blockHeight++;
      this.blockList[block.hash].height = blockHeight;
    }
    if (this.scope.shared.synced) {
      this.groomBlockList();
    }
  }

  updateBlockListWithInv(blockInv: any): void {
    if (this.blockList[blockInv.hash] === undefined) {
      this.blockList[blockInv.hash] = {
        invReceived: true,
        blockReceived: false
      }
    } else {
      this.blockList[blockInv.hash].invReceived = true;
    }
  }
}
