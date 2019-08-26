/// <reference types="node" />
import * as net from 'net';
import { Events } from '../events/events';
import { Message } from '../message/message';
export interface NetworkOptions {
    magic: string;
    protocolVersion: number;
    protocol: string;
    genesisTarget: string;
    genesisHash: string;
    pubKeyVersion: number;
    scriptVersion: number;
}
export interface StartOptions {
    name: string;
    relayTransactions: boolean;
    host: string;
    port: number;
    serverPort?: number;
    startServer?: boolean;
    persist: boolean;
    skipBlockDownload?: boolean;
    fetchMempool?: boolean;
    skipTransactions?: boolean;
    network: NetworkOptions;
}
export interface Shared {
    externalHeight: number;
    internalHeight: number;
    dbHeight: number;
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
export interface Version {
    version: number;
    services: number;
    time: any;
    addr_recv: string;
    addr_from: string;
    nonce: string;
    client: string;
    height: number;
    relay: boolean;
}
