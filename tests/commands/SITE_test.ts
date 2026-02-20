/**
 * Tests for SITE command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("SITE handler - returns 550 without filesystem", async () => {
  const SiteCmd = findCommand("SITE")!;
  const { conn, replies } = createMockConnection({ fs: null });

  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("SITE handler - returns 402 when chmod not supported", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    // No chmod method
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 file.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});

Deno.test("SITE handler - returns 550 without args", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    chmod: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new SiteCmd(conn, createCommandData("SITE", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("SITE handler - CHMOD changes permissions", async () => {
  const SiteCmd = findCommand("SITE")!;
  let chmodCalled = false;
  let chmodPath = "";
  let chmodMode = 0;

  const mockFs: MockFileSystem = {
    chmod: (path: string, mode: number) => {
      chmodCalled = true;
      chmodPath = path;
      chmodMode = mode;
      return Promise.resolve();
    },
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 755 myfile.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(chmodCalled, true);
  assertEquals(chmodPath, "myfile.txt");
  assertEquals(chmodMode, 0o755);
});

Deno.test("SITE handler - CHMOD with path containing spaces", async () => {
  const SiteCmd = findCommand("SITE")!;
  let chmodPath = "";

  const mockFs: MockFileSystem = {
    chmod: (path: string) => {
      chmodPath = path;
      return Promise.resolve();
    },
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new SiteCmd(conn, createCommandData("SITE", "CHMOD 644 my file with spaces.txt"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 200);
  assertEquals(chmodPath, "my file with spaces.txt");
});

Deno.test("SITE handler - unknown subcommand returns 500", async () => {
  const SiteCmd = findCommand("SITE")!;
  const mockFs: MockFileSystem = {
    chmod: () => Promise.resolve(),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });

  const cmd = new SiteCmd(conn, createCommandData("SITE", "UNKNOWN arg1 arg2"));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 500);
});
