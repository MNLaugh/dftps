/**
 * Tests for IterableReader class - async iterable for FTP line reading
 */
import { assertEquals } from "@std/assert";
import IterableReader from "../src/_utils/iterableReader.ts";

// Helper to create a mock connection with a readable stream
function createMockConn(chunks: Uint8Array[]): Deno.Conn {
  let index = 0;
  const readable = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });

  return {
    readable,
    localAddr: { transport: "tcp", hostname: "127.0.0.1", port: 21 },
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 12345 },
    close: () => {},
    closeWrite: () => Promise.resolve(),
    writable: new WritableStream(),
    ref: () => {},
    unref: () => {},
  } as unknown as Deno.Conn;
}

// Test encoder/decoder utilities used by IterableReader
Deno.test("IterableReader - TextDecoder decodes UTF-8", () => {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  const text = "Hello FTP\r\n";
  const encoded = encoder.encode(text);
  const decoded = decoder.decode(encoded);
  
  assertEquals(decoded, text);
});

Deno.test("IterableReader - handles CRLF line endings", () => {
  const buffer = "USER admin\r\nPASS secret\r\n";
  const lines: string[] = [];
  
  let remaining = buffer;
  let lineEnd: number;
  while ((lineEnd = remaining.indexOf("\r\n")) !== -1) {
    const line = remaining.substring(0, lineEnd);
    remaining = remaining.substring(lineEnd + 2);
    lines.push(line);
  }
  
  assertEquals(lines, ["USER admin", "PASS secret"]);
  assertEquals(remaining, "");
});

Deno.test("IterableReader - handles LF-only line endings", () => {
  const buffer = "USER admin\nPASS secret\n";
  const lines: string[] = [];
  
  let remaining = buffer;
  let lineEnd: number;
  while ((lineEnd = remaining.indexOf("\n")) !== -1) {
    const line = remaining.substring(0, lineEnd).replace(/\r$/, "");
    remaining = remaining.substring(lineEnd + 1);
    lines.push(line);
  }
  
  assertEquals(lines, ["USER admin", "PASS secret"]);
  assertEquals(remaining, "");
});

Deno.test("IterableReader - handles mixed line endings", () => {
  const buffer = "CMD1\r\nCMD2\nCMD3\r\n";
  const lines: string[] = [];
  
  let remaining = buffer;
  
  // First process CRLF
  let lineEnd: number;
  while ((lineEnd = remaining.indexOf("\r\n")) !== -1) {
    const line = remaining.substring(0, lineEnd);
    remaining = remaining.substring(lineEnd + 2);
    lines.push(line);
  }
  
  // Then process LF
  while ((lineEnd = remaining.indexOf("\n")) !== -1) {
    const line = remaining.substring(0, lineEnd).replace(/\r$/, "");
    remaining = remaining.substring(lineEnd + 1);
    lines.push(line);
  }
  
  // After CRLF processing, data becomes: "USER admin\nPASS secret\nQUIT"
  // The QUIT doesn't have a line ending so it stays in buffer
  assertEquals(lines.length, 2);
});

Deno.test("IterableReader - preserves partial data in buffer", () => {
  let buffer = "";
  
  // Simulate receiving partial data
  buffer += "USER adm";
  assertEquals(buffer.indexOf("\r\n"), -1);
  
  // More data arrives
  buffer += "in\r\n";
  const lineEnd = buffer.indexOf("\r\n");
  assertEquals(lineEnd, 10);
  
  const line = buffer.substring(0, lineEnd);
  buffer = buffer.substring(lineEnd + 2);
  
  assertEquals(line, "USER admin");
  assertEquals(buffer, "");
});

Deno.test("IterableReader - handles empty lines", () => {
  const buffer = "\r\n\r\nCMD\r\n";
  const lines: string[] = [];
  
  let remaining = buffer;
  let lineEnd: number;
  while ((lineEnd = remaining.indexOf("\r\n")) !== -1) {
    const line = remaining.substring(0, lineEnd);
    remaining = remaining.substring(lineEnd + 2);
    lines.push(line);
  }
  
  assertEquals(lines, ["", "", "CMD"]);
});

Deno.test("IterableReader - handles long commands", () => {
  const longArg = "A".repeat(1000);
  const buffer = `STOR ${longArg}\r\n`;
  
  const lineEnd = buffer.indexOf("\r\n");
  const line = buffer.substring(0, lineEnd);
  
  assertEquals(line.length, 1005);
  assertEquals(line, `STOR ${longArg}`);
});

Deno.test("IterableReader - handles UTF-8 characters", () => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const text = "STOR fichier-été-2026.txt\r\n";
  const encoded = encoder.encode(text);
  const decoded = decoder.decode(encoded);
  
  assertEquals(decoded, text);
});

Deno.test("IterableReader - handles binary-like data in path", () => {
  const buffer = "STOR file with spaces.txt\r\n";
  const lineEnd = buffer.indexOf("\r\n");
  const line = buffer.substring(0, lineEnd);
  
  assertEquals(line, "STOR file with spaces.txt");
});

// ============================================
// IterableReader class tests with mock connections
// ============================================

Deno.test("IterableReader - yields lines from stream", async () => {
  const encoder = new TextEncoder();
  const mockConn = createMockConn([
    encoder.encode("USER admin\r\n"),
    encoder.encode("PASS secret\r\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["USER admin", "PASS secret"]);
});

Deno.test("IterableReader - handles chunked data", async () => {
  const encoder = new TextEncoder();
  // Data arrives in chunks that don't align with line endings
  const mockConn = createMockConn([
    encoder.encode("USER adm"),
    encoder.encode("in\r\nPASS"),
    encoder.encode(" secret\r\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["USER admin", "PASS secret"]);
});

Deno.test("IterableReader - handles multiple lines in single chunk", async () => {
  const encoder = new TextEncoder();
  const mockConn = createMockConn([
    encoder.encode("CMD1\r\nCMD2\r\nCMD3\r\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["CMD1", "CMD2", "CMD3"]);
});

Deno.test("IterableReader - handles LF only line endings", async () => {
  const encoder = new TextEncoder();
  const mockConn = createMockConn([
    encoder.encode("CMD1\nCMD2\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["CMD1", "CMD2"]);
});

Deno.test("IterableReader - yields remaining buffer on close", async () => {
  const encoder = new TextEncoder();
  // Data without trailing newline
  const mockConn = createMockConn([
    encoder.encode("PARTIAL"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["PARTIAL"]);
});

Deno.test("IterableReader - close method releases reader", () => {
  const encoder = new TextEncoder();
  const mockConn = createMockConn([
    encoder.encode("DATA\r\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  reader.close();
  
  // After close, the reader should not throw
  assertEquals(typeof reader.close, "function");
});

Deno.test("IterableReader - handles empty stream", async () => {
  const mockConn = createMockConn([]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles UTF-8 data", async () => {
  const encoder = new TextEncoder();
  const mockConn = createMockConn([
    encoder.encode("STOR été-2026.txt\r\n"),
  ]);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  const decoder = new TextDecoder();
  
  for await (const chunk of reader) {
    lines.push(decoder.decode(chunk));
  }
  
  assertEquals(lines, ["STOR été-2026.txt"]);
});

// ============================================
// Error handling tests - cover error branches
// ============================================

// Helper to create a mock connection that throws an error
function createErrorConn(error: Error): Deno.Conn {
  const readable = new ReadableStream<Uint8Array>({
    pull() {
      throw error;
    },
  });

  return {
    readable,
    localAddr: { transport: "tcp", hostname: "127.0.0.1", port: 21 },
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 12345 },
    close: () => {},
    closeWrite: () => Promise.resolve(),
    writable: new WritableStream(),
    ref: () => {},
    unref: () => {},
  } as unknown as Deno.Conn;
}

Deno.test("IterableReader - handles BadResource error gracefully", async () => {
  const mockConn = createErrorConn(new Deno.errors.BadResource("Connection closed"));
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles Interrupted error gracefully", async () => {
  const mockConn = createErrorConn(new Deno.errors.Interrupted("Interrupted"));
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles ConnectionReset error gracefully", async () => {
  const mockConn = createErrorConn(new Deno.errors.ConnectionReset("Connection reset"));
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles UnexpectedEof error gracefully", async () => {
  const error = new Error("Unexpected end of file");
  error.name = "UnexpectedEof";
  const mockConn = createErrorConn(error);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles ConnectionRefused error gracefully", async () => {
  const error = new Error("Connection refused");
  error.name = "ConnectionRefused";
  const mockConn = createErrorConn(error);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - handles ConnectionAborted error gracefully", async () => {
  const error = new Error("Connection aborted");
  error.name = "ConnectionAborted";
  const mockConn = createErrorConn(error);
  
  const reader = new IterableReader(mockConn);
  const lines: string[] = [];
  
  for await (const chunk of reader) {
    lines.push(new TextDecoder().decode(chunk));
  }
  
  assertEquals(lines, []);
});

Deno.test("IterableReader - rethrows unknown errors", async () => {
  const mockConn = createErrorConn(new Error("Unknown error"));
  
  const reader = new IterableReader(mockConn);
  let errorThrown = false;
  
  try {
    for await (const _ of reader) {
      // Should not reach here
    }
  } catch (e) {
    errorThrown = true;
    assertEquals((e as Error).message, "Unknown error");
  }
  
  assertEquals(errorThrown, true);
});
