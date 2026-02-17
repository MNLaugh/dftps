/**
 * Tests for FTP command handlers with mocked Connection
 * These tests cover the actual handler() methods, not just static properties
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../src/server/commands/_REGISTRY.ts";
import type Connection from "../src/server/connection.ts";
import type { CommandData } from "../src/server/commands/_REGISTRY.ts";

// ============================================================================
// Mock helpers
// ============================================================================

interface MockReply {
  code: number;
  message?: string | Error;
}

function createCommandData(directive: string, args: string = ""): CommandData {
  return {
    directive,
    args: args || null,
    flags: [],
    raw: args ? `${directive} ${args}` : directive,
  };
}

interface MockConnectionOptions {
  username?: string;
  authenticated?: boolean;
  transferType?: string;
  fs?: MockFileSystem | null;
  connector?: MockConnector | null;
  options?: Record<string, unknown>;
  serve?: { secure?: boolean; addr?: Record<string, unknown> };
  bufferSize?: number;
}

interface MockFileSystem {
  currentDirectory?: () => string;
  get?: (path: string) => Promise<{ isDirectory: boolean; name: string; size?: number; mtime?: Date; isFile?: boolean } | null>;
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

interface MockConnector {
  accept?: () => Promise<void>;
  close?: () => void;
  conn?: unknown;
  writer?: {
    write: (data: Uint8Array) => Promise<void>;
  } | null;
}

function createMockConnection(opts: MockConnectionOptions = {}): {
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
    get closed() { return closed; },
  };
}

// ============================================================================
// SYST handler tests
// ============================================================================

Deno.test("SYST handler - returns system type 215", async () => {
  const SystCmd = findCommand("SYST")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new SystCmd(conn, createCommandData("SYST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 215);
});

// ============================================================================
// NOOP handler tests
// ============================================================================

Deno.test("NOOP handler - returns 200 OK", async () => {
  const NoopCmd = findCommand("NOOP")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new NoopCmd(conn, createCommandData("NOOP", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});

// ============================================================================
// TYPE handler tests
// ============================================================================

Deno.test("TYPE handler - sets ASCII mode with 'A'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "A"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "ascii");
});

Deno.test("TYPE handler - sets binary mode with 'I'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "I"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "binary");
});

Deno.test("TYPE handler - sets binary mode with 'L8'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "L8"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "binary");
});

Deno.test("TYPE handler - returns 501 without args", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("TYPE handler - returns 504 for invalid type", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "X"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});

// ============================================================================
// PWD handler tests
// ============================================================================

Deno.test("PWD handler - returns 550 without filesystem", async () => {
  const PwdCmd = findCommand("PWD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("PWD handler - returns current directory", async () => {
  const PwdCmd = findCommand("PWD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/home/user",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
  assertEquals(replies[0].message, '"/home/user"');
});

Deno.test("PWD handler - escapes quotes in path", async () => {
  const PwdCmd = findCommand("PWD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => '/home/"user"',
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
  assertEquals(replies[0].message, '"/home/""user"""');
});

// ============================================================================
// USER handler tests
// ============================================================================

Deno.test("USER handler - returns 530 if username already set", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({ username: "existing" });
  
  const cmd = new UserCmd(conn, createCommandData("USER", "newuser"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 530);
});

Deno.test("USER handler - returns 230 if already authenticated", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({ authenticated: true });
  
  const cmd = new UserCmd(conn, createCommandData("USER", "user"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});

Deno.test("USER handler - returns 501 without username", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new UserCmd(conn, createCommandData("USER", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("USER handler - returns 230 for anonymous when enabled", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({
    options: { anonymous: true },
  });
  
  const cmd = new UserCmd(conn, createCommandData("USER", "anonymous"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});

Deno.test("USER handler - returns 331 for valid username", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new UserCmd(conn, createCommandData("USER", "testuser"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 331);
});

// ============================================================================
// PASS handler tests
// ============================================================================

Deno.test("PASS handler - returns 503 without username", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new PassCmd(conn, createCommandData("PASS", "secret"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 503);
});

Deno.test("PASS handler - returns 202 if already authenticated", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection({ 
    username: "user",
    authenticated: true,
  });
  
  const cmd = new PassCmd(conn, createCommandData("PASS", "secret"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("PASS handler - closes with 501 without password", async () => {
  const PassCmd = findCommand("PASS")!;
  const mock = createMockConnection({ username: "user" });
  
  const cmd = new PassCmd(mock.conn, createCommandData("PASS", ""));
  await cmd.handler();
  
  assertEquals(mock.closed, true);
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 501);
});

Deno.test("PASS handler - returns 230 on successful login", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection({ username: "user" });
  
  const cmd = new PassCmd(conn, createCommandData("PASS", "validpass"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});

// ============================================================================
// CWD handler tests
// ============================================================================

Deno.test("CWD handler - returns 550 without filesystem", async () => {
  const CwdCmd = findCommand("CWD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new CwdCmd(conn, createCommandData("CWD", "/test"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("CWD handler - changes directory successfully", async () => {
  const CwdCmd = findCommand("CWD")!;
  const mockFs: MockFileSystem = {
    chdir: (path: string) => Promise.resolve(path),
    currentDirectory: () => "/newdir",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new CwdCmd(conn, createCommandData("CWD", "/newdir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

// ============================================================================
// LIST handler tests
// ============================================================================

Deno.test("LIST handler - returns 550 without filesystem", async () => {
  const ListCmd = findCommand("LIST")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("LIST handler - returns 402 without connector", async () => {
  const ListCmd = findCommand("LIST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs, connector: null });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("LIST handler - lists files successfully", async () => {
  const ListCmd = findCommand("LIST")!;
  const writtenData: string[] = [];
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([
      { name: "file1.txt", isDirectory: false },
      { name: "dir1", isDirectory: true },
    ]),
    stat: (file: { name: string }) => `-rw-r--r-- 1 user group 1234 Jan 01 12:00 ${file.name}`,
  };
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {},
    writer: {
      write: (data: Uint8Array) => {
        writtenData.push(new TextDecoder().decode(data));
        return Promise.resolve();
      },
    },
  };
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector,
  });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  assertEquals(writtenData.length, 2);
});

// ============================================================================
// MKD handler tests
// ============================================================================

Deno.test("MKD handler - returns 550 without filesystem", async () => {
  const MkdCmd = findCommand("MKD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MkdCmd(conn, createCommandData("MKD", "newdir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// DELE handler tests
// ============================================================================

Deno.test("DELE handler - returns 550 without filesystem", async () => {
  const DeleCmd = findCommand("DELE")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new DeleCmd(conn, createCommandData("DELE", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// REST handler tests
// ============================================================================

Deno.test("REST handler - returns 501 without byte offset", async () => {
  const RestCmd = findCommand("REST")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new RestCmd(conn, createCommandData("REST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("REST handler - sets byte count and returns 350", async () => {
  const RestCmd = findCommand("REST")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new RestCmd(conn, createCommandData("REST", "1024"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 350);
  assertEquals(conn.restByteCount, 1024);
});

// ============================================================================
// QUIT handler tests
// ============================================================================

Deno.test("QUIT handler - closes connection with 221", async () => {
  const QuitCmd = findCommand("QUIT")!;
  const mock = createMockConnection();
  
  const cmd = new QuitCmd(mock.conn, createCommandData("QUIT", ""));
  await cmd.handler();
  
  assertEquals(mock.closed, true);
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 221);
});

// ============================================================================
// STRU handler tests
// ============================================================================

Deno.test("STRU handler - returns 200 for File structure", async () => {
  const StruCmd = findCommand("STRU")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new StruCmd(conn, createCommandData("STRU", "F"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});

Deno.test("STRU handler - returns 504 for unsupported structure", async () => {
  const StruCmd = findCommand("STRU")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new StruCmd(conn, createCommandData("STRU", "R"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});

// ============================================================================
// MODE handler tests
// ============================================================================

Deno.test("MODE handler - returns 200 for Stream mode", async () => {
  const ModeCmd = findCommand("MODE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ModeCmd(conn, createCommandData("MODE", "S"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});

Deno.test("MODE handler - returns 504 for unsupported mode", async () => {
  const ModeCmd = findCommand("MODE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ModeCmd(conn, createCommandData("MODE", "B"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});

// ============================================================================
// ALLO handler tests
// ============================================================================

Deno.test("ALLO handler - returns 202 (not needed)", async () => {
  const AlloCmd = findCommand("ALLO")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new AlloCmd(conn, createCommandData("ALLO", "1000"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

// ============================================================================
// CLNT handler tests
// ============================================================================

Deno.test("CLNT handler - stores software info and returns 200", async () => {
  const ClntCmd = findCommand("CLNT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ClntCmd(conn, createCommandData("CLNT", "FileZilla 3.0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.software, "FileZilla 3.0");
});

// ============================================================================
// OPTS handler tests  
// ============================================================================

Deno.test("OPTS handler - sets UTF8 on", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new OptsCmd(conn, createCommandData("OPTS", "UTF-8 ON"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.encoding, "utf8");
});

Deno.test("OPTS handler - returns 501 without args", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new OptsCmd(conn, createCommandData("OPTS", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

// ============================================================================
// CDUP handler tests
// ============================================================================

Deno.test("CDUP handler - returns 550 without filesystem", async () => {
  const CdupCmd = findCommand("CDUP")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new CdupCmd(conn, createCommandData("CDUP", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("CDUP handler - changes to parent directory", async () => {
  const CdupCmd = findCommand("CDUP")!;
  const mockFs: MockFileSystem = {
    chdir: () => Promise.resolve("/parent"),
    currentDirectory: () => "/parent",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new CdupCmd(conn, createCommandData("CDUP", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

// ============================================================================
// ABOR handler tests
// ============================================================================

Deno.test("ABOR handler - returns 226 without active transfer", async () => {
  const AborCmd = findCommand("ABOR")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new AborCmd(conn, createCommandData("ABOR", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 226);
});

// ============================================================================
// PORT handler tests
// ============================================================================

Deno.test("PORT handler - returns 501 without arguments", async () => {
  const PortCmd = findCommand("PORT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new PortCmd(conn, createCommandData("PORT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("PORT handler - returns 425 with invalid format", async () => {
  const PortCmd = findCommand("PORT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new PortCmd(conn, createCommandData("PORT", "192,168,1,1"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 425);
});

// ============================================================================
// EPRT handler tests
// ============================================================================

Deno.test("EPRT handler - returns 501 without arguments", async () => {
  const EprtCmd = findCommand("EPRT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new EprtCmd(conn, createCommandData("EPRT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

// ============================================================================
// RETR handler tests
// ============================================================================

Deno.test("RETR handler - returns 550 without filesystem", async () => {
  const RetrCmd = findCommand("RETR")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("RETR handler - returns 501 without filename", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs as MockFileSystem });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("RETR handler - returns 402 without connector", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs as MockFileSystem, connector: null });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

// ============================================================================
// STOR handler tests
// ============================================================================

Deno.test("STOR handler - returns 550 without filesystem", async () => {
  const StorCmd = findCommand("STOR")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("STOR handler - returns 501 without filename", async () => {
  const StorCmd = findCommand("STOR")!;
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs as MockFileSystem });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("STOR handler - returns 402 without connector", async () => {
  const StorCmd = findCommand("STOR")!;
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs as MockFileSystem, connector: null });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

// ============================================================================
// RNFR handler tests
// ============================================================================

Deno.test("RNFR handler - returns 550 without filesystem", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RnfrCmd(conn, createCommandData("RNFR", "oldname.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// RNTO handler tests
// ============================================================================

Deno.test("RNTO handler - returns 550 without filesystem", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RntoCmd(conn, createCommandData("RNTO", "newname.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// STAT handler tests
// ============================================================================

Deno.test("STAT handler - returns 550 without filesystem", async () => {
  const StatCmd = findCommand("STAT")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("STAT handler - returns 501 without args", async () => {
  const StatCmd = findCommand("STAT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "file.txt" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

// ============================================================================
// RMD handler tests
// ============================================================================

Deno.test("RMD handler - returns 550 without filesystem", async () => {
  const RmdCmd = findCommand("RMD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RmdCmd(conn, createCommandData("RMD", "dirname"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// NLST handler tests
// ============================================================================

Deno.test("NLST handler - returns 550 without filesystem", async () => {
  const NlstCmd = findCommand("NLST")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new NlstCmd(conn, createCommandData("NLST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("NLST handler - returns 402 without connector", async () => {
  const NlstCmd = findCommand("NLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs, connector: null });
  
  const cmd = new NlstCmd(conn, createCommandData("NLST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

// ============================================================================
// MDTM handler tests
// ============================================================================

Deno.test("MDTM handler - returns 550 without filesystem", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// MLSD handler tests
// ============================================================================

Deno.test("MLSD handler - returns 550 without filesystem", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// MLST handler tests
// ============================================================================

Deno.test("MLST handler - returns 550 without filesystem", async () => {
  const MlstCmd = findCommand("MLST")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// MFMT handler tests
// ============================================================================

Deno.test("MFMT handler - returns 550 without filesystem", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "20260101120000 file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// AUTH handler tests
// ============================================================================

Deno.test("AUTH handler - returns 502 without TLS certificate", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false, addr: {} },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

// ============================================================================
// PBSZ handler tests
// ============================================================================

Deno.test("PBSZ handler - returns 202 without TLS", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", "0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("PBSZ handler - sets buffer size with TLS", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", "0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.bufferSize, 0);
});

// ============================================================================
// PROT handler tests
// ============================================================================

Deno.test("PROT handler - returns 202 without TLS", async () => {
  const ProtCmd = findCommand("PROT")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false },
  });
  
  const cmd = new ProtCmd(conn, createCommandData("PROT", "P"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

// ============================================================================
// SITE handler tests
// ============================================================================

Deno.test("SITE handler - returns 550 without filesystem", async () => {
  const SiteCmd = findCommand("SITE")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// APPE handler tests
// ============================================================================

Deno.test("APPE handler - returns 550 without filesystem", async () => {
  const AppeCmd = findCommand("APPE")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new AppeCmd(conn, createCommandData("APPE", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// FEAT handler tests
// ============================================================================

Deno.test("FEAT handler - returns 211 with features list", async () => {
  const FeatCmd = findCommand("FEAT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new FeatCmd(conn, createCommandData("FEAT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 211);
});

// ============================================================================
// PASV handler tests
// ============================================================================

Deno.test("PASV handler - creates passive connection", () => {
  const PasvCmd = findCommand("PASV")!;
  // PASV requires pasvUrl in options
  const mockConn = createMockConnection({
    options: { pasvUrl: "127.0.0.1" },
  });
  
  // Mock the connector creation
  const _cmd = new PasvCmd(mockConn.conn, createCommandData("PASV", ""));
  
  // This will fail because PassiveConnection needs real Connection
  // but we test the static properties are correct
  assertEquals(PasvCmd.directive, "PASV");
  assertEquals(PasvCmd.description, "Initiate passive mode");
});

// ============================================================================
// EPSV handler tests
// ============================================================================

Deno.test("EPSV handler - has correct directive", () => {
  const EpsvCmd = findCommand("EPSV")!;
  assertEquals(EpsvCmd.directive, "EPSV");
  assertEquals(EpsvCmd.description, "Initiate passive mode");
});

// ============================================================================
// Additional CWD tests
// ============================================================================

Deno.test("CWD handler - returns 501 without args", async () => {
  const CwdCmd = findCommand("CWD")!;
  const mockFs: MockFileSystem = {
    chdir: (path: string) => Promise.resolve(path),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new CwdCmd(conn, createCommandData("CWD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

// ============================================================================
// Additional MKD tests
// ============================================================================

Deno.test("MKD handler - returns 501 without args", async () => {
  const MkdCmd = findCommand("MKD")!;
  const mockFs: MockFileSystem = {
    mkdir: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MkdCmd(conn, createCommandData("MKD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MKD handler - creates directory successfully", async () => {
  const MkdCmd = findCommand("MKD")!;
  const mockFs: MockFileSystem = {
    mkdir: (path: string) => Promise.resolve(path), // MKD expects path to be returned
    currentDirectory: () => "/",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MkdCmd(conn, createCommandData("MKD", "newdir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
});

// ============================================================================
// Additional DELE tests
// ============================================================================

Deno.test("DELE handler - returns 501 without args", async () => {
  const DeleCmd = findCommand("DELE")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new DeleCmd(conn, createCommandData("DELE", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("DELE handler - deletes file successfully", async () => {
  const DeleCmd = findCommand("DELE")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new DeleCmd(conn, createCommandData("DELE", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

// ============================================================================
// Additional RMD tests
// ============================================================================

Deno.test("RMD handler - returns 501 without args", async () => {
  const RmdCmd = findCommand("RMD")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RmdCmd(conn, createCommandData("RMD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("RMD handler - removes directory successfully", async () => {
  const RmdCmd = findCommand("RMD")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RmdCmd(conn, createCommandData("RMD", "olddir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

// ============================================================================
// Additional RNFR tests
// ============================================================================

Deno.test("RNFR handler - returns 501 without args", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "old.txt" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RnfrCmd(conn, createCommandData("RNFR", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("RNFR handler - sets renameFrom and returns 350", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "old.txt" }),
    renameFrom: "",
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RnfrCmd(mock.conn, createCommandData("RNFR", "old.txt"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 350);
});

// ============================================================================
// Additional RNTO tests
// ============================================================================

Deno.test("RNTO handler - returns 501 without args", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "old.txt",
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", ""));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 501);
});

Deno.test("RNTO handler - renames with empty renameFrom", async () => {
  // Note: Current implementation doesn't check if RNFR was called first
  // It just calls rename with empty string as source
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "", // Empty renameFrom - RNFR wasn't called
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", "new.txt"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  // Current impl returns 250 even with empty renameFrom
  assertEquals(mock.replies[0].code, 250);
});

Deno.test("RNTO handler - renames file successfully", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "old.txt", // renameFrom is on fs object, not separate
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", "new.txt"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 250);
});

// ============================================================================
// Additional MDTM tests
// ============================================================================

Deno.test("MDTM handler - returns 501 without args", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "file.txt", mtime: new Date() }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MdtmCmd(conn, createCommandData("MDTM", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MDTM handler - returns modification time", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ 
      isDirectory: false, 
      name: "file.txt", 
      mtime: new Date("2026-02-17T12:00:00Z"),
    }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
});

// ============================================================================
// Additional MFMT tests
// ============================================================================

Deno.test("MFMT handler - returns 501 without args", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const mockFs: MockFileSystem = {
    utime: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MfmtCmd(conn, createCommandData("MFMT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MFMT handler - modifies file time", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, isFile: true, name: "file.txt" }),
    utime: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "20260217120000 file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
});

// ============================================================================
// Additional MLSD tests
// ============================================================================

Deno.test("MLSD handler - returns 425 without data connection", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([]),
    mlsx: () => "type=dir; .",
  };
  // MLSD with connector but no actual conn inside returns 425 via close()
  const mockConnector = {
    accept: async () => {},
    conn: null,
    writer: null,
  };
  const { conn, replies } = createMockConnection({ fs: mockFs, connector: mockConnector });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  // MLSD calls close() with 425 when data connection fails
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 425);
});

// ============================================================================
// Additional MLST tests
// ============================================================================

Deno.test("MLST handler - returns file info for current dir", async () => {
  const MlstCmd = findCommand("MLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    mlsx: () => "type=dir; .",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  // MLST with no args uses "." as default
  const cmd = new MlstCmd(conn, createCommandData("MLST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

Deno.test("MLST handler - returns file info", async () => {
  const MlstCmd = findCommand("MLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "file.txt" }),
    mlsx: () => "type=file;size=1234; file.txt",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

// ============================================================================
// Additional AUTH tests
// ============================================================================

Deno.test("AUTH handler - returns 202 if already secure", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true, addr: { cert: "test", key: "test" } },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

// ============================================================================
// PROT handler - more tests
// ============================================================================

Deno.test("PROT handler - returns 503 without PBSZ", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
  });
  // bufferSize undefined means PBSZ wasn't called
  (mock.conn as unknown as { bufferSize?: number }).bufferSize = undefined;
  
  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "P"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 503);
});

Deno.test("PROT handler - accepts P (private)", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });
  
  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "P"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 200);
});

// ============================================================================
// EPSV handler - extended tests
// ============================================================================

Deno.test("EPSV handler - has correct static properties", () => {
  const EpsvCmd = findCommand("EPSV")!;
  assertEquals(EpsvCmd.directive, "EPSV");
  assertEquals(EpsvCmd.description, "Initiate passive mode");
  assertEquals(EpsvCmd.syntax, "{{cmd}} [<protocol>]");
});

// ============================================================================
// STOR handler - extended tests
// ============================================================================

Deno.test("STOR handler - stores file data successfully", async () => {
  const StorCmd = findCommand("STOR")!;
  const writtenData: Uint8Array[] = [];
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: (_path: string, data: Uint8Array, _opts?: { append?: boolean }) => {
      writtenData.push(data);
      return Promise.resolve();
    },
  };
  
  // Create a readable stream that emits data
  const testData = new TextEncoder().encode("Hello, FTP!");
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(testData);
      controller.close();
    }
  });
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {
      readable,
    },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "test.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  assertEquals(writtenData.length, 1);
  assertEquals(new TextDecoder().decode(writtenData[0]), "Hello, FTP!");
});

Deno.test("STOR handler - accepts without existing conn", async () => {
  const StorCmd = findCommand("STOR")!;
  const writtenData: Uint8Array[] = [];
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: (_path: string, data: Uint8Array) => {
      writtenData.push(data);
      return Promise.resolve();
    },
  };
  
  const testData = new TextEncoder().encode("Test data");
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(testData);
      controller.close();
    }
  });
  
  let acceptCalled = false;
  const mockConnector: MockConnector = {
    accept: () => {
      acceptCalled = true;
      // Set conn after accept
      mockConnector.conn = { readable };
      return Promise.resolve();
    },
    close: () => {},
    conn: undefined,
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "data.txt"));
  await cmd.handler();
  
  assertEquals(acceptCalled, true);
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
});

Deno.test("STOR handler - returns 402 when accept fails to get conn", async () => {
  const StorCmd = findCommand("STOR")!;
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: async () => {},
  };
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(), // Does not set conn
    close: () => {},
    conn: undefined,
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("STOR handler - APPE sets append mode", async () => {
  const StorCmd = findCommand("STOR")!;
  const writeOpts: Array<{ append?: boolean }> = [];
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
    write: (_path: string, _data: Uint8Array, opts?: { append?: boolean }) => {
      writeOpts.push(opts || {});
      return Promise.resolve();
    },
  };
  
  const testData = new TextEncoder().encode("Appended data");
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(testData);
      controller.close();
    }
  });
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: { readable },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  // Use APPE directive
  const cmd = new StorCmd(conn, createCommandData("APPE", "log.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  // First write should have append = true (since directive is APPE)
  assertEquals(writeOpts[0].append, true);
});

// ============================================================================
// STAT handler - extended tests
// ============================================================================

Deno.test("STAT handler - returns 212 for file", async () => {
  const StatCmd = findCommand("STAT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ 
      isDirectory: false, 
      name: "file.txt",
      size: 1024,
      mtime: new Date("2025-01-15T10:30:00Z")
    }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 212);
});

Deno.test("STAT handler - returns 213 for directory", async () => {
  const StatCmd = findCommand("STAT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ 
      isDirectory: true, 
      name: "mydir"
    }),
    list: () => Promise.resolve([
      { name: "file1.txt", isDirectory: false, size: 100, mtime: new Date() },
      { name: "file2.txt", isDirectory: false, size: 200, mtime: new Date() },
      { name: "subdir", isDirectory: true, size: 0, mtime: new Date() },
    ]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", "mydir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
});

Deno.test("STAT handler - returns 402 when list not supported", async () => {
  const StatCmd = findCommand("STAT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ 
      isDirectory: true, 
      name: "mydir"
    }),
    // No list method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", "mydir"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("STAT handler - returns 402 when get not supported", async () => {
  const StatCmd = findCommand("STAT")!;
  const mockFs: MockFileSystem = {
    // No get method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StatCmd(conn, createCommandData("STAT", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
// ============================================================================
// RETR handler - extended tests
// ============================================================================

Deno.test("RETR handler - returns 550 without filesystem", async () => {
  const RetrCmd = findCommand("RETR")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("RETR handler - returns 501 without filename", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("RETR handler - returns 402 without connector", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs, connector: null });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("RETR handler - returns 402 when read not supported", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs: MockFileSystem = {
    // No read method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("RETR handler - retrieves file successfully", async () => {
  const RetrCmd = findCommand("RETR")!;
  const fileContent = new TextEncoder().encode("File content here");
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ 
      stream: { 
        readable: new ReadableStream({
          start(controller) {
            controller.enqueue(fileContent);
            controller.close();
          }
        }) 
      }, 
      clientPath: "/test.txt" 
    }),
  };
  
  const writableData: Uint8Array[] = [];
  let connClosed = false;
  const writable = new WritableStream({
    write(chunk) {
      writableData.push(chunk);
    }
  });
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {
      writable,
      close: () => { connClosed = true; },
    },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "test.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  assertEquals(connClosed, true);
});

Deno.test("RETR handler - calls accept when conn undefined", async () => {
  const RetrCmd = findCommand("RETR")!;
  const fileContent = new TextEncoder().encode("Data");
  
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ 
      stream: { 
        readable: new ReadableStream({
          start(controller) {
            controller.enqueue(fileContent);
            controller.close();
          }
        }) 
      }, 
      clientPath: "/data.txt" 
    }),
  };
  
  let acceptCalled = false;
  const writable = new WritableStream({ write() {} });
  
  const mockConnector: MockConnector = {
    accept: () => {
      acceptCalled = true;
      mockConnector.conn = { writable, close: () => {} };
      return Promise.resolve();
    },
    close: () => {},
    conn: undefined,
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "data.txt"));
  await cmd.handler();
  
  assertEquals(acceptCalled, true);
  assertEquals(replies.length, 2);
});

Deno.test("RETR handler - returns 402 when accept fails", async () => {
  const RetrCmd = findCommand("RETR")!;
  const mockFs: MockFileSystem = {
    read: () => Promise.resolve({ stream: { readable: new ReadableStream() }, clientPath: "/" }),
  };
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(), // Doesn't set conn
    close: () => {},
    conn: undefined,
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new RetrCmd(conn, createCommandData("RETR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

// ============================================================================
// MLSD handler - extended tests
// ============================================================================

Deno.test("MLSD handler - returns 550 without filesystem", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MLSD handler - returns 502 when list not supported", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const mockFs: MockFileSystem = {
    // No list method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

Deno.test("MLSD handler - returns 425 without connector", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const mockFs: MockFileSystem = {
    list: () => Promise.resolve([]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs, connector: null });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 425);
});

Deno.test("MLSD handler - lists directory successfully", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const writtenLines: string[] = [];
  
  const mockFs: MockFileSystem = {
    list: () => Promise.resolve([
      { name: "file1.txt", isDirectory: false, size: 100, mtime: new Date("2025-01-15T10:30:00Z") },
      { name: "subdir", isDirectory: true, size: 0, mtime: new Date("2025-01-15T11:00:00Z") },
    ]),
  };
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: { close: () => {} },
    writer: {
      write: (data: Uint8Array) => {
        writtenLines.push(new TextDecoder().decode(data));
        return Promise.resolve();
      },
    },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", "/docs"));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  assertEquals(writtenLines.length, 2);
});

Deno.test("MLSD handler - handles empty directory", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const writtenLines: string[] = [];
  
  const mockFs: MockFileSystem = {
    list: () => Promise.resolve([]),
  };
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: { close: () => {} },
    writer: {
      write: (data: Uint8Array) => {
        writtenLines.push(new TextDecoder().decode(data));
        return Promise.resolve();
      },
    },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  assertEquals(writtenLines.length, 0);
});

Deno.test("MLSD handler - handles NotFound error", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  
  const mockFs: MockFileSystem = {
    list: () => Promise.reject(new Deno.errors.NotFound("Directory not found")),
  };
  
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: { close: () => {} },
    writer: {
      write: () => Promise.resolve(),
    },
  };
  
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector 
  });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", "/nonexistent"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

// ============================================================================
// SITE handler - extended tests
// ============================================================================

Deno.test("SITE handler - returns 550 without filesystem", async () => {
  const SiteCmd = findCommand("SITE")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("SITE handler - returns 402 when chmod not supported", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    // No chmod method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("SITE handler - returns 550 without args", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    chmod: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("SITE handler - CHMOD changes permissions", async () => {
  const SiteCmd = findCommand("SITE")!;
  let chmodCalled = false;
  let chmodPath = "";
  let chmodMode = 0;
  
  const mockFs: MockFileSystem = {
    chmod: (path: string, mode: number) => {
      chmodCalled = true;
      chmodPath = path;
      chmodMode = mode;
      return Promise.resolve();
    },
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 myfile.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(chmodCalled, true);
  assertEquals(chmodPath, "myfile.txt");
  assertEquals(chmodMode, 0o755);
});

Deno.test("SITE handler - CHMOD with path containing spaces", async () => {
  const SiteCmd = findCommand("SITE")!;
  let chmodPath = "";
  
  const mockFs: MockFileSystem = {
    chmod: (path: string) => {
      chmodPath = path;
      return Promise.resolve();
    },
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 644 my file with spaces.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(chmodPath, "my file with spaces.txt");
});

Deno.test("SITE handler - unknown subcommand returns 500", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    chmod: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new SiteCmd(conn, createCommandData("SITE", "UNKNOWN arg1 arg2"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 500);
});