/**
 * Tests for RNTO command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createMockConnection, createCommandData, type MockFileSystem } from "./_mock_helpers.ts";

Deno.test("RNTO handler - returns 550 without filesystem", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const { conn, replies } = createMockConnection({ fs: null });
  
  const cmd = new RntoCmd(conn, createCommandData("RNTO", "newname.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 550);
});

Deno.test("RNTO handler - returns 501 without args", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "old.txt",
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", ""));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 501);
});

Deno.test("RNTO handler - renames with empty renameFrom", async () => {
  // Note: Current implementation doesn't check if RNFR was called first
  // It just calls rename with empty string as source
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "", // Empty renameFrom - RNFR wasn't called
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", "new.txt"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  // Current impl returns 250 even with empty renameFrom
  assertEquals(mock.replies[0].code, 250);
});

Deno.test("RNTO handler - renames file successfully", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    rename: async () => {},
    renameFrom: "old.txt", // renameFrom is on fs object, not separate
  };
  const mock = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(mock.conn, createCommandData("RNTO", "new.txt"));
  await cmd.handler();
  
  assertEquals(mock.replies.length, 1);
  assertEquals(mock.replies[0].code, 250);
});

Deno.test("RNTO handler - returns 402 when rename not supported", async () => {
  const RntoCmd = findCommand("RNTO")!;
  const mockFs: MockFileSystem = {
    currentDirectory: () => "/",
    renameFrom: "old.txt",
    // rename not defined
  };
  const { conn, replies } = createMockConnection({ fs: mockFs });
  
  const cmd = new RntoCmd(conn, createCommandData("RNTO", "new.txt"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 402);
});
