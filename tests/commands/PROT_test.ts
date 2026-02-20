/**
 * Tests for PROT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("PROT handler - returns 202 without TLS", async () => {
  const ProtCmd = findCommand("PROT")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false },
  });

  const cmd = new ProtCmd(conn, createCommandData("PROT", "P"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("PROT handler - returns 503 without PBSZ", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
  });
  // bufferSize undefined means PBSZ wasn't called
  (mock.conn as unknown as { bufferSize?: number }).bufferSize = undefined;

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "P"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 503);
});

Deno.test("PROT handler - accepts P (private)", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "P"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 200);
});

Deno.test("PROT handler - rejects C with 536", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "C"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 536);
});

Deno.test("PROT handler - rejects S with 536", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "S"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 536);
});

Deno.test("PROT handler - rejects E with 536", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "E"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 536);
});

Deno.test("PROT handler - returns 504 for unknown protection level", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", "X"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 504);
});

Deno.test("PROT handler - returns 504 without args", async () => {
  const ProtCmd = findCommand("PROT")!;
  const mock = createMockConnection({
    serve: { secure: true },
    bufferSize: 0,
  });

  const cmd = new ProtCmd(mock.conn, createCommandData("PROT", ""));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 504);
});
