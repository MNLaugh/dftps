/**
 * Tests for MLSD command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem, type MockConnector } from "./_mock_helpers.ts";

Deno.test("MLSD handler - returns 550 without filesystem", async () => {
  const MlsdCmd = findCommand("MLSD")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MlsdCmd(conn, createCommandData("MLSD", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

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
