/**
 * Tests for HELP command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("HELP handler - returns 211 with list of commands when no args", async () => {
  const HelpCmd = findCommand("HELP")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new HelpCmd(conn, createCommandData("HELP", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 211);
  // Message is an array containing "Supported commands:"
  const message = String(replies[0].message);
  assertEquals(message.includes("Supported commands"), true);
});

Deno.test("HELP handler - returns 214 for specific command", async () => {
  const HelpCmd = findCommand("HELP")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new HelpCmd(conn, createCommandData("HELP", "USER"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 214);
  const message = String(replies[0].message);
  assertEquals(message.includes("USER"), true);
});

Deno.test("HELP handler - returns 502 for unknown command", async () => {
  const HelpCmd = findCommand("HELP")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new HelpCmd(conn, createCommandData("HELP", "UNKNOWN"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
  const message = String(replies[0].message);
  assertEquals(message.includes("Unknown command"), true);
});

Deno.test("HELP command - has correct properties", () => {
  const HelpCmd = findCommand("HELP")!;
  assertEquals(HelpCmd.directive, "HELP");
  assertEquals(typeof HelpCmd.syntax, "string");
  assertEquals(typeof HelpCmd.description, "string");
});
