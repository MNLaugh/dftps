/**
 * Tests for STAT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem } from "./_mock_helpers.ts";

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
