/**
 * Tests for RETR command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem, type MockConnector } from "./_mock_helpers.ts";

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
  
  let connClosed = false;
  const writable = new WritableStream({
    write() {}
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
