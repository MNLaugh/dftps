/**
 * Tests for QUIT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("QUIT handler - closes connection with 221", async () => {
  const QuitCmd = findCommand("QUIT")!;
  const mock = createMockConnection();
  
  const cmd = new QuitCmd(mock.conn, createCommandData("QUIT", ""));
  await cmd.handler();
  
  assertEquals(mock.closed, true);
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 221);
});
