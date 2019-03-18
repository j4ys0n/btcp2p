export interface ConnectEvent {}
export interface DisconnectEvent {}
export interface ConnectionRejectedEvent {}
export interface SentMessageEvent {
  command: string;
  payload?: any;
}
export interface PeerMessageEvent {
  command: string;
  payload?: any;
}
export interface BlockNotifyEvent {
  hash: string;
}
export interface TxNotifyEvent {
  hash: string;
}
export interface ErrorEvent {
  message: string;
  payload?: any;
}
export interface VersionEvent {
  version: number;
  services: number;
  time: Date;
  addr_recv: string;
  addr_from: string;
  nonce: string;
  client: string;
  height: number;
  relay: boolean;
}
