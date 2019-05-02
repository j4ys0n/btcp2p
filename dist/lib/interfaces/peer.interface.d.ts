export interface StartOptions {
    name: string;
    peerMagic: string;
    disableTransactions: boolean;
    host: string;
    port: number;
    listenPort?: number;
    protocolVersion: number;
    persist: boolean;
}
export interface PeerAddress {
    hostRaw: Buffer;
    host: String;
    port: Number;
    ipVersion: Number;
    services?: String;
    timestamp?: Number;
}
