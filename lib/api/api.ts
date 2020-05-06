import { Request, Response } from 'express';
import { HttpServer } from './http.server';
import { HttpRoutes } from './http.routes';
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';

import { Route } from '../interfaces/api.interface';
import { StartOptions } from '../interfaces/peer.interface';
import {
  Block, BlockZcash
} from '../interfaces/blocks.interface';
import {
  BitcoinTransaction, ZcashTransaction
} from '../interfaces/transactions.interface';

export class API {
  private httpServer: HttpServer
  private apiRoutes: HttpRoutes;

  constructor(
    private port: number,
    private options: StartOptions,
    private util: Utils,
    private dbUtil: DbUtil,
  ) {
    this.apiRoutes = new HttpRoutes();
    this.httpServer = new HttpServer(this.apiRoutes, this.options.frontEndPath);
  }

  public start(): Promise<any> {
    return this.httpServer.start(this.port, this.routes())
    .then((): Promise<any> => {
      this.util.log('api', 'info', 'api server listening on port ' + this.port);
      return Promise.resolve();
    });
  }

  private routes(): Array<Route> {
    return [
      {path: '/api/blocks', method: 'get', controller: this.blocksController.bind(this)},
      {path: '/api/block/:id', method: 'get', controller: this.blockController.bind(this)},
      {path: '/api/tx/:id', method: 'get', controller: this.txController.bind(this)}
    ]
  }

  private blocksController(req: Request, res: Response): any {
    // this.dbUtil.
  }

  private blockController(req: Request, res: Response): any {
    let blockId: string | number = decodeURIComponent(req.params.id);
    if (blockId === parseInt(blockId, 10).toString()) {
      blockId = parseInt(blockId, 10);
    }
    console.log(blockId)
    this.dbUtil.getBlock(blockId, this.options.name)
    .then((block: Block | BlockZcash) => {
      res.send(block)
    })
    // res.send(blockId)
  }

  private txController(req: Request, res: Response): any {
    const hash = decodeURIComponent(req.params.id);
    this.dbUtil.getTransaction(hash, this.options.name)
    .then((tx: BitcoinTransaction | ZcashTransaction) => {
      res.send(tx)
    })
    // console.log(hash)
    // res.send(hash)
  }
}
