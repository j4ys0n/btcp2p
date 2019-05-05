import * as net from 'net';
import { Events } from '../events/events';
import { Message } from '../message/message';

export interface StartOptions {
  name: string;
  peerMagic: string;
  relayTransactions: boolean;
  host: string;
  port: number;
  serverPort?: number;
  startServer?: boolean;
  protocolVersion: number;
  persist: boolean;
}

export interface ProtocolScope {
  events: Events;
  on: Events['on'];
  socket: net.Socket;
  message: Message;
  connected: boolean;
}

export interface PeerAddress {
  hostRaw: Buffer;
  host: String;
  port: Number;
  ipVersion: Number;
  services?: String;
  timestamp?: Number;
}
