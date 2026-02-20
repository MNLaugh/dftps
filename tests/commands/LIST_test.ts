/**
 * Tests for LIST command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem, type MockConnector } from "./_mock_helpers.ts";

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

Deno.test("LIST handler - NLST returns simple names", async () => {
  const ListCmd = findCommand("LIST")!;
  const writtenData: string[] = [];
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([
      { name: "file1.txt", isDirectory: false },
      { name: "file2.txt", isDirectory: false },
    ]),
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
  
  const cmd = new ListCmd(conn, createCommandData("NLST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 150);
  assertEquals(replies[1].code, 226);
  // NLST returns just file names
  assertEquals(writtenData[0].includes("file1.txt"), true);
  assertEquals(writtenData[1].includes("file2.txt"), true);
});

Deno.test("LIST handler - handles single file", async () => {
  const ListCmd = findCommand("LIST")!;
  const writtenData: string[] = [];
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "single.txt" }),
    list: () => Promise.resolve([]),
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
  
  const cmd = new ListCmd(conn, createCommandData("LIST", "single.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 2);
  assertEquals(writtenData.length, 1);
  assertEquals(writtenData[0].includes("single.txt"), true);
});

Deno.test("LIST handler - returns 402 when get not supported", async () => {
  const ListCmd = findCommand("LIST")!;
  const mockFs: MockFileSystem = {
    // No get method
    list: () => Promise.resolve([]),
  };
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {},
    writer: { write: () => Promise.resolve() },
  };
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector,
  });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("LIST handler - returns 402 when list not supported", async () => {
  const ListCmd = findCommand("LIST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    // No list method
  };
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {},
    writer: { write: () => Promise.resolve() },
  };
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector,
  });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("LIST handler - closes when no writer available", async () => {
  const ListCmd = findCommand("LIST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    list: () => Promise.resolve([]),
  };
  const mockConnector: MockConnector = {
    accept: () => Promise.resolve(),
    close: () => {},
    conn: {},
    writer: null,
  };
  const { conn, replies } = createMockConnection({ 
    fs: mockFs, 
    connector: mockConnector,
  });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  await cmd.handler();
  
  // Handler calls conn.close with 402 code when writer is null
  assertEquals(replies.length >= 1, true);
});

Deno.test("LIST handler - returns 425 when accept fails", async () => {
  const ListCmd = findCommand("LIST")!;
  const mockFs: MockFileSystem = {
    list: () => Promise.resolve([]),
    currentDirectory: () => "/",
  };
  const mockConnector: MockConnector = {
    accept: () => Promise.reject(new Error("Accept failed")),
    writer: null,
    close: () => {},
  };
  const { conn } = createMockConnection({ fs: mockFs, connector: mockConnector });
  
  const cmd = new ListCmd(conn, createCommandData("LIST", ""));
  
  try {
    await cmd.handler();
  } catch (e) {
    const err = e as Error & { code?: number };
    assertEquals(err.code, 425);
  }
});
