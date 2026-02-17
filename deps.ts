// === Standard Library (JSR) ===
export { MuxAsyncIterator } from "@std/async";
export { assert } from "@std/assert";
export * as DPath from "@std/path";
export { exists } from "@std/fs";
export { format } from "@std/datetime";

// === CLI (JSR) ===
export { Command } from "@cliffy/command";
export { Table } from "@cliffy/table";
export { colors } from "@cliffy/ansi/colors";

// === Password Hashing ===
export { hash, verify } from "@node-rs/argon2";

// === Deferred utility (replaces std/async deferred) ===
export interface Deferred<T> extends Promise<T> {
  readonly state: "pending" | "fulfilled" | "rejected";
  resolve(value?: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let methods: { resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void };
  let state: "pending" | "fulfilled" | "rejected" = "pending";

  const promise = new Promise<T>((resolve, reject) => {
    methods = {
      resolve: (value: T | PromiseLike<T>) => {
        state = "fulfilled";
        resolve(value);
      },
      reject: (reason?: unknown) => {
        state = "rejected";
        reject(reason);
      },
    };
  }) as Deferred<T>;

  Object.defineProperty(promise, "state", { get: () => state });
  Object.assign(promise, methods!);

  return promise;
}

// === UUID generation (native crypto) ===
export const v4 = {
  generate: (): string => crypto.randomUUID(),
};

// === Port utilities ===
export function makeRange(min: number, max: number): number[] {
  const range: number[] = [];
  for (let i = min; i <= max; i++) {
    range.push(i);
  }
  return range;
}

export function randomPort(range: number[]): number {
  return range[Math.floor(Math.random() * range.length)];
}

export function getPort(options?: { port?: number }): number {
  if (options?.port) {
    try {
      const listener = Deno.listen({ port: options.port });
      listener.close();
      return options.port;
    } catch {
      // Port is in use, find another
    }
  }

  // Find a random available port
  const listener = Deno.listen({ port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}

// === Text encoding utilities ===
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(input: string): Uint8Array {
  return encoder.encode(input);
}

export function decode(input: Uint8Array): string {
  return decoder.decode(input);
}
