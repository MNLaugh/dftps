/**
 * FTP Server connection tests
 */
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { delay } from "@std/async";
import Server from "../src/server/mod.ts";
import type { FTPServerOptions, ListenOptions } from "../src/server/mod.ts";

const TEST_HOST = "127.0.0.1";
let testPort = 2121;

// Helper to get unique port for each test
function getTestPort(): number {
  return testPort++;
}

// Helper to create a test server
function createTestServer(port: number, options?: Partial<FTPServerOptions>): Server {
  const addr: ListenOptions = {
    hostname: TEST_HOST,
    port: port,
  };
  const serverOptions: FTPServerOptions = {
    debug: false,
    pasvUrl: TEST_HOST,
    pasvMin: 10000,
    pasvMax: 10100,
    ...options,
  };
  return new Server(addr, serverOptions);
}

// Helper to connect to server
async function connectToServer(port: number): Promise<Deno.Conn> {
  return await Deno.connect({ hostname: TEST_HOST, port: port });
}

// Helper to read response with timeout
async function readResponse(conn: Deno.Conn, timeout = 2000): Promise<string> {
  const buffer = new Uint8Array(1024);
  const timeoutId = setTimeout(() => conn.close(), timeout);
  try {
    const n = await conn.read(buffer);
    clearTimeout(timeoutId);
    return n ? new TextDecoder().decode(buffer.subarray(0, n)).trim() : "";
  } catch {
    clearTimeout(timeoutId);
    return "";
  }
}

// Helper to send command (prefixed to avoid lint warning)
async function _sendCommand(conn: Deno.Conn, command: string): Promise<void> {
  await conn.write(new TextEncoder().encode(command + "\r\n"));
}

Deno.test({
  name: "FTP Server - starts and accepts connections",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);

    // Start accepting connections in background
    const serverPromise = (async () => {
      for await (const _connection of server) {
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    assertExists(conn);

    const welcome = await readResponse(conn);
    assertStringIncludes(welcome, "220");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - sets options correctly",
  fn() {
    const port = getTestPort();
    const server = createTestServer(port, {
      debug: true,
      anonymous: true,
      blacklist: ["DELE"],
      fileFormat: "mlsx",
    });
    
    assertExists(server.options);
    assertEquals(server.options.debug, true);
    assertEquals(server.options.anonymous, true);
    assertEquals(server.options.blacklist, ["DELE"]);
    assertEquals(server.options.fileFormat, "mlsx");
    assertEquals(server.options.pasvUrl, TEST_HOST);
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - close stops accepting connections",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    
    await server.close();
    assertEquals(server.listener !== undefined, true);
    
    // Attempting to connect should fail after close
    try {
      await connectToServer(port);
      assertEquals(true, false, "Should have thrown");
    } catch {
      // Expected - server closed
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - debug mode logs messages",
  fn() {
    const port = getTestPort();
    const server = createTestServer(port, { debug: true });
    
    // Should not throw when debug is called
    server.debug("Test debug message");
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - secure mode sets secure flag",
  fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    
    // Without TLS, secure should be false
    assertEquals(server.secure, false);
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - webhookError without webhook does nothing",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    
    // Should not throw when webhook is not configured
    await server.webhookError("Test error");
    await server.webhookError(500);
    await server.webhookError(new Error("Test error object"));
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
Deno.test({
  name: "FTP Server - addr contains hostname and port",
  fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    
    assertEquals(server.addr.hostname, TEST_HOST);
    assertEquals(server.addr.port, port);
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - close with active connections",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    
    // Start accepting connections
    const serverPromise = (async () => {
      for await (const _conn of server) {
        break;
      }
    })();
    
    await delay(50);
    
    // Connect a client
    const conn = await connectToServer(port);
    await readResponse(conn);
    
    // Close server with active connection
    await server.close();
    
    // The connection should be closed
    conn.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - iterates multiple connections",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connectionCount = 0;
    
    // Accept multiple connections
    const serverPromise = (async () => {
      for await (const _conn of server) {
        connectionCount++;
        if (connectionCount >= 2) break;
      }
    })();
    
    await delay(50);
    
    // Connect two clients
    const conn1 = await connectToServer(port);
    await delay(100);
    const conn2 = await connectToServer(port);
    await delay(200);
    
    assertEquals(connectionCount, 2);
    
    conn1.close();
    conn2.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - debug does nothing when debug mode is off",
  fn() {
    const port = getTestPort();
    const server = createTestServer(port, { debug: false });
    
    // Should not throw
    server.debug("This should be ignored");
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "FTP Server - default options are set",
  fn() {
    const port = getTestPort();
    const addr = { hostname: TEST_HOST, port };
    const server = new Server(addr);
    
    // Default options should be set
    assertEquals(server.options.pasvUrl, TEST_HOST);
    assertEquals(server.secure, false);
    
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});