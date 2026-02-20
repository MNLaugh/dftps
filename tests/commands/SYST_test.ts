/**
 * Tests for SYST command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("SYST handler - returns system type 215", async () => {
  const SystCmd = findCommand("SYST")!;
  const { conn, replies } = createMockConnection();

  const cmd = new SystCmd(conn, createCommandData("SYST", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 215);
});
