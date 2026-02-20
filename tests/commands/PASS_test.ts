/**
 * Tests for PASS command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("PASS handler - returns 503 without username", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new PassCmd(conn, createCommandData("PASS", "secret"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 503);
});

Deno.test("PASS handler - returns 202 if already authenticated", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection({
    username: "user",
    authenticated: true,
  });

  const cmd = new PassCmd(conn, createCommandData("PASS", "secret"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("PASS handler - closes with 501 without password", async () => {
  const PassCmd = findCommand("PASS")!;
  const mock = createMockConnection({ username: "user" });

  const cmd = new PassCmd(mock.conn, createCommandData("PASS", ""));
  await cmd.handler();

  assertEquals(mock.closed, true);
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 501);
});

Deno.test("PASS handler - returns 230 on successful login", async () => {
  const PassCmd = findCommand("PASS")!;
  const { conn, replies } = createMockConnection({ username: "user" });

  const cmd = new PassCmd(conn, createCommandData("PASS", "validpass"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});
