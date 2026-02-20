/**
 * Tests for MFMT command handler
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("MFMT handler - returns 550 without filesystem", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "20260101120000 file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MFMT handler - has correct static properties", () => {
  const MfmtCmd = findCommand("MFMT")!;
  assertEquals(MfmtCmd.directive, "MFMT");
  assertEquals(MfmtCmd.description, "Modify the last modification time of a file");
  assertEquals(MfmtCmd.syntax, "{{cmd}} <timestamp> <path>");
  assertEquals((MfmtCmd.flags as { feat?: string }).feat, "MFMT");
});

Deno.test("MFMT handler - returns 501 with invalid timestamp format", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ name: "test.txt", isDirectory: false }),
    utime: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  // Invalid format - should return 501
  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "invalid file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MFMT handler - returns 550 for non-existent file", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.reject(new Deno.errors.NotFound("Not found")),
    utime: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "20260101120000 nonexistent.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
  assertStringIncludes(String(replies[0].message), "No such file");
});

Deno.test("MFMT handler - returns 501 without args", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  const mockFs: MockFileSystem = {
    utime: async () => {},
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MfmtCmd(conn, createCommandData("MFMT", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MFMT handler - modifies file time", async () => {
  const MfmtCmd = findCommand("MFMT")!;
  let utimeCallPath: string | null = null;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isFile: true, isDirectory: false, name: "test.txt", size: 100 }),
    utime: (path: string) => {
      utimeCallPath = path;
      return Promise.resolve();
    },
    currentDirectory: () => "/",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MfmtCmd(conn, createCommandData("MFMT", "20260217120000 test.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
  assertEquals(utimeCallPath, "test.txt");
});
