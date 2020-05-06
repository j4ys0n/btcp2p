import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
export declare class Transactions {
    private scope;
    private util;
    private dbUtil;
    private options;
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
}
