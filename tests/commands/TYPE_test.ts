/**
 * Tests for TYPE command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData } from "./_mock_helpers.ts";

Deno.test("TYPE handler - sets ASCII mode with 'A'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "A"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "ascii");
});

Deno.test("TYPE handler - sets binary mode with 'I'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "I"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "binary");
});

Deno.test("TYPE handler - sets binary mode with 'L8'", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "L8"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(conn.transferType, "binary");
});

Deno.test("TYPE handler - returns 501 without args", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("TYPE handler - returns 504 for invalid type", async () => {
  const TypeCmd = findCommand("TYPE")!;
  const { conn, replies } = createMockConnection();
  
  const cmd = new TypeCmd(conn, createCommandData("TYPE", "X"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 504);
});
