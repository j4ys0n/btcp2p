import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { StartOptions } from '../interfaces/peer.interface';
export declare class API {
    private port;
    private options;
    private util;
    private dbUtil;
    private httpServer;
    private apiRoutes;
    constructor(port: number, options: StartOptions, util: Utils, dbUtil: DbUtil);
    start(): Promise<any>;
    private routes;
    private blocksController;
    private blockController;
    private txController;
}
