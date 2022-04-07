/// <reference types="node" />
import { MessageConsts } from './message.consts';
import { Utils } from '../util/general.util';
import { DbUtil } from '../util/db.util';
import { MessageHandlers } from './message.handlers';
import { BlockHandler } from '../blocks/block-handler';
import { TransactionHandler } from '../transactions/transaction-handler';
import { PeerHandler } from '../peers/peers';
import { StartOptions, ProtocolScope } from '../interfaces/peer.interface';
export declare class Message {
    private options;
    private scope;
    private dbUtil;
    protected util: Utils;
    protected messageConsts: MessageConsts;
    protected handlers: MessageHandlers;
    blockHandler: BlockHandler;
    protected transactionHandler: TransactionHandler;
    protected peerHandler: PeerHandler;
    private magic;
    private magicInt;
    private networkServices;
    private emptyNetAddress;
    private userAgent;
    private blockStartHeight;
    private relayTransactions;
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
    /**
     * @param messageOptions: MessageOptions = {
     *  magic: string,
     *  relayTransactions: boolean,
     *  protocolVersion: number,
     * }
     */
    constructor(options: StartOptions, scope: ProtocolScope, dbUtil: DbUtil);
    sendMessage(command: Buffer, payload: Buffer): void;
    sendVersion(): void;
    sendVerack(): void;
    sendPing(): void;
    sendHeaders(payload: Buffer): void;
    sendGetHeaders(payload: Buffer): void;
    sendGetAddr(): void;
    sendGetBlocks(hash: string): void;
    sendGetData(payload: Buffer): void;
    sendAddr(ip: string, port: number): void;
    sendReject(msg: string, ccode: number, reason: string, extra: string): void;
    setupMessageParser(): void;
    private ipTo16ByteBuffer;
    private handleMessage;
}
