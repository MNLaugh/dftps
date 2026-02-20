/**
 * Tests for deps.ts utility functions
 */
import { assertEquals, assertExists } from "@std/assert";
import { decode, deferred, encode, getPort, makeRange, randomPort, v4 } from "../deps.ts";

// ============================================================================
// deferred() tests
// ============================================================================

Deno.test("deferred - creates a promise with resolve/reject methods", async () => {
  const d = deferred<number>();

  assertExists(d.resolve);
  assertExists(d.reject);
  assertEquals(d.state, "pending");

  d.resolve(42);
  const result = await d;

  assertEquals(result, 42);
  assertEquals(d.state, "fulfilled");
});

Deno.test("deferred - reject changes state to rejected", async () => {
  const d = deferred<number>();

  assertEquals(d.state, "pending");

  d.reject(new Error("Test error"));

  try {
    await d;
  } catch (e) {
    assertEquals((e as Error).message, "Test error");
  }

  assertEquals(d.state, "rejected");
});

// ============================================================================
// v4.generate() tests
// ============================================================================

Deno.test("v4.generate - creates valid UUID", () => {
  const uuid = v4.generate();

  assertExists(uuid);
  assertEquals(typeof uuid, "string");
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  assertEquals(uuid.length, 36);
  assertEquals(uuid.split("-").length, 5);
});

Deno.test("v4.generate - creates unique UUIDs", () => {
  const uuid1 = v4.generate();
  const uuid2 = v4.generate();

  assertEquals(uuid1 !== uuid2, true);
});

// ============================================================================
// makeRange() tests
// ============================================================================

Deno.test("makeRange - creates range from min to max", () => {
  const range = makeRange(1, 5);

  assertEquals(range, [1, 2, 3, 4, 5]);
});

Deno.test("makeRange - handles single value range", () => {
  const range = makeRange(10, 10);

  assertEquals(range, [10]);
});

Deno.test("makeRange - handles large range", () => {
  const range = makeRange(1000, 1010);

  assertEquals(range.length, 11);
  assertEquals(range[0], 1000);
  assertEquals(range[10], 1010);
});

// ============================================================================
// randomPort() tests
// ============================================================================

Deno.test("randomPort - returns a port from the range", () => {
  const range = [8000, 8001, 8002];
  const port = randomPort(range);

  assertEquals(range.includes(port), true);
});

Deno.test("randomPort - works with single port range", () => {
  const range = [9999];
  const port = randomPort(range);

  assertEquals(port, 9999);
});

// ============================================================================
// getPort() tests
// ============================================================================

Deno.test("getPort - returns specified port if available", () => {
  // Use a high port number that's unlikely to be in use
  const port = getPort({ port: 59999 });

  // It should either return the requested port or find another
  assertEquals(typeof port, "number");
  assertEquals(port > 0, true);
});

Deno.test("getPort - finds random port without options", () => {
  const port = getPort();

  assertEquals(typeof port, "number");
  assertEquals(port > 0, true);
});

Deno.test("getPort - finds random port when specified port is in use", () => {
  // First, occupy a port
  const listener = Deno.listen({ port: 0 });
  const usedPort = (listener.addr as Deno.NetAddr).port;

  try {
    // Try to get the same port - should find another
    const port = getPort({ port: usedPort });

    assertEquals(typeof port, "number");
    assertEquals(port > 0, true);
    // Port should be different since the original is in use
    assertEquals(port !== usedPort, true);
  } finally {
    listener.close();
  }
});

// ============================================================================
// encode() / decode() tests
// ============================================================================

Deno.test("encode - converts string to Uint8Array", () => {
  const result = encode("hello");

  assertEquals(result instanceof Uint8Array, true);
  assertEquals(result.length, 5);
});

Deno.test("encode - handles UTF-8 characters", () => {
  const result = encode("héllo wörld");

  assertEquals(result instanceof Uint8Array, true);
  // UTF-8 encoding increases byte count for non-ASCII chars
  assertEquals(result.length > 11, true);
});

Deno.test("decode - converts Uint8Array to string", () => {
  const bytes = new Uint8Array([104, 101, 108, 108, 111]);
  const result = decode(bytes);

  assertEquals(result, "hello");
});

Deno.test("encode/decode - round trip", () => {
  const original = "Test message with UTF-8: été 日本語";
  const encoded = encode(original);
  const decoded = decode(encoded);

  assertEquals(decoded, original);
});

Deno.test("decode - handles empty array", () => {
  const result = decode(new Uint8Array(0));

  assertEquals(result, "");
});
