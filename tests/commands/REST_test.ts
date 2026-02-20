/**
 * Tests for REST command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("REST handler - returns 501 without byte offset", async () => {
  const RestCmd = findCommand("REST")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new RestCmd(conn, createCommandData("REST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("REST handler - sets byte count and returns 350", async () => {
  const RestCmd = findCommand("REST")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new RestCmd(conn, createCommandData("REST", "1024"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 350);
  assertEquals(conn.restByteCount, 1024);
});
