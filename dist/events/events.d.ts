export interface EventsScope {
    client: boolean;
    server: boolean;
    scopes?: {
        clientEvents: Events;
        serverEvents: Events;
    };
}
export declare type Handler<E> = (event: E) => void;
export declare class Events {
    protected scope: EventsScope;
    private util;
    private scopedTo;
    constructor(scope?: EventsScope);
    private connectDispatcher;
    private onConnect;
    private fireConnect;
    clearConnect(): void;
    private disconnectDispatcher;
    private onDisconnect;
    private fireDisconnect;
    clearDisconnect(): void;
    private connectionRejectedDispatcher;
    private onConnectionRejected;
    private fireConnectionRejected;
    clearConnectionRejected(): void;
    private errorDispatcher;
    private onError;
    private fireError;
    clearError(): void;
    private rejectDispatcher;
    private onReject;
    private fireReject;
    clearReject(): void;
    private sentMessageDispatcher;
    private onSentMessage;
    private fireSentMessage;
    clearSentMessage(): void;
    private blockDispatcher;
    private onBlock;
    private fireBlock;
    clearBlock(): void;
    private blockInvDispatcher;
    private onBlockInv;
    private fireBlockInv;
    clearBlockInv(): void;
    private txDispatcher;
    private onTx;
    private fireTx;
    clearTx(): void;
    private txInvDispatcher;
    private onTxInv;
    private fireTxInv;
    clearTxInv(): void;
    private peerMessageDispatcher;
    private onPeerMessage;
    private firePeerMessage;
    clearPeerMessage(): void;
    private versionDispatcher;
    private onVersion;
    private fireVersion;
    clearVersion(): void;
    private verackDispatcher;
    private onVerack;
    private fireVerack;
    clearVerack(): void;
    private pingDispatcher;
    private onPing;
    private firePing;
    clearPing(): void;
    private pongDispatcher;
    private onPong;
    private firePong;
    clearPong(): void;
    private addrDispatcher;
    private onAddr;
    private fireAddr;
    clearAddr(): void;
    private getHeadersDispatcher;
    private onGetHeaders;
    private fireGetHeaders;
    clearGetHeaders(): void;
    private headersDispatcher;
    private onHeaders;
    private fireHeaders;
    clearHeaders(): void;
    private notFoundDispatcher;
    private onNotFound;
    fireNotFound(event: any): void;
    private clearNotFound;
    private serverStartDispatcher;
    onServerStart(handler: Handler<boolean>): void;
    fireServerStart(event: boolean): void;
    clearServerStart(): void;
    fire(event: string, payload: any): void;
    on(event: string, handler: Handler<any>): void;
    clearAllListeners(): void;
}
