/**
 * Shared mock helpers for FTP command handler tests
 */
import type Connection from "../../src/server/connection.ts";
import type { CommandData } from "../../src/server/commands/_REGISTRY.ts";

// ============================================================================
// Interfaces
// ============================================================================

export interface MockReply {
  code: number;
  message?: string | Error;
}

export interface MockConnectionOptions {
  username?: string;
  authenticated?: boolean;
  transferType?: string;
  fs?: MockFileSystem | null;
  connector?: MockConnector | null;
  options?: Record<string, unknown>;
  serve?: { secure?: boolean; addr?: Record<string, unknown> };
  bufferSize?: number;
}

export interface MockFileSystem {
  currentDirectory?: () => string;
  get?: (
    path: string,
  ) => Promise<
    { isDirectory?: boolean; name?: string; size?: number; mtime?: Date | number | null; isFile?: boolean } | null
  >;
  list?: (path: string) => Promise<Array<{ name: string; isDirectory: boolean; size?: number; mtime?: Date }>>;
  stat?: (file: { name: string }, format: string) => string | null;
  chdir?: (path: string) => Promise<string>;
  mkdir?: (path: string) => Promise<string | void>;
  delete?: (path: string) => Promise<void>;
  access?: (path: string) => Promise<boolean>;
  read?: (path: string) => Promise<{ stream: { readable: ReadableStream<Uint8Array> }; clientPath: string }>;
  write?: (path: string, data: Uint8Array, opts?: { append?: boolean }) => Promise<void>;
  rename?: (from: string, to: string) => Promise<void>;
  utime?: (path: string, mtime: Date) => Promise<void>;
  mlsx?: (file: { name: string }) => string;
  chmod?: (path: string, mode: number) => Promise<void>;
  renameFrom?: string;
}

export interface MockConnector {
  accept?: () => Promise<void>;
  close?: () => void;
  conn?: unknown;
  writer?: {
    write: (data: Uint8Array) => Promise<void>;
  } | null;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a CommandData object for testing
 */
export function createCommandData(directive: string, args: string = ""): CommandData {
  return {
    directive,
    args: args || null,
    flags: [],
    raw: args ? `${directive} ${args}` : directive,
  };
}

/**
 * Create a mock Connection object for testing handlers
 */
export function createMockConnection(opts: MockConnectionOptions = {}): {
  conn: Connection;
  replies: MockReply[];
  closed: boolean;
} {
  const replies: MockReply[] = [];
  let closed = false;

  const mockConn = {
    username: opts.username,
    authenticated: opts.authenticated ?? false,
    transferType: opts.transferType ?? "binary",
    fs: opts.fs ?? undefined,
    connector: opts.connector,
    options: opts.options ?? {},
    serve: opts.serve ?? { secure: false, addr: {} },
    bufferSize: opts.bufferSize,

    reply: (code: number, message?: string | Error) => {
      replies.push({ code, message });
      return Promise.resolve();
    },

    close: (code?: number, message?: string) => {
      closed = true;
      if (code) {
        replies.push({ code, message });
      }
      return Promise.resolve();
    },

    setUsername: (username: string) => {
      mockConn.username = username;
      return Promise.resolve();
    },

    login: (_password: string) => {
      mockConn.authenticated = true;
      return Promise.resolve();
    },
  } as unknown as Connection;

  return {
    conn: mockConn,
    replies,
    get closed() {
      return closed;
    },
  };
}
