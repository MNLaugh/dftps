/**
 * Tests for RNFR command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("RNFR handler - returns 550 without filesystem", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new RnfrCmd(conn, createCommandData("RNFR", "oldname.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("RNFR handler - returns 501 without args", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "old.txt" }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new RnfrCmd(conn, createCommandData("RNFR", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("RNFR handler - sets renameFrom and returns 350", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "old.txt" }),
    renameFrom: "",
  };
  const mock = createMockConnection({ fs: mockFs });

  const cmd = new RnfrCmd(mock.conn, createCommandData("RNFR", "old.txt"));
  await cmd.handler();

  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 350);
});

Deno.test("RNFR handler - returns 402 when get not supported", async () => {
  const RnfrCmd = findCommand("RNFR")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // get not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new RnfrCmd(conn, createCommandData("RNFR", "old.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
