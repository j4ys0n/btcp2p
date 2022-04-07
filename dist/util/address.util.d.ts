import { StartOptions } from '../interfaces/peer.interface';
export declare class AddressUtil {
    private options;
    constructor(options: StartOptions);
    classifyHex(hex: string): string;
    encodePubKeyAddress(hex: string): string;
    encodeMultisigAddress(hex: string): string;
    encodeAddress(type: string, hex: string): string;
    classifyAndEncodeAddress(hex: string): string;
}
