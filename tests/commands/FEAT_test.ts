/**
 * Tests for FEAT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("FEAT handler - returns 211 with features list", async () => {
  const FeatCmd = findCommand("FEAT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new FeatCmd(conn, createCommandData("FEAT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 211);
});
