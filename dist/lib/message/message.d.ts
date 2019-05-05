import { Utils } from '../util/general.util';
import { MessageHandlers } from './message.handlers';
import { BlockHandler } from '../blocks/blocks';
import { ProtocolScope } from '../interfaces/peer.interface';
export interface MessageOptions {
    magic: string;
    protocolVersion: number;
    relayTransactions: boolean;
}
export declare class Message {
    private messageOptions;
    private scope;
    protected util: Utils;
    protected handlers: MessageHandlers;
    protected blockHandler: BlockHandler;
    private magic;
    private magicInt;
    private networkServices;
    private emptyNetAddress;
    private userAgent;
    private blockStartHeight;
    private relayTransactions;
    commands: {
        addr: Buffer;
        alert: Buffer;
        block: Buffer;
        blocktxn: Buffer;
        checkorder: Buffer;
        feefilter: Buffer;
        getaddr: Buffer;
        getblocks: Buffer;
        getblocktxn: Buffer;
        getdata: Buffer;
        getheaders: Buffer;
        headers: Buffer;
        inv: Buffer;
        mempool: Buffer;
        notfound: Buffer;
        ping: Buffer;
        pong: Buffer;
        reject: Buffer;
        reply: Buffer;
        sendcmpct: Buffer;
        sendheaders: Buffer;
        submitorder: Buffer;
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
    constructor(messageOptions: MessageOptions, scope: ProtocolScope);
    sendMessage(command: Buffer, payload: Buffer): void;
    sendVersion(): void;
    sendVerack(): void;
    sendPing(): void;
    sendHeaders(payload: Buffer): void;
    sendGetHeaders(payload: Buffer): void;
    sendGetAddr(): void;
    sendGetBlocks(hash: string): void;
    sendAddr(ip: string, port: number): void;
    sendReject(msg: string, ccode: number, reason: string, extra: string): void;
    setupMessageParser(): void;
    private ipTo16ByteBuffer;
    private handleMessage;
}
