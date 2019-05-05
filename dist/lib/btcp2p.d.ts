import { Utils } from './util/general.util';
import { StartOptions, ProtocolScope } from './interfaces/peer.interface';
export declare class BTCP2P {
    private options;
    private clientSocket;
    private serverInstance;
    private serverSocket;
    private serverStarting;
    private serverStarted;
    private serverPort;
    private message;
    private clientEvents;
    client: ProtocolScope;
    private serverEvents;
    server: ProtocolScope;
    private internalEvents;
    protected internal: ProtocolScope;
    protected util: Utils;
    private pings;
    private pingInterval;
    private internalScopeInit;
    private serverScopeInit;
    private clientScopeInit;
    protected rejectedRetryPause: number;
    protected errorRetryPause: number;
    private headers;
    private waitingForHeaders;
    private validConnectionConfig;
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
     *  persist: boolean
     * }
     */
    constructor(options: StartOptions);
    startServer(): Promise<any>;
    private initInternalScope;
    private initServerScope;
    private initClientScope;
    stopServer(): Promise<any>;
    private initConnection;
    restartClient(wait: number): Promise<boolean>;
    private initRestartClient;
    private connect;
    private initEventHandlers;
    private startPings;
}
