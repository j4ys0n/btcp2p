import { Utils } from '../util/general.util';

import {
  ConnectEvent, DisconnectEvent, ConnectionRejectedEvent,
  SentMessageEvent, PeerMessageEvent, BlockNotifyEvent,
  TxEvent, TxInvEvent, ErrorEvent, VersionEvent, RejectedEvent,
  AddressEvent
} from '../interfaces/events.interface';

import {
  Block, BlockZcash
} from '../interfaces/blocks.interface'

export interface EventsScope {
  client: boolean;
  server: boolean;
  scopes?: {
    clientEvents: Events;
    serverEvents: Events;
  };
}

export type Handler<E> = (event: E) => void;

class EventDispatcher<E> {
  private handlers: Handler<E>[] = [];
  fire(event: E) {
    for (let h of this.handlers) {
      h(event);
    }
  }
  register(handler: Handler<E>) {
    this.handlers.push(handler);
  }
  clear() {
    this.handlers = [];
  }
}

export class Events {
  private util: Utils = new Utils();
  private scopedTo: string = ''
  constructor(protected scope: EventsScope = {client: true, server: false}) {
    this.scopedTo = (scope.client) ? 'client' : (scope.server) ? 'server' : 'internal';
    this.util.log('core', 'debug', 'initializing events for ' + this.scopedTo);
  }
  // connect
  private connectDispatcher = new EventDispatcher<ConnectEvent>();
  private onConnect(handler: Handler<ConnectEvent>): void {
    this.connectDispatcher.register(handler);
  }
  private fireConnect(event: ConnectEvent): void {
    this.connectDispatcher.fire(event);
  }
  public clearConnect(): void {
    this.connectDispatcher.clear();
  }
  // disconnect
  private disconnectDispatcher = new EventDispatcher<DisconnectEvent>();
  private onDisconnect(handler: Handler<DisconnectEvent>): void {
    this.disconnectDispatcher.register(handler);
  }
  private fireDisconnect(event: DisconnectEvent): void {
    this.disconnectDispatcher.fire(event);
  }
  public clearDisconnect(): void {
    this.disconnectDispatcher.clear();
  }
  // connection rejected
  private connectionRejectedDispatcher = new EventDispatcher<ConnectionRejectedEvent>();
  private onConnectionRejected(handler: Handler<ConnectionRejectedEvent>): void {
    this.connectionRejectedDispatcher.register(handler);
  }
  private fireConnectionRejected(event: ConnectionRejectedEvent): void {
    this.connectionRejectedDispatcher.fire(event);
  }
  public clearConnectionRejected(): void {
    this.connectionRejectedDispatcher.clear();
  }
  // error
  private errorDispatcher = new EventDispatcher<ErrorEvent>();
  private onError(handler: Handler<ErrorEvent>): void {
    this.errorDispatcher.register(handler);
  }
  private fireError(event: ErrorEvent): void {
    this.errorDispatcher.fire(event);
  }
  public clearError(): void {
    this.errorDispatcher.clear();
  }
  // error
  private rejectDispatcher = new EventDispatcher<RejectedEvent>();
  private onReject(handler: Handler<RejectedEvent>): void {
    this.rejectDispatcher.register(handler);
  }
  private fireReject(event: RejectedEvent): void {
    this.rejectDispatcher.fire(event);
  }
  public clearReject(): void {
    this.rejectDispatcher.clear();
  }
  // message
  private sentMessageDispatcher = new EventDispatcher<SentMessageEvent>();
  private onSentMessage(handler: Handler<SentMessageEvent>): void {
    this.sentMessageDispatcher.register(handler);
  }
  private fireSentMessage(event: SentMessageEvent): void {
    this.sentMessageDispatcher.fire(event);
  }
  public clearSentMessage(): void {
    this.sentMessageDispatcher.clear();
  }
  // block notify
  private blockDispatcher = new EventDispatcher<Block | BlockZcash>();
  private onBlock(handler: Handler<Block | BlockZcash>): void {
    this.blockDispatcher.register(handler);
  }
  private fireBlock(event: Block | BlockZcash): void {
    this.blockDispatcher.fire(event);
  }
  public clearBlock(): void {
    this.blockDispatcher.clear();
  }
  // block inv notify
  private blockInvDispatcher = new EventDispatcher<Buffer>();
  private onBlockInv(handler: Handler<Buffer>): void {
    this.blockInvDispatcher.register(handler);
  }
  private fireBlockInv(event: Buffer): void {
    this.blockInvDispatcher.fire(event);
  }
  public clearBlockInv(): void {
    this.blockInvDispatcher.clear();
  }
  // tx notify
  private txDispatcher = new EventDispatcher<TxEvent>();
  private onTx(handler: Handler<TxEvent>): void {
    this.txDispatcher.register(handler);
  }
  private fireTx(event: TxEvent): void {
    this.txDispatcher.fire(event);
  }
  public clearTx(): void {
    this.txDispatcher.clear();
  }
  // tx inv notify
  private txInvDispatcher = new EventDispatcher<TxEvent>();
  private onTxInv(handler: Handler<TxEvent>): void {
    this.txInvDispatcher.register(handler);
  }
  private fireTxInv(event: TxEvent): void {
    this.txInvDispatcher.fire(event);
  }
  public clearTxInv(): void {
    this.txInvDispatcher.clear();
  }
  // peer message
  private peerMessageDispatcher = new EventDispatcher<PeerMessageEvent>();
  private onPeerMessage(handler: Handler<PeerMessageEvent>): void {
    this.peerMessageDispatcher.register(handler);
  }
  private firePeerMessage(event: PeerMessageEvent): void {
    this.peerMessageDispatcher.fire(event);
  }
  public clearPeerMessage(): void {
    this.peerMessageDispatcher.clear();
  }
  // version message
  private versionDispatcher = new EventDispatcher<VersionEvent>();
  private onVersion(handler: Handler<VersionEvent>): void {
    this.versionDispatcher.register(handler);
  }
  private fireVersion(event: VersionEvent): void {
    this.versionDispatcher.fire(event);
  }
  public clearVersion(): void {
    this.versionDispatcher.clear();
  }
  // version message
  private verackDispatcher = new EventDispatcher<Boolean>();
  private onVerack(handler: Handler<Boolean>): void {
    this.verackDispatcher.register(handler);
  }
  private fireVerack(event: Boolean): void {
    this.verackDispatcher.fire(event);
  }
  public clearVerack(): void {
    this.verackDispatcher.clear();
  }
  // ping
  private pingDispatcher = new EventDispatcher<Buffer>();
  private onPing(handler: Handler<Buffer>): void {
    this.pingDispatcher.register(handler);
  }
  private firePing(event: Buffer): void {
    this.pingDispatcher.fire(event);
  }
  public clearPing(): void {
    this.pingDispatcher.clear();
  }
  // pong
  private pongDispatcher = new EventDispatcher<Buffer>();
  private onPong(handler: Handler<Buffer>): void {
    this.pongDispatcher.register(handler);
  }
  private firePong(event: Buffer): void {
    this.pongDispatcher.fire(event);
  }
  public clearPong(): void {
    this.pongDispatcher.clear();
  }
  // addresses received
  private addrDispatcher = new EventDispatcher<AddressEvent>();
  private onAddr(handler: Handler<AddressEvent>): void {
    this.addrDispatcher.register(handler);
  }
  private fireAddr(event: AddressEvent): void {
    this.addrDispatcher.fire(event);
  }
  public clearAddr(): void {
    this.addrDispatcher.clear();
  }
  // headers requested (getheaders)
  private getHeadersDispatcher = new EventDispatcher<any>();
  private onGetHeaders(handler: Handler<any>): void {
    this.getHeadersDispatcher.register(handler);
  }
  private fireGetHeaders(event: any): void {
    this.getHeadersDispatcher.fire(event);
  }
  public clearGetHeaders(): void {
    this.getHeadersDispatcher.clear();
  }
  // headers send (headers)
  private headersDispatcher = new EventDispatcher<any>();
  private onHeaders(handler: Handler<any>): void {
    this.headersDispatcher.register(handler);
  }
  private fireHeaders(event: any): void {
    this.headersDispatcher.fire(event);
  }
  public clearHeaders(): void {
    this.headersDispatcher.clear();
  }

  // not found
  private notFoundDispatcher = new EventDispatcher<any>();
  private onNotFound(handler: Handler<any>): void {
    this.notFoundDispatcher.register(handler);
  }
  public fireNotFound(event: any): void {
    this.notFoundDispatcher.fire(event);
  }
  private clearNotFound(): void {
    this.notFoundDispatcher.clear();
  }

  // server only events
  private serverStartDispatcher = new EventDispatcher<boolean>();
  public onServerStart(handler: Handler<boolean>): void {
    if (this.scope.server) {
      this.serverStartDispatcher.register(handler);
    }
  }
  public fireServerStart(event: boolean): void {
    if (this.scope.server) {
      this.serverStartDispatcher.fire(event);
    }
  }
  public clearServerStart(): void {
    if (this.scope.server) {
      this.serverStartDispatcher.clear();
    }
  }

  public fire(event: string, payload: any): void {
    const command = (payload.command) ? ' -->' + payload.command : ''
    this.util.log('core', 'debug', '[' + this.scopedTo + '] firing event for ' + event + command);
    const triggerMapping = {
      'connect': this.fireConnect,
      'connection_rejected': this.fireConnectionRejected,
      'disconnect': this.fireDisconnect,
      'version': this.fireVersion,
      'verack': this.fireVerack,
      'ping': this.firePing,
      'pong': this.firePong,
      'error': this.fireError,
      'reject': this.fireReject,
      'block': this.fireBlock,
      'blockinv': this.fireBlockInv,
      'tx': this.fireTx,
      'txinv': this.fireTxInv,
      'addr': this.fireAddr,
      'getheaders': this.fireGetHeaders,
      'headers': this.fireHeaders,
      'peer_message': this.firePeerMessage,
      'sent_message': this.fireSentMessage,
      'notfound': this.fireNotFound
    }
    const keys = Object.keys(triggerMapping);
    if (keys.indexOf(event) > -1) {
      const trigger = triggerMapping[event].bind(this);
      trigger(payload);
    } else {
      this.fireError({
        message: event + ' event does not exist',
        payload: new Error()
      });
    }
  }

  // event handlers
  public on(event: string, handler: Handler<any>): void {
    this.util.log('core', 'debug', '[' + this.scopedTo + '] adding event listener for ' + event);
    const handlerMapping = {
      'connect': this.onConnect,
      'connection_rejected': this.onConnectionRejected,
      'disconnect': this.onDisconnect,
      'version': this.onVersion,
      'verack': this.onVerack,
      'ping': this.onPing,
      'pong': this.onPong,
      'error': this.onError,
      'reject': this.onReject,
      'block': this.onBlock,
      'blockinv': this.onBlockInv,
      'tx': this.onTx,
      'txinv': this.onTxInv,
      'addr': this.onAddr,
      'getheaders': this.onGetHeaders,
      'headers': this.onHeaders,
      'peer_message': this.onPeerMessage,
      'sent_message': this.onSentMessage,
      'notfound': this.onNotFound
    }
    const keys = Object.keys(handlerMapping);
    if (keys.indexOf(event) > -1) {
      const registerHandler = handlerMapping[event].bind(this);
      registerHandler(handler);
    } else {
      this.fireError({
        message: event + ' event does not exist',
        payload: new Error()
      });
    }
  }

  public clearAllListeners(): void {
    this.clearConnect();
    this.clearDisconnect();
    this.clearVersion();
    this.clearVerack();
    this.clearPing();
    this.clearPong();
    this.clearError();
    this.clearReject();
    this.clearBlock();
    this.clearTx();
    this.clearAddr();
    this.clearGetHeaders();
    this.clearPeerMessage();
    this.clearSentMessage();
    this.clearNotFound();
  }
}
