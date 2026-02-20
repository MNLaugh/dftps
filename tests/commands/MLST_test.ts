/**
 * Tests for MLST command handler
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("MLST handler - returns 550 without filesystem", async () => {
  const MlstCmd = findCommand("MLST")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("MLST handler - has correct static properties", () => {
  const MlstCmd = findCommand("MLST")!;
  assertEquals(MlstCmd.directive, "MLST");
  assertEquals(MlstCmd.description, "Returns file/directory info in machine-readable format (RFC 3659)");
  assertEquals(MlstCmd.syntax, "{{cmd}} [<path>]");
  assertEquals((MlstCmd.flags as { feat?: string }).feat, "MLST type*;size*;modify*;perm*;unique*;");
});

Deno.test("MLST handler - returns 502 when fs.get not supported", async () => {
  const MlstCmd = findCommand("MLST")!;
  // deno-lint-ignore no-explicit-any
  const mockFs: any = {
    // No get method defined
    list: () => Promise.resolve([]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

Deno.test("MLST handler - returns 550 for non-existent file", async () => {
  const MlstCmd = findCommand("MLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.reject(new Deno.errors.NotFound("Not found")),
    list: () => Promise.resolve([]),
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "nonexistent.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
  assertStringIncludes(String(replies[0].message), "No such file");
});

Deno.test("MLST handler - returns file info for current dir", async () => {
  const MlstCmd = findCommand("MLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: true, name: "." }),
    mlsx: () => "type=dir; .",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  // MLST with no args uses "." as default
  const cmd = new MlstCmd(conn, createCommandData("MLST", ""));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});

Deno.test("MLST handler - returns file info", async () => {
  const MlstCmd = findCommand("MLST")!;
  const mockFs: MockFileSystem = {
    get: () => Promise.resolve({ isDirectory: false, name: "file.txt" }),
    mlsx: () => "type=file;size=1234; file.txt",
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new MlstCmd(conn, createCommandData("MLST", "file.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 250);
});
