/**
 * Tests for PBSZ command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("PBSZ handler - returns 202 without TLS", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", "0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("PBSZ handler - sets buffer size with TLS", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", "0"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.bufferSize, 0);
});

Deno.test("PBSZ handler - returns 501 without args", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("PBSZ handler - non-zero buffer size returns buffer too large message", async () => {
  const PbszCmd = findCommand("PBSZ")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true },
  });
  
  const cmd = new PbszCmd(conn, createCommandData("PBSZ", "1024"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.bufferSize, 1024);
});
