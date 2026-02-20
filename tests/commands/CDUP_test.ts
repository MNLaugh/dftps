/**
 * Tests for CDUP command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

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
