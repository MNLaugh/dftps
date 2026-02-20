/**
 * Tests for OPTS command handler
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("OPTS handler - sets UTF8 on", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new OptsCmd(conn, createCommandData("OPTS", "UTF-8 ON"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.encoding, "utf8");
});

Deno.test("OPTS handler - sets UTF8 off to ascii", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new OptsCmd(conn, createCommandData("OPTS", "UTF-8 OFF"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.encoding, "ascii");
});

Deno.test("OPTS handler - returns 501 for unknown option", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new OptsCmd(conn, createCommandData("OPTS", "UNKNOWN_OPTION"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
  assertStringIncludes(String(replies[0].message), "Unknown option");
});

Deno.test("OPTS handler - returns 501 for invalid setting", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new OptsCmd(conn, createCommandData("OPTS", "UTF-8 INVALID"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
  assertStringIncludes(String(replies[0].message), "Unknown setting");
});

Deno.test("OPTS handler - returns 501 without args", async () => {
  const OptsCmd = findCommand("OPTS")!;
  const { conn, replies } = createMockConnection();

  const cmd = new OptsCmd(conn, createCommandData("OPTS", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});
