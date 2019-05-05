import { ProtocolScope } from '../interfaces/peer.interface';
import { AddressEvent } from '../interfaces/events.interface';
export declare class PeerHandler {
    private scope;
    constructor(scope: ProtocolScope);
    private getHost;
    private getAddr;
    private parseAddrMessage;
    handleAddr(payload: Buffer): Promise<AddressEvent>;
}
