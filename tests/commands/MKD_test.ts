/**
 * Tests for MKD command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("MKD handler - returns 550 without filesystem", async () => {
  const MkdCmd = findCommand("MKD")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new MkdCmd(conn, createCommandData("MKD", "newdir"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MKD handler - returns 501 without args", async () => {
  const MkdCmd = findCommand("MKD")!;
  const mockFs: MockFileSystem = {
    mkdir: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MkdCmd(conn, createCommandData("MKD", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MKD handler - creates directory successfully", async () => {
  const MkdCmd = findCommand("MKD")!;
  const mockFs: MockFileSystem = {
    mkdir: (path: string) => Promise.resolve(path), // MKD expects path to be returned
    currentDirectory: () => "/",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MkdCmd(conn, createCommandData("MKD", "newdir"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 257);
});

Deno.test("MKD handler - returns 402 when mkdir not supported", async () => {
  const MkdCmd = findCommand("MKD")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // mkdir not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MkdCmd(conn, createCommandData("MKD", "newdir"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
