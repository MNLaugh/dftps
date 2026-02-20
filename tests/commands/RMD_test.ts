/**
 * Tests for RMD command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("RMD handler - returns 550 without filesystem", async () => {
  const RmdCmd = findCommand("RMD")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new RmdCmd(conn, createCommandData("RMD", "dirname"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

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
