/**
 * Tests for ABOR command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import { createCommandData, createMockConnection, type MockConnector } from "./_mock_helpers.ts";

Deno.test("ABOR handler - returns 226 without active transfer", async () => {
  const AborCmd = findCommand("ABOR")!;
  const { conn, replies } = createMockConnection();

  const cmd = new AborCmd(conn, createCommandData("ABOR", ""));
  await cmd.handler();

  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 226);
});

Deno.test("ABOR handler - has correct static properties", () => {
  const AborCmd = findCommand("ABOR")!;
  assertEquals(AborCmd.directive, "ABOR");
  assertEquals(AborCmd.description, "Abort an active file transfer");
  assertEquals(AborCmd.syntax, "{{cmd}}");
});

Deno.test("ABOR handler - aborts active transfer with connector", async () => {
  const AborCmd = findCommand("ABOR")!;
  let closedCalled = false;

  const mockConnector: MockConnector = {
    conn: {} as Deno.Conn,
    writer: {
      write: () => Promise.resolve(),
    } as unknown as { write: (data: Uint8Array) => Promise<void> },
    close: () => {
      closedCalled = true;
    },
    accept: () => Promise.resolve(),
  };

  const { conn, replies } = createMockConnection({ connector: mockConnector });

  const cmd = new AborCmd(conn, createCommandData("ABOR", ""));
  await cmd.handler();

  // Should have 426 reply via connector writer and 226 reply
  assertEquals(replies.length, 2);
  assertEquals(replies[0].code, 426);
  assertEquals(replies[1].code, 226);
  assertEquals(closedCalled, true);
});
