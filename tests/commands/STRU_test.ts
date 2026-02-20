/**
 * Tests for STRU command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("STRU handler - returns 200 for File structure", async () => {
  const StruCmd = findCommand("STRU")!;
  const { conn, replies } = createMockConnection();

  const cmd = new StruCmd(conn, createCommandData("STRU", "F"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
});

Deno.test("STRU handler - returns 504 for unsupported structure", async () => {
  const StruCmd = findCommand("STRU")!;
  const { conn, replies } = createMockConnection();

  const cmd = new StruCmd(conn, createCommandData("STRU", "R"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});

Deno.test("STRU handler - returns 501 without args", async () => {
  const StruCmd = findCommand("STRU")!;
  const { conn, replies } = createMockConnection();

  const cmd = new StruCmd(conn, createCommandData("STRU", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});
