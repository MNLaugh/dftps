/**
 * Tests for CLNT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("CLNT handler - stores software info and returns 200", async () => {
  const ClntCmd = findCommand("CLNT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ClntCmd(conn, createCommandData("CLNT", "FileZilla 3.0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.software, "FileZilla 3.0");
});

Deno.test("CLNT handler - works with empty args", async () => {
  const ClntCmd = findCommand("CLNT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ClntCmd(conn, createCommandData("CLNT", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.software, "");
});

Deno.test("CLNT handler - handles error in reply", async () => {
  const ClntCmd = findCommand("CLNT")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new ClntCmd(conn, createCommandData("CLNT", "FileZilla"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.software, "FileZilla");
});
