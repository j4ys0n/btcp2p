import { Utils } from './util/general.util';
import { DbUtil } from './util/db.util';
import { StartOptions, ProtocolScope } from './interfaces/peer.interface';
export declare class BTCP2P {
    private options;
    private clientSocket;
    private serverInstance;
    private serverSocket;
    private serverStarting;
    private serverStarted;
    private serverPort;
    private api;
    private supportedProtocols;
    private message;
    private clientEvents;
    client: ProtocolScope;
    private serverEvents;
    server: ProtocolScope;
    protected util: Utils;
    protected dbUtil: DbUtil;
    private pings;
    private pingInterval;
    private serverScopeInit;
    private clientScopeInit;
    protected connectRetryPause: number;
    private headers;
    private waitingForHeaders;
    private validConnectionConfig;
    private skipBlockDownload;
    private skipBlockProcessing;
    private saveMempool;
    private defaultApiPort;
    /**
     * @param options: StartOptions = {
     *  name: string,
     *  peerMagic: string,
     *  relayTransactions: boolean,
     *  host: string,
     *  port: number,
     *  serverPort: number,
     *  startServer: boolean,
     *  protocolVersion: number,
     *  protocol: string,
     *  persist: boolean
     * }
     */
    constructor(options: StartOptions);
    startServer(): Promise<any>;
    private startBlockFetch;
    private getInternalBlockHeight;
    private initServerScope;
    private initClientScope;
    stopServer(): Promise<void>;
    private initConnection;
    restartClient(wait: number): Promise<boolean>;
    private initRestartClient;
    private connect;
    private initEventHandlers;
    private startPings;
}
