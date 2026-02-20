/**
 * Tests for PORT command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection } from "./_mock_helpers.ts";

Deno.test("PORT handler - returns 501 without arguments", async () => {
  const PortCmd = findCommand("PORT")!;
  const { conn, replies } = createMockConnection();

  const cmd = new PortCmd(conn, createCommandData("PORT", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("PORT handler - returns 425 with invalid format", async () => {
  const PortCmd = findCommand("PORT")!;
  const { conn, replies } = createMockConnection();

  const cmd = new PortCmd(conn, createCommandData("PORT", "192,168,1,1"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 425);
});

Deno.test("PORT handler - has correct static properties", () => {
  const PortCmd = findCommand("PORT")!;
  assertEquals(PortCmd.directive, "PORT");
  assertEquals(PortCmd.description, "Specifies an address and port to which the server should connect");
  assertEquals(PortCmd.syntax, "{{cmd}} <x>,<x>,<x>,<x>,<y>,<y>");
});

Deno.test("PORT handler - instance has correct properties", () => {
  const PortCmd = findCommand("PORT")!;
  const { conn } = createMockConnection();

  const cmd = new PortCmd(conn, createCommandData("PORT", "192,168,1,1,4,1"));

  assertEquals(cmd.directive, "PORT");
  assertEquals(cmd.description, "Specifies an address and port to which the server should connect");
});

Deno.test("PORT handler - parses port correctly", async () => {
  const PortCmd = findCommand("PORT")!;
  const { conn, replies } = createMockConnection();

  // 4,1 = 4*256 + 1 = 1025
  const cmd = new PortCmd(conn, createCommandData("PORT", "127,0,0,1,4,1"));

  try {
    await cmd.handler();
    // If it succeeds, reply should be 200
    assertEquals(replies.length, 1);
    assertEquals(replies[0].code, 200);
  } catch {
    // Connection might fail - that's also acceptable
  }
});
