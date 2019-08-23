import { Utils } from '../util/general.util';
export declare class MessageConsts {
    private util;
    constructor(util: Utils);
    commands: {
        addr: Buffer;
        block: Buffer;
        blocktxn: Buffer;
        cmpctblock: Buffer;
        feefilter: Buffer;
        getaddr: Buffer;
        getblocks: Buffer;
        getblocktxn: Buffer;
        getdata: Buffer;
        getheaders: Buffer;
        headers: Buffer;
        inv: Buffer;
        mempool: Buffer;
        merkleblock: Buffer;
        notfound: Buffer;
        ping: Buffer;
        pong: Buffer;
        reject: Buffer;
        sendcmpct: Buffer;
        sendheaders: Buffer;
        tx: Buffer;
        verack: Buffer;
        version: Buffer;
    };
}
