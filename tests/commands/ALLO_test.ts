/**
 * Tests for ALLO command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("ALLO handler - returns 202 (not needed)", async () => {
  const AlloCmd = findCommand("ALLO")!;
  const { conn, replies } = createMockConnection();

  const cmd = new AlloCmd(conn, createCommandData("ALLO", "1000"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});
