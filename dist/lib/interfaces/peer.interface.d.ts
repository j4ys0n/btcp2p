import * as net from 'net';
import { Events } from '../events/events';
import { Message } from '../message/message';
export interface StartOptions {
    name: string;
    magic: string;
    relayTransactions: boolean;
    host: string;
    port: number;
    serverPort?: number;
    startServer?: boolean;
    protocolVersion: number;
    protocol: string;
    genesisTarget: string;
    genesisHash: string;
    persist: boolean;
}
export interface Shared {
    externalHeight: number;
    internalHeight: number;
    synced: boolean;
}
export interface ProtocolScope {
    events: Events;
    on: Events['on'];
    socket: net.Socket;
    message: Message;
    connected: boolean;
    shared: Shared;
}
export interface PeerAddress {
    hostRaw: Buffer;
    host: String;
    port: Number;
    ipVersion: Number;
    services?: String;
    timestamp?: Number;
}
