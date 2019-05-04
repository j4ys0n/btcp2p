import * as net from 'net';

// class imports
import { Events } from './events/events';
import { Utils } from './util/general.util';
import { Message } from './message/message';

// interface imports
import { StartOptions } from './interfaces/peer.interface';
import { HeadersEvent } from './interfaces/events.interface';

// testing flag
const ENV = process.env.NODE_ENV;
const ENVS = {
  test: 'test'
}
// general consts
const MINUTE = 60 * 1000;

export class BTCP2P {
  public client!: net.Socket;
  private server!: net.Server;
  public serverSocket!: net.Socket;
  private serverStarting: boolean = false;
  private serverStarted: boolean = false;
  private serverPort!: number;
  // separate event handlers for client and server (internal & external)
  protected clientEvents: Events = new Events();
  // protected internalClientEvents: Events = new Events();
  protected serverEvents: Events = new Events(true);
  // protected internalServerEvents: Events = new Events(true);
  // expose events to listen to for client and server
  public onClient = this.clientEvents.on.bind(this.clientEvents);
  public onServer = this.serverEvents.on.bind(this.serverEvents);

  protected util: Utils = new Utils();
  protected message!: Message;

  private pings: any;
  private pingInterval = 5 * MINUTE;
  // if the remote peer acknowledges the version (verack), it can be considered connected
  private clientConnected = false;
  private serverConnected = false;
  private clientEventHandlersAdded = false;

  protected rejectedRetryPause = MINUTE; // on disctonnect/reject
  protected errorRetryPause = 3 * MINUTE; // on node crash/restart

  private headers!: Buffer;
  private waitingForHeaders = false;

  private validConnectionConfig = true;

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

  constructor(private options: StartOptions) {
    //
    this.message = new Message({
      magic: this.options.peerMagic,
      protocolVersion: this.options.protocolVersion,
      relayTransactions: this.options.relayTransactions
    });

    if (!!this.options.serverPort) {
      this.serverPort = this.options.serverPort;
    } else {
      this.serverPort = this.options.port;
    }

    this.clientEvents.onConnectionRejected(event => {
      this.clientEvents.fireError({message: 'connection rejected, maybe banned, or old protocol version'});
      this.restartClient(this.rejectedRetryPause);
    });

    this.clientEvents.onDisconnect(event => {
      this.restartClient(this.rejectedRetryPause);
    });

    // start server if necessary and init connection
    if (this.options.startServer) {
      this.server = net.createServer((socket) => {
        this.serverSocket = socket;
        this.message.setupMessageParser(this.serverEvents, socket);
        this.serverEventHandlers(this.serverEvents, socket)
      });
      this.startServer()
      .then(() => {
        this.serverEvents.fireServerStart(true);
        this.initConnection();
      });
    } else {
      // if no server to start, just init connection
      this.initConnection();
    }
  }

  public startServer(): Promise<any> {
    // not started by default unless specified
    return new Promise((resolve, reject) => {
      if (!this.serverStarted && !this.serverStarting) {
        this.serverStarting = true;
        this.server.listen(this.serverPort, () => {
          console.log('  local server listening on', this.serverPort);
          this.serverStarting = false;
          this.serverStarted = true;
          resolve(true);
        })
      } else {
        reject('server is either starting up or already started');
      }
    });
  }

  public stopServer(): void {
    this.server.close();
  }

  private initConnection(): void {
    this.client = this.connect(this.options.host, this.options.port);
    this.message.setupMessageParser(this.clientEvents, this.client);
    if (!this.clientEventHandlersAdded) {
      this.clientEventHandlers(this.clientEvents, this.client);
    }
  }

  public restartClient(wait: number): Promise<boolean> {
    if (this.options.persist && !this.clientConnected) {
      return this.initRestartClient(wait);
    } else {
      return Promise.resolve(false);
    }
  }

  private initRestartClient(wait: number): Promise<boolean> {
    this.clientConnected = false;
    this.client.end();
    this.client.destroy();
    clearInterval(this.pings);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.initConnection();
        resolve(true);
      }, wait);
    })
  }

  // client only
  private connect(host: string = '', port: number = 0): net.Socket {
    const client = net.connect({
      host: (host === '') ? this.options.host : host,
      port: (port === 0) ? this.options.port : port
    }, () => {
      this.message.sendVersion(this.clientEvents, client);
      this.startPings(this.clientEvents, client);
    });
    client.on('close', () => {
      if (this.clientConnected) {
        this.clientConnected = false;
        this.clientEvents.fireDisconnect({});
      } else if (this.validConnectionConfig) {
        this.clientEvents.fireConnectionRejected({});
      }
    });
    client.on('error', (e: any) => {
      if (e.code === 'ECONNREFUSED') {
        this.clientEvents.fireError({message: 'connection failed'});
      } else {
        this.clientEvents.fireError({message: 'socket error'});
      }
      this.restartClient(this.errorRetryPause);
    });

    return client;
  }

  private clientEventHandlers(events: Events, socket: net.Socket): void {
    events.onVerack(e => {
      if (!this.clientConnected) {
        this.clientConnected = true;
        events.fireConnect({});
      }
    });
    events.onGetHeaders((payload: HeadersEvent) => {
      if (!this.headers) {
        this.waitingForHeaders = true;
        this.message.sendGetHeaders(payload.raw, events, socket);
      } else {
        this.message.sendHeaders(this.headers, events, socket);
      }
    });
    events.onHeaders((payload: HeadersEvent) => {
      if (this.waitingForHeaders) {
        this.headers = payload.raw;
        this.waitingForHeaders = false;
        this.message.sendHeaders(payload.raw, events, socket);
      } else {
        this.headers = payload.raw;
      }
    });
    this.clientEventHandlersAdded = true;
  }

  private serverEventHandlers(events: Events, socket: net.Socket): void {
    events.onVerack(e => {
      if (!this.serverConnected) {
        this.serverConnected = true;
        events.fireConnect({});
      }
    });
    events.onGetHeaders((payload: HeadersEvent) => {
      if (!this.headers) {
        this.waitingForHeaders = true;
        this.message.sendGetHeaders(payload.raw, events, socket);
      } else {
        this.message.sendHeaders(this.headers, events, socket);
      }
    });
    events.onHeaders((payload: HeadersEvent) => {
      if (this.waitingForHeaders) {
        this.headers = payload.raw;
        this.waitingForHeaders = false;
        this.message.sendHeaders(payload.raw, events, socket);
      } else {
        this.headers = payload.raw;
      }
    });
  }

  private startPings(events: Events, socket: net.Socket): void {
    clearInterval(this.pings);
    this.pings = setInterval(() => {
      this.message.sendPing(events, socket);
    }, this.pingInterval);
  }
}
