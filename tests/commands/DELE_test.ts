/**
 * Tests for DELE command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("DELE handler - returns 550 without filesystem", async () => {
  const DeleCmd = findCommand("DELE")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new DeleCmd(conn, createCommandData("DELE", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("DELE handler - returns 501 without args", async () => {
  const DeleCmd = findCommand("DELE")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new DeleCmd(conn, createCommandData("DELE", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("DELE handler - deletes file successfully", async () => {
  const DeleCmd = findCommand("DELE")!;
  const mockFs: MockFileSystem = {
    delete: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new DeleCmd(conn, createCommandData("DELE", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

Deno.test("DELE handler - returns 402 when delete not supported", async () => {
  const DeleCmd = findCommand("DELE")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // delete not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new DeleCmd(conn, createCommandData("DELE", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
