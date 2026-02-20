/**
 * Tests for USER command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("USER handler - returns 530 if username already set", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({ username: "existing" });

  const cmd = new UserCmd(conn, createCommandData("USER", "newuser"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 530);
});

Deno.test("USER handler - returns 230 if already authenticated", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({ authenticated: true });

  const cmd = new UserCmd(conn, createCommandData("USER", "user"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});

Deno.test("USER handler - returns 501 without username", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection();

  const cmd = new UserCmd(conn, createCommandData("USER", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("USER handler - returns 230 for anonymous when enabled", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({
    options: { anonymous: true },
  });

  const cmd = new UserCmd(conn, createCommandData("USER", "anonymous"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});

Deno.test("USER handler - returns 331 for valid username", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection();

  const cmd = new UserCmd(conn, createCommandData("USER", "testuser"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 331);
});

Deno.test("USER handler - returns 230 for custom anonymous username", async () => {
  const UserCmd = findCommand("USER")!;
  const { conn, replies } = createMockConnection({
    options: { anonymous: "guest" },
  });

  const cmd = new UserCmd(conn, createCommandData("USER", "guest"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 230);
});
