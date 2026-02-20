/**
 * Tests for CWD command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem } from "./_mock_helpers.ts";

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

Deno.test("CWD handler - returns 402 when chdir not supported", async () => {
  const CwdCmd = findCommand("CWD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // chdir not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new CwdCmd(conn, createCommandData("CWD", "/test"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
