/**
 * Tests for STOR command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem, type MockConnector } from "./_mock_helpers.ts";

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

Deno.test("STOR handler - returns 402 when write not supported", async () => {
  const StorCmd = findCommand("STOR")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // write not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new StorCmd(conn, createCommandData("STOR", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
