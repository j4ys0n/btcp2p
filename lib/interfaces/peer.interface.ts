
export interface PeerAddress {
  hostRaw: Buffer;
  host: String;
  port: Number;
  ipVersion: Number;
  services?: String;
  timestamp?: Number;
}
