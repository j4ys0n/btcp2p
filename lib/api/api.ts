import { Request, Response } from 'express';
import { HttpServer } from './http.server';
import { HttpRoutes } from './http.routes';
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';

import { Route } from '../interfaces/api.interface';

export class API {
  private apiServer: HttpServer
  private apiRoutes: HttpRoutes;

  constructor(
    private port: number,
    private util: Utils,
    private dbUtil: DbUtil
  ) {
    this.apiRoutes = new HttpRoutes();
    this.apiServer = new HttpServer(this.apiRoutes);
  }

  public start(): Promise<any> {
    return this.apiServer.start(this.port, this.routes())
    .then((): Promise<any> => {
      this.util.log('api', 'info', 'api server listening on port ' + this.port);
      return Promise.resolve();
    });
  }

  private routes(): Array<Route> {
    return [
      {path: '/blocks', method: 'get', controller: this.blocksController},
      {path: '/block/:id', method: 'get', controller: this.blockController},
      {path: '/tx/:id', method: 'get', controller: this.txController}
    ]
  }

  private blocksController(req: Request, res: Response): any {

  }

  private blockController(req: Request, res: Response): any {
    const blockId = decodeURIComponent(req.params.id);
    console.log(blockId)
    res.send(blockId)
  }

  private txController(req: Request, res: Response): any {
    const hash = decodeURIComponent(req.params.id);
    console.log(hash)
    res.send(hash)
  }
}
