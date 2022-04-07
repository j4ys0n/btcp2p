/// <reference types="node" />
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { BlockHandler } from '../blocks/block-handler';
import { RejectedEvent } from '../interfaces/events.interface';
import { StartOptions, ProtocolScope, Version } from '../interfaces/peer.interface';
export interface Nonce {
    nonce: Buffer;
}
export declare class MessageHandlers {
    private scope;
    private util;
    private dbUtil;
    private options;
    blockHandler: BlockHandler;
    private messageConsts;
    private transactionHandler;
    protected invCodes: {
        error: number;
        tx: number;
        block: number;
        blockFiltered: number;
        blockCompact: number;
    };
    constructor(scope: ProtocolScope, util: Utils, dbUtil: DbUtil, options: StartOptions);
    handlePing(payload: Buffer): Promise<Nonce>;
    handlePong(payload: Buffer): Promise<Nonce>;
    handleReject(payload: Buffer): Promise<RejectedEvent>;
    handleVersion(payload: Buffer): Promise<Version>;
    handleInv(payload: Buffer): void;
    private parseNonce;
    handleNotFound(payload: Buffer): void;
}
