/// <reference types="node" />
export declare class Utils {
    logLevel: number;
    constructor(logLevel?: number);
    log(component: string, level: string, message: any): void;
    sha256(buffer: Buffer): Buffer;
    sha256d(buffer: Buffer): Buffer;
    varIntBuffer(n: number): Buffer;
    packUInt16LE(num: number): Buffer;
    packUInt16BE(num: number): Buffer;
    packUInt32LE(num: number): Buffer;
    packInt64LE(num: number): Buffer;
    varStringBuffer(s: string): Buffer;
    private fixedLenStringBuffer;
    commandStringBuffer(s: string): Buffer;
    getCompactSize(mp: any): number;
    stopHash(len: number): string;
    reverseHexBytes(bytes: string): string;
    promiseLoop(promise: Function, scope: any, promiseArgsArray: Array<any>, promiseArgs?: Array<any>, indexesAsArgs?: boolean): Promise<any>;
}
