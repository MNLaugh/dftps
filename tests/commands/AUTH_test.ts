/**
 * Tests for AUTH command handler
 */
import { assertEquals } from "@std/assert";
import { findCommand } from "../../src/server/commands/_REGISTRY.ts";
import type Connection from "../../src/server/connection.ts";
import { createMockConnection, createCommandData, type MockReply } from "./_mock_helpers.ts";

Deno.test("AUTH handler - returns 502 without TLS certificate", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false, addr: {} },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

Deno.test("AUTH handler - returns 502 when only cert is provided", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false, addr: { cert: "test-cert" } },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

Deno.test("AUTH handler - returns 502 when only key is provided", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: false, addr: { key: "test-key" } },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 502);
});

Deno.test("AUTH handler - throws error with code 504 when TLS upgrade fails", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const replies: MockReply[] = [];
  
  // Create a mock with listener that throws when close() is called
  const mockConn = {
    serve: {
      secure: false,
      addr: { cert: "test-cert", key: "test-key", hostname: "localhost", port: 21 },
      listener: {
        close: () => {
          throw new Error("Listener close failed");
        },
      },
    },
    reply: (code: number, message?: string) => {
      replies.push({ code, message });
      return Promise.resolve();
    },
  };
  
  const cmd = new AuthCmd(mockConn as unknown as Connection, createCommandData("AUTH", "TLS"));
  
  let thrownError: Error & { code?: number } | null = null;
  try {
    await cmd.handler();
  } catch (e) {
    thrownError = e as Error & { code?: number };
  }
  
  assertEquals(thrownError !== null, true);
  assertEquals(thrownError!.code, 504);
  assertEquals(thrownError!.message, "Listener close failed");
});

Deno.test("AUTH handler - preserves existing error code when TLS upgrade fails", async () => {
  const AuthCmd = findCommand("AUTH")!;
  
  // Create a mock with listener that throws with a specific code
  const customError = new Error("Custom TLS error") as Error & { code?: number };
  customError.code = 530;
  
  const mockConn = {
    serve: {
      secure: false,
      addr: { cert: "test-cert", key: "test-key", hostname: "localhost", port: 21 },
      listener: {
        close: () => {
          throw customError;
        },
      },
    },
    reply: () => Promise.resolve(),
  };
  
  const cmd = new AuthCmd(mockConn as unknown as Connection, createCommandData("AUTH", "TLS"));
  
  let thrownError: Error & { code?: number } | null = null;
  try {
    await cmd.handler();
  } catch (e) {
    thrownError = e as Error & { code?: number };
  }
  
  assertEquals(thrownError !== null, true);
  // Should preserve the original code 530, not override with 504
  assertEquals(thrownError!.code, 530);
});

Deno.test("AUTH handler - returns 202 if already secure", async () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn, replies } = createMockConnection({
    serve: { secure: true, addr: { cert: "test", key: "test" } },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  await cmd.handler();
  
  assertEquals(replies.length, 1);
  assertEquals(replies[0].code, 202);
});

Deno.test("AUTH handler - has correct static properties", () => {
  const AuthCmd = findCommand("AUTH")!;
  assertEquals(AuthCmd.directive, "AUTH");
  assertEquals(AuthCmd.description, "Set authentication mechanism");
  assertEquals(AuthCmd.syntax, "{{cmd}} <type>");
  assertEquals((AuthCmd.flags as { noAuth?: boolean }).noAuth, true);
  assertEquals((AuthCmd.flags as { feat?: string }).feat, "AUTH TLS SSL");
});

Deno.test("AUTH handler - instance has correct properties", () => {
  const AuthCmd = findCommand("AUTH")!;
  const { conn } = createMockConnection({
    serve: { secure: false, addr: {} },
  });
  
  const cmd = new AuthCmd(conn, createCommandData("AUTH", "TLS"));
  
  assertEquals(cmd.directive, "AUTH");
  assertEquals(cmd.description, "Set authentication mechanism");
  assertEquals((cmd.flags as { noAuth?: boolean }).noAuth, true);
});
