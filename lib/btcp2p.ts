import * as net from 'net';

// class imports
import { Events } from './events/events';
import { Utils } from './util/general.util';
import { DbUtil } from './util/db.util';
import { Message } from './message/message';
import { API } from './api/api';

// interface imports
import { StartOptions, ProtocolScope, Version } from './interfaces/peer.interface';
import { HeadersEvent } from './interfaces/events.interface';
import { BestBlock } from './interfaces/blocks.interface';

// testing flag
const ENV = process.env.NODE_ENV;
const ENVS = {
  test: 'test'
};
// general consts
const MINUTE = 60 * 1000;

export class BTCP2P {
  private clientSocket!: net.Socket;
  private serverInstance!: net.Server;
  private serverSocket!: net.Socket;
  private serverStarting: boolean = false;
  private serverStarted: boolean = false;
  private serverPort!: number;
  private api!: API;
  private supportedProtocols: Array<string> = ['bitcoin', 'zcash'];

  private message!: Message; // for instantiation to avoid 'possibly undefined error'
  // separate scope package for client, server and internal
  private clientEvents: Events = new Events({client: true, server: false});
  public client: ProtocolScope = {
    events: this.clientEvents,
    on: this.clientEvents.on.bind(this.clientEvents),
    socket: this.clientSocket,
    message: this.message, // this will be overwritten
    connected: false,
    shared: {
      externalHeight: 0,
      internalHeight: 0,
      dbHeight: 0,
      synced: false
    }
  }
  private serverEvents: Events = new Events({client: false, server: true});
  public server: ProtocolScope = {
    events: this.serverEvents,
    on: this.serverEvents.on.bind(this.serverEvents),
    socket: this.serverSocket,
    message: this.message, // this will be overwritten
    connected: false,
    shared: {
      externalHeight: 0,
      internalHeight: 0,
      dbHeight: 0,
      synced: false
    }
  }

  protected util: Utils;
  protected dbUtil: DbUtil;

  private pings: any;
  private pingInterval = 5 * MINUTE;
  // if the remote peer acknowledges the version (verack), it can be considered connected
  private serverScopeInit = false;
  private clientScopeInit = false;

  protected rejectedRetryPause = MINUTE; // on disctonnect/reject
  protected errorRetryPause = 3 * MINUTE; // on node crash/restart

  private headers!: Buffer;
  private waitingForHeaders = false;

  private validConnectionConfig = true;

  private skipBlockDownload = false;
  private saveMempool = false;

  private defaultApiPort = 8080;

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

  constructor(private options: StartOptions) {
    this.util = new Utils(
      this.options.logLevel || 2
    )
    this.dbUtil = new DbUtil('nestdb', this.options.network.protocol);
    if (!!this.options.serverPort) {
      this.serverPort = this.options.serverPort;
    } else {
      this.serverPort = this.options.port;
    }
    if (this.supportedProtocols.indexOf(this.options.network.protocol) === -1) {
      throw new Error('protocol must be one of: ' + this.supportedProtocols.join(', '));
    }
    this.util.log('core', 'info', 'server port: ' + this.serverPort);

    this.clientEvents.on('connection_rejected', event => {
      this.util.log('core', 'critical', 'connection rejected');
      this.clientEvents.fire('error', {message: 'connection rejected, maybe banned, or old protocol version'});
      this.restartClient(this.rejectedRetryPause);
    });

    this.clientEvents.on('disconnect', event => {
      this.util.log('core', 'warn', 'client disconnected');
      this.restartClient(this.rejectedRetryPause);
    });

    if (this.options.skipTransactions == undefined) {
      this.options.skipTransactions = false;
    }

    if (
      this.options.skipBlockDownload !== undefined &&
      this.options.skipBlockDownload !== false
    ) {
      this.skipBlockDownload = true;
    }

    if (
      this.options.fetchMempool !== undefined &&
      this.options.fetchMempool !== false
    ) {
      this.saveMempool = true;
    }

    // start server if necessary and init connection
    if (this.options.startServer) {
      this.serverInstance = net.createServer((socket) => {
        this.util.log('core', 'debug', 'server created');
        this.serverSocket = socket;
        this.initServerScope(this.serverSocket);
        // this.initInternalScope(this.serverSocket);
      });
      this.startServer()
      .then(() => {
        this.util.log('core', 'info', 'server listening on port ' + this.serverPort);
        this.serverEvents.fireServerStart(true);
        this.initConnection();
      });
    } else {
      // if no server to start, just init connection
      this.initConnection();
    }

    if (this.options.api) {
      if (this.options.apiPort === undefined) {
        this.options.apiPort = this.defaultApiPort;
      }
      if (this.options.skipBlockDownload) {
        this.util.log('api', 'error', 'can\'t start api without data, set skipBlockDownload = false');
      } else {
        this.api = new API(this.options.apiPort, this.options, this.util, this.dbUtil);
      }
    }
  }

  public startServer(): Promise<any> {
    // not started by default unless specified
    return new Promise((resolve, reject) => {
      if (!this.serverStarted && !this.serverStarting) {
        this.util.log('core', 'info', 'server starting');
        this.serverStarting = true;
        this.serverInstance.listen(this.serverPort, () => {
          this.serverStarting = false;
          this.serverStarted = true;
          resolve(true);
        })
      } else {
        reject('server is either starting up or already started');
      }
    });
  }

  private startBlockFetch(scope: ProtocolScope): void {
    this.getInternalBlockHeight()
    .then((block: BestBlock) => {
      this.util.log('core', 'info', 'best block: ' + JSON.stringify(block));
      scope.message.blockHandler.blocks.startFetch(block)
      return;
    })
  }

  private getInternalBlockHeight(): Promise<BestBlock> {
    return this.dbUtil.getBestBlockHeight(this.options.name)
    .then((block: BestBlock): Promise<BestBlock> => {
      this.server.shared.internalHeight = block.height;
      this.server.shared.dbHeight = block.height;
      this.client.shared.internalHeight = block.height;
      this.client.shared.dbHeight = block.height;
      return Promise.resolve(block);
    });
  }

  private initServerScope(socket: net.Socket): void {
    if (!this.serverScopeInit) {
      this.serverScopeInit = true;
      this.util.log('core', 'debug', 'initializing server message & event handling');
      this.server.socket = socket;
      this.server.message = new Message(this.options, this.server, this.dbUtil);
      this.server.message.setupMessageParser();
      this.initEventHandlers(this.server);
    } else {
      this.util.log('core', 'debug', 'server message & event handling already instantiated');
    }
  }

  private initClientScope(socket: net.Socket): void {
    if (!this.clientScopeInit) {
      this.clientScopeInit = true;
      this.util.log('core', 'debug', 'initializing client message & event handling');
      this.client.socket = socket;
      this.client.message = new Message(this.options, this.client, this.dbUtil);
      this.client.message.setupMessageParser();
      this.initEventHandlers(this.client);
    } else {
      this.util.log('core', 'debug', 'client message & event handling already instantiated');
    }
  }

  public stopServer(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.util.log('core', 'info', 'server stopping');
      this.serverInstance.on('close', () => {
        this.util.log('core', 'info', 'server stopped');
        resolve();
      })
      this.serverInstance.close();
    })
  }

  private initConnection(): void {
    this.connect(this.options.host, this.options.port)
    .then((response) => {
      if (response.success) {
        this.util.log('core', 'info', 'client connection successful');
        this.clientSocket = response.socket;
        this.initClientScope(this.clientSocket);
        // this.initInternalScope(this.clientSocket);
        this.client.message.sendVersion();
      }
    });
  }

  public restartClient(wait: number): Promise<boolean> {
    if (this.options.persist && !this.client.connected) {
      return this.initRestartClient(wait);
    } else {
      return Promise.resolve(false);
    }
  }

  private initRestartClient(wait: number): Promise<boolean> {
    this.client.connected = false;
    this.clientSocket.end();
    this.clientSocket.destroy();
    clearInterval(this.pings);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.initConnection();
        resolve(true);
      }, wait);
    })
  }

  // client only
  private connect(host: string = '', port: number = 0): Promise<{success: boolean, socket: net.Socket}> {
    return new Promise((resolve, reject) => {
      const h = (host === '') ? this.options.host : host;
      const p = (port === 0) ? this.options.port : port;
      this.util.log('core', 'info', 'attempting to connect to ' + h + ':' + p);
      const client = net.connect({ host: h, port: p }, () => {
        resolve({
          success: true,
          socket: client
        });
      });
      client.on('close', () => {
        if (this.client.connected) {
          this.client.connected = false;
          this.clientEvents.fire('disconnect', {});
        } else if (this.validConnectionConfig) {
          this.clientEvents.fire('connection_rejected', {});
        }
      });
      client.on('error', (e: any) => {
        if (e.code === 'ECONNREFUSED') {
          this.clientEvents.fire('error', {message: 'connection failed'});
          resolve({
            success: false,
            socket: client
          });
        } else {
          this.clientEvents.fire('error', {message: 'socket error'});
        }
        this.restartClient(this.errorRetryPause);
      });
    })
  }

  private initEventHandlers(scope: ProtocolScope): void {
    let blockFetchStarted: boolean = false;
    let havePeerVersion: boolean = false;

    const tryStartActions = () => {
      if (scope.connected && havePeerVersion && !blockFetchStarted) {
        if (!this.skipBlockDownload) {
          blockFetchStarted = true;
          this.startBlockFetch(scope);
          if (this.options.api) {
            this.api.start();
          }
        }
        if (this.saveMempool) {
          scope.message.sendMessage(
            scope.message.commands.mempool,
            Buffer.from([])
          )
        }
      }
    }

    scope.events.on('verack', e => {
      if (!scope.connected) {
        scope.connected = true;
        scope.events.fire('connect', {});
        tryStartActions();
      }
    });
    scope.events.on('version', (version: Version) => {
      scope.shared.externalHeight = version.height;
      havePeerVersion = true;
      tryStartActions();
    })
    scope.events.on('getheaders', (payload: HeadersEvent) => {
      if (!this.headers) {
        this.waitingForHeaders = true;
        // scope.message.sendGetHeaders(payload.raw);
      } else {
        scope.message.sendHeaders(this.headers);
      }
    });
    scope.events.on('headers', (payload: HeadersEvent) => {
      if (this.waitingForHeaders) {
        this.headers = payload.raw;
        this.waitingForHeaders = false;
        // scope.message.sendHeaders(payload.raw);
        // scope.message.sendHeaders(
        //   Buffer.from([
        //     0x04000000,
        //     0x0000000000000000000000000000000000000000000000000000000000000000,
        //     0x2318b72b4e35d86f0c66c8c956fe7c3ae1ef7c33b835c58fdd9a1ed5f2b4852a,
        //   ])
        // )
      } else {
        this.headers = payload.raw;
      }
    });
  }

  private startPings(events: Events, socket: net.Socket): void {
    clearInterval(this.pings);
    this.pings = setInterval(() => {
      this.message.sendPing();
    }, this.pingInterval);
  }
}
