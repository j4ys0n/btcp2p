
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

export interface PeerAddress {
  hostRaw: Buffer;
  host: String;
  port: Number;
  ipVersion: Number;
  services?: String;
  timestamp?: Number;
}
