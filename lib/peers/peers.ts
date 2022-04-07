import { MessageParser } from '../util/Message'

import { PeerAddress, ProtocolScope } from '../interfaces/peer.interface';
import { AddressEvent } from '../interfaces/events.interface';

const IPV6_IPV4_PADDING = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);

export class PeerHandler {
  constructor(private scope: ProtocolScope) {}

  private getHost(buff: Buffer): {host: string; version: number} {
    if (buff.slice(0,12).toString('hex') === IPV6_IPV4_PADDING.toString('hex')) {
      //IPv4
      return { host: buff.slice(12).join('.'), version: 4 };
    } else {
      //IPv6
      // non-null type guard (!) https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Advanced%20Types.md#type-guards-and-type-assertions
      return { host: buff.slice(0,16).toString('hex')
        .match(/(.{1,4})/g)!
        .join(':')
        .replace(/\:(0{1,3})/g, ':')
        .replace(/^(0{1,3})/g, ''),
        version: 6 };
    }
  }

  private getAddr(buff: Buffer): PeerAddress {
    let addr: PeerAddress = {
      hostRaw: Buffer.from([]),
      host: '',
      port: 0,
      ipVersion: 0
    };
    let host = {
      host: '',
      version: 0
    }
    let svc: Buffer;
    if (buff.length === 30) {
      addr.timestamp = buff.readUInt32LE(0) * 1000; // to miliseconds
      svc = Buffer.allocUnsafe(8);
      buff.copy(svc, 0, 4, 12);
      addr.services = svc.toString('hex');
      addr.hostRaw = Buffer.allocUnsafe(16);
      buff.copy(addr.hostRaw, 0, 12, 28);
      host = this.getHost(addr.hostRaw);
      addr.host = host.host;
      addr.ipVersion = host.version;
      addr.port = buff.readUInt16BE(28);
    } else {
      /* istanbul ignore next */
      this.scope.events.fire('error', {message: 'address field length not 30', payload: buff});
    }
    return addr;
  }

  private parseAddrMessage(payload: Buffer): PeerAddress[] {
    const s = new MessageParser(payload);
    let addrs: Array<PeerAddress> = [];
    let addrNum = s.readVarInt() || 0;
    for (let i = 0; i < addrNum; i++) {
      const addr: PeerAddress = this.getAddr(<Buffer>s.raw(30));
      addrs.push(addr);
    }
    return addrs;
  }

  handleAddr(payload: Buffer): Promise<AddressEvent> {
    const addrs: AddressEvent = {
      addresses: this.parseAddrMessage(payload)
    };
    this.scope.events.fire('addr', addrs);
    return Promise.resolve(addrs);
  }
}
