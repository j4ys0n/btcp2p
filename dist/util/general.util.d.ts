/// <reference types="node" />
export declare class Utils {
    sha256(buffer: Buffer): Buffer;
    sha256d(buffer: Buffer): Buffer;
    varIntBuffer(n: number): Buffer;
    packUInt16LE(num: number): Buffer;
    packUInt32LE(num: number): Buffer;
    packInt64LE(num: number): Buffer;
    varStringBuffer(s: string): Buffer;
}
