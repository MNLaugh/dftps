/**
 * Tests for PWD command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("PWD handler - returns 550 without filesystem", async () => {
  const PwdCmd = findCommand("PWD")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("PWD handler - returns current directory", async () => {
  const PwdCmd = findCommand("PWD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/home/user",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
  assertEquals(replies[0].message, '"/home/user"');
});

Deno.test("PWD handler - escapes quotes in path", async () => {
  const PwdCmd = findCommand("PWD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => '/home/"user"',
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
  assertEquals(replies[0].message, '"/home/""user"""');
});

Deno.test("PWD handler - returns 402 when currentDirectory not supported", async () => {
  const PwdCmd = findCommand("PWD")!;
  const mockFs: MockFileSystem = {
    // currentDirectory not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new PwdCmd(conn, createCommandData("PWD", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
