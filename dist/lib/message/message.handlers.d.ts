/// <reference types="node" />
import { Utils } from '../util/general.util';
import { Events } from '../events/events';
import { RejectedEvent, AddressEvent, HeadersEvent } from '../interfaces/events.interface';
export interface Nonce {
    nonce: Buffer;
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
export declare class MessageHandlers {
    private util;
    protected invCodes: {
        error: number;
        tx: number;
        block: number;
        blockFiltered: number;
        blockCompact: number;
    };
    protected rejectCodes: {
        1: string;
        10: string;
        11: string;
        12: string;
        40: string;
        41: string;
        42: string;
        43: string;
    };
    constructor(util: Utils);
    handlePing(payload: Buffer, events: Events): Promise<Nonce>;
    handlePong(payload: Buffer, events: Events): Promise<Nonce>;
    handleReject(payload: Buffer, events: Events): Promise<RejectedEvent>;
    handleVersion(payload: Buffer, events: Events): Promise<Version>;
    handleAddr(payload: Buffer, events: Events): Promise<AddressEvent>;
    parseHashes(hashLen: number, mParser: any): Array<string>;
    handleGetHeaders(payload: Buffer, events: Events): Promise<HeadersEvent>;
    parseHeaders(count: number, mParser: any): Array<any>;
    handleHeaders(payload: Buffer, events: Events): Promise<HeadersEvent>;
    handleInv(payload: Buffer, events: Events): void;
    private parseNonce;
    private getHost;
    private getAddr;
    private parseAddrMessage;
}
