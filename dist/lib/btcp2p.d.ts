/// <reference types="node" />
import * as net from 'net';
import { Events } from './events/events';
import { Utils } from './util/general.util';
import { Message } from './message/message';
import { StartOptions } from './interfaces/peer.interface';
export declare class BTCP2P {
    private options;
    client: net.Socket;
    private server;
    serverSocket: net.Socket;
    private serverStarting;
    private serverStarted;
    private serverPort;
    protected clientEvents: Events;
    protected serverEvents: Events;
    onClient: (event: string, handler: import("./events/events").Handler<any>) => void;
    onServer: (event: string, handler: import("./events/events").Handler<any>) => void;
    protected util: Utils;
    protected message: Message;
    private pings;
    private pingInterval;
    private clientConnected;
    private serverConnected;
    private clientEventHandlersAdded;
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
    stopServer(): void;
    private initConnection;
    restartClient(wait: number): Promise<boolean>;
    private initRestartClient;
    private connect;
    private clientEventHandlers;
    private serverEventHandlers;
    private startPings;
}
