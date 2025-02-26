/// <reference types="node" />
interface AnyObject {
    [k: string]: any;
}
declare type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';
export declare class ReadStream {
    buf: Buffer;
    bufStart: number;
    bufEnd: number;
    bufCapacity: number;
    readSize: number;
    atEOF: boolean;
    errorBuf: Error[] | null;
    encoding: BufferEncoding;
    isReadable: boolean;
    isWritable: boolean;
    nodeReadableStream: NodeJS.ReadableStream | null;
    nextPushResolver: (() => void) | null;
    nextPush: Promise<void>;
    awaitingPush: boolean;
    constructor(optionsOrStreamLike?: {
        [k: string]: any;
    } | NodeJS.ReadableStream | string | Buffer);
    get bufSize(): number;
    moveBuf(): void;
    expandBuf(newCapacity?: number): void;
    ensureCapacity(additionalCapacity: number): void;
    push(buf: Buffer | string, encoding?: BufferEncoding): void;
    pushEnd(): void;
    pushError(err: Error, recoverable?: boolean): void;
    readError(): void;
    peekError(): void;
    resolvePush(): void;
    _read(size?: number): void | Promise<void>;
    _destroy(): void | Promise<void>;
    _pause(): void;
    /**
     * Reads until the internal buffer is non-empty. Does nothing if the
     * internal buffer is already non-empty.
     *
     * If `byteCount` is a number, instead read until the internal buffer
     * contains at least `byteCount` bytes.
     *
     * If `byteCount` is `true`, reads even if the internal buffer is
     * non-empty.
     */
    loadIntoBuffer(byteCount?: number | null | true, readError?: boolean): Promise<void> | undefined;
    doLoad(chunkSize?: number | null, readError?: boolean): Promise<void>;
    peek(byteCount?: number | null, encoding?: BufferEncoding): string | null | Promise<string | null>;
    peek(encoding: BufferEncoding): string | null | Promise<string | null>;
    peekBuffer(byteCount?: number | null): Buffer | null | Promise<Buffer | null>;
    read(byteCount?: number | null, encoding?: BufferEncoding): Promise<string | null>;
    read(encoding: BufferEncoding): Promise<string | null>;
    byChunk(byteCount?: number | null): ObjectReadStream<string>;
    byLine(): ObjectReadStream<string>;
    delimitedBy(delimiter: string): ObjectReadStream<string>;
    readBuffer(byteCount?: number | null): Promise<Buffer | null>;
    indexOf(symbol: string, encoding?: BufferEncoding): Promise<number>;
    readAll(encoding?: BufferEncoding): Promise<string>;
    peekAll(encoding?: BufferEncoding): string | Promise<string | null> | null;
    readDelimitedBy(symbol: string, encoding?: BufferEncoding): Promise<string | null>;
    readLine(encoding?: BufferEncoding): Promise<string | null>;
    destroy(): void | Promise<void>;
    next(byteCount?: number | null): Promise<{
        value: string | null;
        done: boolean;
    }>;
    pipeTo(outStream: WriteStream, options?: {
        noEnd?: boolean;
    }): Promise<void>;
}
interface WriteStreamOptions {
    nodeStream?: NodeJS.WritableStream;
    write?: (this: WriteStream, data: string | Buffer) => (Promise<undefined> | undefined);
    writeEnd?: (this: WriteStream) => Promise<any>;
}
export declare class WriteStream {
    isReadable: boolean;
    isWritable: true;
    encoding: BufferEncoding;
    nodeWritableStream: NodeJS.WritableStream | null;
    drainListeners: (() => void)[];
    constructor(optionsOrStream?: WriteStreamOptions | NodeJS.WritableStream);
    write(chunk: Buffer | string): void | Promise<void>;
    writeLine(chunk: string): void | Promise<void>;
    _write(chunk: Buffer | string): void | Promise<void>;
    _writeEnd(): void | Promise<void>;
    writeEnd(chunk?: string): Promise<void>;
}
export declare class ReadWriteStream extends ReadStream implements WriteStream {
    isReadable: true;
    isWritable: true;
    nodeWritableStream: NodeJS.WritableStream | null;
    drainListeners: (() => void)[];
    constructor(options?: AnyObject);
    write(chunk: Buffer | string): Promise<void> | void;
    writeLine(chunk: string): Promise<void> | void;
    _write(chunk: Buffer | string): Promise<void> | void;
    /**
     * In a ReadWriteStream, `_read` does not need to be implemented,
     * because it's valid for the read stream buffer to be filled only by
     * `_write`.
     */
    _read(size?: number): void;
    _writeEnd(): void | Promise<void>;
    writeEnd(): Promise<void>;
}
declare type ObjectReadStreamOptions<T> = {
    buffer?: T[];
    read?: (this: ObjectReadStream<T>) => void | Promise<void>;
    pause?: (this: ObjectReadStream<T>) => void | Promise<void>;
    destroy?: (this: ObjectReadStream<T>) => void | Promise<void>;
    nodeStream?: undefined;
} | {
    buffer?: undefined;
    read?: undefined;
    pause?: undefined;
    destroy?: undefined;
    nodeStream: NodeJS.ReadableStream;
};
export declare class ObjectReadStream<T> {
    buf: T[];
    readSize: number;
    atEOF: boolean;
    errorBuf: Error[] | null;
    isReadable: boolean;
    isWritable: boolean;
    nodeReadableStream: NodeJS.ReadableStream | null;
    nextPushResolver: (() => void) | null;
    nextPush: Promise<void>;
    awaitingPush: boolean;
    constructor(optionsOrStreamLike?: ObjectReadStreamOptions<T> | NodeJS.ReadableStream | T[]);
    push(elem: T): void;
    pushEnd(): void;
    pushError(err: Error, recoverable?: boolean): void;
    readError(): void;
    peekError(): void;
    resolvePush(): void;
    _read(size?: number): void | Promise<void>;
    _destroy(): void;
    _pause(): void;
    loadIntoBuffer(count?: number | true, readError?: boolean): Promise<void>;
    peek(): Promise<T>;
    read(): Promise<T | null | undefined>;
    peekArray(count?: number | null): Promise<T[]>;
    readArray(count?: number | null): Promise<T[]>;
    readAll(): Promise<T[]>;
    peekAll(): Promise<T[]>;
    destroy(): void;
    [Symbol.asyncIterator](): this;
    next(): Promise<{
        value: T;
        done: false;
    } | {
        value: undefined;
        done: true;
    }>;
    pipeTo(outStream: ObjectWriteStream<T>, options?: {
        noEnd?: boolean;
    }): Promise<void>;
}
interface ObjectWriteStreamOptions<T> {
    _writableState?: any;
    nodeStream?: NodeJS.WritableStream;
    write?: (this: ObjectWriteStream<T>, data: T) => Promise<any> | undefined;
    writeEnd?: (this: ObjectWriteStream<T>) => Promise<any>;
}
export declare class ObjectWriteStream<T> {
    isReadable: boolean;
    isWritable: true;
    nodeWritableStream: NodeJS.WritableStream | null;
    constructor(optionsOrStream?: ObjectWriteStreamOptions<T> | NodeJS.WritableStream);
    write(elem: T | null): void | Promise<void>;
    _write(elem: T): void | Promise<void>;
    _writeEnd(): void | Promise<void>;
    writeEnd(elem?: T): Promise<void>;
}
interface ObjectReadWriteStreamOptions<T> {
    read?: (this: ObjectReadStream<T>) => void | Promise<void>;
    pause?: (this: ObjectReadStream<T>) => void | Promise<void>;
    destroy?: (this: ObjectReadStream<T>) => void | Promise<void>;
    write?: (this: ObjectWriteStream<T>, elem: T) => Promise<any> | undefined | void;
    writeEnd?: () => Promise<any> | undefined | void;
}
export declare class ObjectReadWriteStream<T> extends ObjectReadStream<T> implements ObjectWriteStream<T> {
    isReadable: true;
    isWritable: true;
    nodeWritableStream: NodeJS.WritableStream | null;
    constructor(options?: ObjectReadWriteStreamOptions<T>);
    write(elem: T): void | Promise<void>;
    _write(elem: T): void | Promise<void>;
    /** In a ReadWriteStream, _read does not need to be implemented. */
    _read(): void;
    _writeEnd(): void | Promise<void>;
    writeEnd(): Promise<void>;
}
export declare function readAll(nodeStream: NodeJS.ReadableStream, encoding?: any): Promise<string>;
export declare function stdin(): ReadStream;
export declare function stdout(): WriteStream;
export declare function stdpipe(stream: WriteStream | ReadStream | ReadWriteStream): Promise<void[]>;
export {};
