import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';

import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';

export class Transactions {

  constructor(
    private scope: ProtocolScope,
    private util: Utils,
    private dbUtil: DbUtil,
    private options: StartOptions
  ) {}
}
