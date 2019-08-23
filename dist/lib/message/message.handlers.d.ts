import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { BlockHandler } from '../blocks/block-handler';
import { RejectedEvent } from '../interfaces/events.interface';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
export interface Nonce {
    nonce: Buffer;
}
export interface Version {
    version: number;
    services: number;
    time: any;
    addr_recv: string;
    addr_from: string;
    nonce: string;
    client: string;
    height: number;
    relay: boolean;
}
export declare class MessageHandlers {
    private scope;
    private util;
    private dbUtil;
    private options;
    blockHandler: BlockHandler;
    private transactions;
    protected invCodes: {
        error: number;
        tx: number;
        block: number;
        blockFiltered: number;
        blockCompact: number;
    };
    protected rejectCodes: {
        1: string;
        10: string;
        11: string;
        12: string;
        40: string;
        41: string;
        42: string;
        43: string;
    };
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    handlePing(payload: Buffer): Promise<Nonce>;
    handlePong(payload: Buffer): Promise<Nonce>;
    handleReject(payload: Buffer): Promise<RejectedEvent>;
    handleVersion(payload: Buffer): Promise<Version>;
    handleInv(payload: Buffer): void;
    private parseNonce;
}
