/**
 * Tests for NLST command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem } from "./_mock_helpers.ts";

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
