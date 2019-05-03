/// <reference types="node" />
import * as net from 'net';
import { Events } from '../events/events';
import { Utils } from '../util/general.util';
import { MessageHandlers } from './message.handlers';
export interface MessageOptions {
    magic: string;
    protocolVersion: number;
    relayTransactions: boolean;
}
export declare class Message {
    private messageOptions;
    protected util: Utils;
    protected handlers: MessageHandlers;
    private magic;
    private magicInt;
    private networkServices;
    private emptyNetAddress;
    private userAgent;
    private blockStartHeight;
    private relayTransactions;
    commands: {
        addr: Buffer;
        alert: Buffer;
        block: Buffer;
        blocktxn: Buffer;
        checkorder: Buffer;
        feefilter: Buffer;
        getaddr: Buffer;
        getblocks: Buffer;
        getblocktxn: Buffer;
        getdata: Buffer;
        getheaders: Buffer;
        headers: Buffer;
        inv: Buffer;
        mempool: Buffer;
        notfound: Buffer;
        ping: Buffer;
        pong: Buffer;
        reject: Buffer;
        reply: Buffer;
        sendcmpct: Buffer;
        sendheaders: Buffer;
        submitorder: Buffer;
        tx: Buffer;
        verack: Buffer;
        version: Buffer;
    };
    /**
     * @param messageOptions: MessageOptions = {
     *  magic: string,
     *  relayTransactions: boolean,
     *  protocolVersion: number,
     * }
     */
    constructor(messageOptions: MessageOptions);
    sendMessage(command: Buffer, payload: Buffer, socket: net.Socket): void;
    sendVersion(events: Events, socket: net.Socket): void;
    sendPing(events: Events, socket: net.Socket): void;
    sendHeaders(payload: Buffer, events: Events, socket: net.Socket): void;
    sendGetHeaders(payload: Buffer, events: Events, socket: net.Socket): void;
    sendGetAddr(events: Events, socket: net.Socket): void;
    sendGetBlocks(events: Events, socket: net.Socket, hash: string): void;
    sendAddr(events: Events, socket: net.Socket, ip: string, port: number): void;
    sendReject(msg: string, ccode: number, reason: string, extra: string, socket: net.Socket): void;
    setupMessageParser(events: Events, socket: net.Socket): void;
    private ipTo16ByteBuffer;
    private handleMessage;
}
