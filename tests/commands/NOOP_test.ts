/**
 * Tests for NOOP command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("NOOP handler - returns 200 OK", async () => {
  const NoopCmd = findCommand("NOOP")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new NoopCmd(conn, createCommandData("NOOP", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});
