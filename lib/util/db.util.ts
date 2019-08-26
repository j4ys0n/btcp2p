import * as path from 'path';
import * as Datastore from 'nestdb';

import { Utils } from '../util/general.util';

import {
  Block, BlockZcash, BestBlock, ReducedBlockHeader
} from '../interfaces/blocks.interface';

interface GetCollectionOptions {
  name: string;
  persistent: boolean;
}

interface DatastoreList {
  [key: string]: Datastore;
}

export class DbUtil {
  protected util: Utils = new Utils();
  private  datastores: DatastoreList = {};

  constructor() {}

  async getCollection(options: GetCollectionOptions, index: any = undefined): Promise<Datastore> {
    const ds = this.datastores[options.name];
    if (ds !== undefined) {
      return Promise.resolve(ds);
    } else {
      let collection: Promise<Datastore>;
      if (options.persistent) {
        collection = this.loadCollection(options.name);
      } else {
        collection = this.memoryCollection();
      }
      const datastore = await collection;
      if (index !== undefined) {
        datastore.ensureIndex(index);
      }
      this.datastores[options.name] = datastore;
      return this.datastores[options.name];
    }
  }

  loadCollection(filename: string): Promise<Datastore> {
    const filePath = path.join(__dirname, '../../data', (filename + '.db'));
    const ds = new Datastore({filename: filePath});
    return new Promise((resolve, reject) => {
      ds.load((err: any) => {
        if (err) {
          /* istanbul ignore next */
          reject(new Error(err));
        } else {
          resolve(ds);
        }
      });
    });
  }

  memoryCollection(): Promise<Datastore> {
    return Promise.resolve(new Datastore());
  }

  saveTxToMempool(name: string, tx: any): Promise<any> {
    let mempool = this.getCollection({
      name: name + '-mempool',
      persistent: true
    });
    return mempool.then((ds: Datastore) => {
      // save tx to mempool collection
    })
  }

  deleteBlockFromHold(name: string, hash: string): Promise<any> {
    let blocks = this.getCollection({
      name: name + '-blocks',
      persistent: false
    }, {fieldName: 'hash', unique: true});
    return new Promise((resolve: any, reject: any) => {
      blocks.then((ds: Datastore) => {
        ds.remove({hash: hash}, (err: any, doc: any) => {
          if (err) {
            reject(err)
          }
          this.util.log('db', 'info', hash + ' removed hold')
          resolve(doc)
        })
      })
    })
  }

  saveBlock(name: string, block: Block | BlockZcash, confirmed: boolean = true): Promise<any> {
    let blocks = this.getCollection({
      name: name + '-blocks',
      persistent: confirmed
    }, {fieldName: 'hash', unique: true});
    if (confirmed) {
      this.deleteBlockFromHold(name, block.hash);
    }
    return new Promise((resolve: any, reject: any) => {
      blocks.then((ds: Datastore) => {
        ds.insert(block, (err: any, doc: any) => {
          if (err) {
            reject(err)
          }
          resolve(doc);
        });
      })
    });
  }

  getBestBlockHeight(name: string): Promise<BestBlock> {
    let blocks = this.getCollection({
      name: name + '-blocks',
      persistent: true
    });
    return new Promise((resolve, reject) => {
      blocks.then((ds: Datastore) => {
        ds.find({}).sort({height: -1}).limit(1).exec((err: any, blocks: Array<Block | BlockZcash>) => {
          if (err) {
            return reject(err);
          }
          const height = (blocks[0] !== undefined) ? <number>blocks[0].height : 0;
          const hash = (blocks[0] !== undefined) ? blocks[0].hash : '';
          return resolve({ height, hash });
        })
      });
    })
  }

  getBlocksForCache(name: string): Promise<Array<ReducedBlockHeader>> {
    let blocks = this.getCollection({
      name: name + '-blocks',
      persistent: true
    });
    return new Promise((resolve, reject) => {
      blocks.then((ds: Datastore) => {
        ds.find({}, {hash: 1, height: 1, prevBlock: 1, nextBlock: 1}).exec((err: any, blocks: Array<ReducedBlockHeader>) => {
          if (err) {
            return reject(err);
          }
          return resolve(blocks)
        })
      })
    });
  }
}
