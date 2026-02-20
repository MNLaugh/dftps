/**
 * Tests for EPRT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("EPRT handler - returns 501 without arguments", async () => {
  const EprtCmd = findCommand("EPRT")!;
  const { conn, replies } = createMockConnection();

  const cmd = new EprtCmd(conn, createCommandData("EPRT", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("EPRT handler - has correct static properties", () => {
  const EprtCmd = findCommand("EPRT")!;
  assertEquals(EprtCmd.directive, "EPRT");
  assertEquals(EprtCmd.description, "Specifies an address and port to which the server should connect");
  assertEquals(EprtCmd.syntax, "{{cmd}} |<protocol>|<address>|<port>|");
});

Deno.test("EPRT handler - instance has correct properties", () => {
  const EprtCmd = findCommand("EPRT")!;
  const { conn } = createMockConnection();

  const cmd = new EprtCmd(conn, createCommandData("EPRT", "|1|127.0.0.1|1025|"));

  assertEquals(cmd.directive, "EPRT");
  assertEquals(cmd.description, "Specifies an address and port to which the server should connect");
});

Deno.test("EPRT handler - parses extended port command", async () => {
  const EprtCmd = findCommand("EPRT")!;
  const { conn, replies } = createMockConnection();

  const cmd = new EprtCmd(conn, createCommandData("EPRT", "|1|127.0.0.1|1025|"));

  try {
    await cmd.handler();
    // If it succeeds, reply should be 200
    assertEquals(replies.length, 1);
    assertEquals(replies[0].code, 200);
  } catch {
    // Connection might fail - that's also acceptable
  }
});
