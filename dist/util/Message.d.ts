/// <reference types="node" />
export declare class MessageBuilder {
    maxBytes: number;
    buffer: Buffer;
    cursor: number;
    constructor(maxBytes?: number);
    raw(): Buffer;
    pad(num: number): MessageBuilder;
    put(data: any): MessageBuilder;
    putInt8(num: number | Buffer): MessageBuilder;
    putInt16(num: number | Buffer): MessageBuilder;
    putInt32(num: number | Buffer): MessageBuilder;
    putInt64(num: number | Buffer | Date): MessageBuilder;
    putString(str: string): MessageBuilder;
    putVarInt(num: number): MessageBuilder;
    putVarString(str: string): MessageBuilder;
    ensureSize(additionalBytes: number): MessageBuilder;
}
export declare class MessageParser {
    pointer: number;
    hasFailed: boolean;
    failedStack: boolean | string;
    buffer: Buffer;
    constructor(raw: Buffer);
    markFailed(): boolean;
    pointerCheck(num?: number): boolean;
    pointerPosition(): number;
    incrPointer(amount: number): boolean;
    setPointer(amount: number): false | void;
    readInt8(): number | undefined;
    readUInt16LE(): number | undefined;
    readUInt32LE(): number | undefined;
    readUInt64LE(): number | undefined;
    readVarInt(): number | undefined;
    readVarString(): string | undefined;
    raw(length: number, increment?: boolean): Buffer | undefined;
    rawSegment(start: number, end: number): Buffer | undefined;
    rawRemainder(): Buffer | undefined;
}
