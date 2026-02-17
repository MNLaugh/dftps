/**
 * Tests for FTP connectors (passive and active)
 * These tests cover the connector classes for data transfer
 */
import { assertEquals, assertThrows } from "@std/assert";
import PassiveConnection from "../src/server/connectors/passive.ts";
import ActiveConnector from "../src/server/connectors/active.ts";
import type Connection from "../src/server/connection.ts";

// ============================================================================
// Mock helpers
// ============================================================================

function createMockConnection(opts: {
  pasvUrl?: string;
  secure?: boolean;
  addr?: Record<string, unknown>;
} = {}): Connection {
  return {
    options: { pasvUrl: opts.pasvUrl ?? "127.0.0.1" },
    serve: { 
      secure: opts.secure ?? false, 
      addr: opts.addr ?? {} 
    },
  } as unknown as Connection;
}

// ============================================================================
// PassiveConnection tests - constructor
// ============================================================================

Deno.test("PassiveConnection - constructor sets hostname from pasvUrl", () => {
  const mockConn = createMockConnection({ pasvUrl: "192.168.1.1" });
  const passive = new PassiveConnection(mockConn);
  
  assertEquals(passive.hostname, "192.168.1.1");
  assertEquals(passive.connection, mockConn);
});

Deno.test("PassiveConnection - constructor generates random port", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  // Port should be in valid range (1024-65535)
  assertEquals(passive.port >= 1024, true);
  assertEquals(passive.port <= 65535, true);
});

Deno.test("PassiveConnection - different instances get different ports", () => {
  const mockConn = createMockConnection();
  const ports = new Set<number>();
  
  // Create multiple instances and check ports are varied
  for (let i = 0; i < 10; i++) {
    const passive = new PassiveConnection(mockConn);
    ports.add(passive.port);
  }
  
  // There should be at least some variation (unlikely all 10 are same)
  assertEquals(ports.size > 1, true);
});

// ============================================================================
// PassiveConnection tests - close methods
// ============================================================================

Deno.test("PassiveConnection - closeConn handles undefined conn", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  // Should not throw when conn is undefined
  passive.closeConn();
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - closeConn closes connection", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  let closeCalled = false;
  passive.conn = {
    close: () => { closeCalled = true; },
  } as unknown as Deno.Conn;
  
  passive.closeConn();
  
  assertEquals(closeCalled, true);
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - closeConn handles BadResource error", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  passive.conn = {
    close: () => { throw new Deno.errors.BadResource("Already closed"); },
  } as unknown as Deno.Conn;
  
  // Should not throw for BadResource
  passive.closeConn();
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - closeConn handles InvalidData error", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  passive.conn = {
    close: () => { throw new Deno.errors.InvalidData("Invalid data"); },
  } as unknown as Deno.Conn;
  
  // Should not throw for InvalidData
  passive.closeConn();
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - closeConn handles ConnectionAborted error", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  passive.conn = {
    close: () => { throw new Deno.errors.ConnectionAborted("Aborted"); },
  } as unknown as Deno.Conn;
  
  // Should not throw for ConnectionAborted
  passive.closeConn();
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - closeConn rethrows other errors", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  const customError = new Error("Custom error");
  passive.conn = {
    close: () => { throw customError; },
  } as unknown as Deno.Conn;
  
  assertThrows(
    () => passive.closeConn(),
    Error,
    "Custom error"
  );
});

Deno.test("PassiveConnection - close calls closeConn", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  let connCloseCalled = false;
  passive.conn = {
    close: () => { connCloseCalled = true; },
  } as unknown as Deno.Conn;
  
  passive.close();
  
  assertEquals(connCloseCalled, true);
  assertEquals(passive.conn, undefined);
});

Deno.test("PassiveConnection - close handles undefined listener", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  // Should not throw when listener is undefined
  passive.close();
  assertEquals(passive.listener, undefined);
});

Deno.test("PassiveConnection - close closes listener", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  let listenerCloseCalled = false;
  passive.listener = {
    close: () => { listenerCloseCalled = true; },
  } as unknown as Deno.Listener;
  
  passive.close();
  
  assertEquals(listenerCloseCalled, true);
  assertEquals(passive.listener, undefined);
});

Deno.test("PassiveConnection - close rethrows listener errors", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  const listenerError = new Error("Listener error");
  passive.listener = {
    close: () => { throw listenerError; },
  } as unknown as Deno.Listener;
  
  assertThrows(
    () => passive.close(),
    Error,
    "Listener error"
  );
});

// ============================================================================
// PassiveConnection tests - create method
// ============================================================================

Deno.test("PassiveConnection - create closes existing conn", () => {
  const mockConn = createMockConnection();
  const passive = new PassiveConnection(mockConn);
  
  let closeCalled = false;
  passive.conn = {
    close: () => { closeCalled = true; },
  } as unknown as Deno.Conn;
  
  try {
    passive.create();
    // If create succeeds, close the listener to avoid leaks
    passive.close();
  } catch {
    // Expected to fail due to no real network binding
  }
  
  assertEquals(closeCalled, true);
});

// ============================================================================
// ActiveConnector tests - constructor
// ============================================================================

Deno.test("ActiveConnector - constructor sets connection", () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  assertEquals(active.connection, mockConn);
  assertEquals(active.hostname, undefined);
  assertEquals(active.port, undefined);
});

// ============================================================================
// ActiveConnector tests - close method
// ============================================================================

Deno.test("ActiveConnector - close handles undefined conn", () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  // Should not throw when conn is undefined
  active.close();
});

Deno.test("ActiveConnector - close closes connection", () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  let closeCalled = false;
  active.conn = {
    close: () => { closeCalled = true; },
  } as unknown as Deno.Conn;
  
  active.close();
  
  assertEquals(closeCalled, true);
});

Deno.test("ActiveConnector - close rethrows errors", () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  const closeError = new Error("Close error");
  active.conn = {
    close: () => { throw closeError; },
  } as unknown as Deno.Conn;
  
  assertThrows(
    () => active.close(),
    Error,
    "Close error"
  );
});

// ============================================================================
// ActiveConnector tests - accept method
// ============================================================================

Deno.test("ActiveConnector - accept without hostname/port does nothing", async () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  // No hostname/port set, should return without connecting
  const result = await active.accept();
  
  assertEquals(result, active);
  assertEquals(active.reader, undefined);
  assertEquals(active.writer, undefined);
});

Deno.test("ActiveConnector - accept with existing conn sets up reader/writer", async () => {
  const mockConn = createMockConnection();
  const active = new ActiveConnector(mockConn);
  
  const mockReader = {} as ReadableStreamDefaultReader<Uint8Array>;
  const mockWriter = {} as WritableStreamDefaultWriter<Uint8Array>;
  
  active.conn = {
    readable: {
      getReader: () => mockReader,
    },
    writable: {
      getWriter: () => mockWriter,
    },
  } as unknown as Deno.Conn;
  
  await active.accept();
  
  assertEquals(active.reader, mockReader);
  assertEquals(active.writer, mockWriter);
});
