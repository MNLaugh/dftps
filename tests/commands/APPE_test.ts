/**
 * Tests for APPE command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("APPE handler - returns 550 without filesystem", async () => {
  const AppeCmd = findCommand("APPE")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new AppeCmd(conn, createCommandData("APPE", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});
