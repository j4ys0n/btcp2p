import * as net from 'net';
import { StartOptions } from './interfaces/peer.interface';
declare type Handler<E> = (event: E) => void;
export declare class BTCP2P {
    private options;
    client: net.Socket;
    private util;
    private magic;
    private magicInt;
    private networkServices;
    private emptyNetAddress;
    private userAgent;
    private blockStartHeight;
    private relayTransactions;
    private invCodes;
    private verack;
    private rejectedRetryMax;
    private rejectedRetryAttempts;
    private rejectedRetryPause;
    private headers;
    private waitingForHeaders;
    private validConnectionConfig;
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
    private connectDispatcher;
    private onConnect;
    private fireConnect;
    private disconnectDispatcher;
    private onDisconnect;
    private fireDisconnect;
    private connectionRejectedDispatcher;
    private onConnectionRejected;
    private fireConnectionRejected;
    private errorDispatcher;
    private onError;
    private fireError;
    private sentMessageDispatcher;
    private onSentMessage;
    private fireSentMessage;
    private blockNotifyDispatcher;
    private onBlockNotify;
    private fireBlockNotify;
    private txNotifyDispatcher;
    private onTxNotify;
    private fireTxNotify;
    private peerMessageDispatcher;
    private onPeerMessage;
    private firePeerMessage;
    private versionDispatcher;
    private onVersion;
    private fireVersion;
    on(event: string, handler: Handler<any>): void;
    /**
     * @param options: StartOptions = {
     *  name: string,
     *  peerMagic: string,
     *  disableTransactions: boolean,
     *  host: string,
     *  port: number,
     *  listenPort: number,
     *  protocolVersion: number,
     *  persist: boolean
     * }
     */
    constructor(options: StartOptions);
    startServer(): Promise<any>;
    connect(host?: string, port?: number): net.Socket;
    private sendVersion;
    private setupMessageParser;
    private handleInv;
    private handleVersion;
    private handleReject;
    private getHost;
    private getAddr;
    private handleAddr;
    private parseAddrMessage;
    private startPings;
    private sendPing;
    private handlePing;
    private sendHeadersBack;
    private handleHeaders;
    private handleHeaderRequest;
    private handleMessage;
    sendMessage(command: Buffer, payload: Buffer): void;
    internal(): any;
}
export {};
