import {
  ConnectEvent, DisconnectEvent, ConnectionRejectedEvent,
  SentMessageEvent, PeerMessageEvent, BlockNotifyEvent,
  TxNotifyEvent, ErrorEvent, VersionEvent, RejectedEvent
} from '../interfaces/events.interface';


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
  constructor() {}
  // connect
  private connectDispatcher = new EventDispatcher<ConnectEvent>();
  public onConnect(handler: Handler<ConnectEvent>): void {
    this.connectDispatcher.register(handler);
  }
  public fireConnect(event: ConnectEvent): void {
    this.connectDispatcher.fire(event);
  }
  public clearConnect(): void {
    this.connectDispatcher.clear();
  }
  // disconnect
  private disconnectDispatcher = new EventDispatcher<DisconnectEvent>();
  public onDisconnect(handler: Handler<DisconnectEvent>): void {
    this.disconnectDispatcher.register(handler);
  }
  public fireDisconnect(event: DisconnectEvent): void {
    this.disconnectDispatcher.fire(event);
  }
  public clearDisconnect(): void {
    this.disconnectDispatcher.clear();
  }
  // connection rejected
  private connectionRejectedDispatcher = new EventDispatcher<ConnectionRejectedEvent>();
  public onConnectionRejected(handler: Handler<ConnectionRejectedEvent>): void {
    this.connectionRejectedDispatcher.register(handler);
  }
  public fireConnectionRejected(event: ConnectionRejectedEvent): void {
    this.connectionRejectedDispatcher.fire(event);
  }
  public clearConnectionRejected(): void {
    this.connectionRejectedDispatcher.clear();
  }
  // error
  private errorDispatcher = new EventDispatcher<ErrorEvent>();
  public onError(handler: Handler<ErrorEvent>): void {
    this.errorDispatcher.register(handler);
  }
  public fireError(event: ErrorEvent): void {
    this.errorDispatcher.fire(event);
  }
  public clearError(): void {
    this.errorDispatcher.clear();
  }
  // error
  private rejectDispatcher = new EventDispatcher<RejectedEvent>();
  public onReject(handler: Handler<RejectedEvent>): void {
    this.rejectDispatcher.register(handler);
  }
  public fireReject(event: RejectedEvent): void {
    this.rejectDispatcher.fire(event);
  }
  public clearReject(): void {
    this.rejectDispatcher.clear();
  }
  // message
  private sentMessageDispatcher = new EventDispatcher<SentMessageEvent>();
  public onSentMessage(handler: Handler<SentMessageEvent>): void {
    this.sentMessageDispatcher.register(handler);
  }
  public fireSentMessage(event: SentMessageEvent): void {
    this.sentMessageDispatcher.fire(event);
  }
  public clearSentMessage(): void {
    this.sentMessageDispatcher.clear();
  }
  // block notify
  private blockNotifyDispatcher = new EventDispatcher<BlockNotifyEvent>();
  public onBlockNotify(handler: Handler<BlockNotifyEvent>): void {
    this.blockNotifyDispatcher.register(handler);
  }
  public fireBlockNotify(event: BlockNotifyEvent): void {
    this.blockNotifyDispatcher.fire(event);
  }
  public clearBlockNotify(): void {
    this.blockNotifyDispatcher.clear();
  }
  // tx notify
  private txNotifyDispatcher = new EventDispatcher<TxNotifyEvent>();
  public onTxNotify(handler: Handler<TxNotifyEvent>): void {
    this.txNotifyDispatcher.register(handler);
  }
  public fireTxNotify(event: TxNotifyEvent): void {
    this.txNotifyDispatcher.fire(event);
  }
  public clearTxNotify(): void {
    this.txNotifyDispatcher.clear();
  }
  // peer message
  private peerMessageDispatcher = new EventDispatcher<PeerMessageEvent>();
  public onPeerMessage(handler: Handler<PeerMessageEvent>): void {
    this.peerMessageDispatcher.register(handler);
  }
  public firePeerMessage(event: PeerMessageEvent): void {
    this.peerMessageDispatcher.fire(event);
  }
  public clearPeerMessage(): void {
    this.peerMessageDispatcher.clear();
  }
  // version message
  private versionDispatcher = new EventDispatcher<VersionEvent>();
  public onVersion(handler: Handler<VersionEvent>): void {
    this.versionDispatcher.register(handler);
  }
  public fireVersion(event: VersionEvent): void {
    this.versionDispatcher.fire(event);
  }
  public clearVersion(): void {
    this.versionDispatcher.clear();
  }
  // version message
  private verackDispatcher = new EventDispatcher<Boolean>();
  public onVerack(handler: Handler<Boolean>): void {
    this.verackDispatcher.register(handler);
  }
  public fireVerack(event: Boolean): void {
    this.verackDispatcher.fire(event);
  }
  public clearVerack(): void {
    this.verackDispatcher.clear();
  }
  // ping
  private pingDispatcher = new EventDispatcher<Buffer>();
  public onPing(handler: Handler<Buffer>): void {
    this.pingDispatcher.register(handler);
  }
  public firePing(event: Buffer): void {
    this.pingDispatcher.fire(event);
  }
  public clearPing(): void {
    this.pingDispatcher.clear();
  }
  // pong
  private pongDispatcher = new EventDispatcher<Buffer>();
  public onPong(handler: Handler<Buffer>): void {
    this.pongDispatcher.register(handler);
  }
  public firePong(event: Buffer): void {
    this.pongDispatcher.fire(event);
  }
  public clearPong(): void {
    this.pongDispatcher.clear();
  }
  // addresses received
  private addrDispatcher = new EventDispatcher<any>();
  public onAddr(handler: Handler<any>): void {
    this.addrDispatcher.register(handler);
  }
  public fireAddr(event: any): void {
    this.addrDispatcher.fire(event);
  }
  public clearAddr(): void {
    this.addrDispatcher.clear();
  }

  // event handlers
  public on(event: string, handler: Handler<any>): void {
    switch(event) {
      case 'connect':
        this.onConnect(handler);
        break;
      case 'disconnect':
        this.onDisconnect(handler);
        break;
      case 'version':
        this.onVersion(handler);
        break;
      case 'verack':
        this.onVerack(handler);
        break;
      case 'ping':
        this.onPing(handler);
        break;
      case 'pong':
        this.onPong(handler);
        break;
      case 'error':
        this.onError(handler);
        break;
      case 'reject':
        this.onReject(handler);
        break;
      case 'block':
        this.onBlockNotify(handler);
        break;
      case 'tx':
        this.onTxNotify(handler);
        break;
      case 'addr':
        this.onAddr(handler);
        break;
      case 'peer_message':
        this.onPeerMessage(handler);
        break;
      case 'sent_message':
        this.onSentMessage(handler);
        break;
      default:
        this.fireError({
          message: event + ' event does not exist',
          payload: new Error()
        });
        break;
    }
  }
}
