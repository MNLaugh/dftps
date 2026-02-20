/**
 * Tests for MODE command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("MODE handler - returns 200 for Stream mode", async () => {
  const ModeCmd = findCommand("MODE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ModeCmd(conn, createCommandData("MODE", "S"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});

Deno.test("MODE handler - returns 504 for unsupported mode", async () => {
  const ModeCmd = findCommand("MODE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ModeCmd(conn, createCommandData("MODE", "B"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});
