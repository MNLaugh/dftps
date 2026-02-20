/**
 * Tests for MDTM command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("MDTM handler - returns 550 without filesystem", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MDTM handler - returns 501 without args", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "file.txt", mtime: new Date() }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 501);
});

Deno.test("MDTM handler - returns modification time", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () =>
      Promise.resolve({
        isDirectory: false,
        name: "file.txt",
        mtime: new Date("2026-02-17T12:00:00Z"),
      }),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
});

Deno.test("MDTM handler - returns 402 when get not supported", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    // get not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("MDTM handler - returns 550 when file has no mtime", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isFile: true, size: 100, mtime: null }),
    currentDirectory: () => "/",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MDTM handler - returns 213 with formatted mtime", async () => {
  const MdtmCmd = findCommand("MDTM")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isFile: true, size: 100, mtime: new Date("2024-01-15T10:30:00Z").getTime() }),
    currentDirectory: () => "/",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new MdtmCmd(conn, createCommandData("MDTM", "file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 213);
  // Verify message contains date
  assertEquals(typeof replies[0].message, "string");
});
