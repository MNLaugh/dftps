/**
 * Tests for Connection class
 * Tests cover the Connection class methods and properties
 */
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { delay } from "@std/async";
import Server from "../src/server/mod.ts";
import type { FTPServerOptions, ListenOptions } from "../src/server/mod.ts";
import Connection from "../src/server/connection.ts";
import { certsExist, loadTestCerts } from "./fixtures/test_certs.ts";

const TEST_HOST = "127.0.0.1";
let testPort = 3100;

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
async function readResponse(conn: Deno.Conn, timeout = 3000): Promise<string> {
  const buffer = new Uint8Array(2048);
  const timeoutId = setTimeout(() => {
    try {
      conn.close();
    } catch { /* ignore */ }
  }, timeout);
  try {
    const n = await conn.read(buffer);
    clearTimeout(timeoutId);
    return n ? new TextDecoder().decode(buffer.subarray(0, n)).trim() : "";
  } catch {
    clearTimeout(timeoutId);
    return "";
  }
}

Deno.test({
  name: "Connection - receives welcome message",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);

    const serverPromise = (async () => {
      for await (const _connection of server) {
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    const welcome = await readResponse(conn);

    assertStringIncludes(welcome, "220");
    assertStringIncludes(welcome, "Welcome");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - connection has unique ID",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    const connections: Connection[] = [];

    const serverPromise = (async () => {
      let count = 0;
      for await (const connection of server) {
        connections.push(connection);
        count++;
        if (count >= 2) break;
      }
    })();

    await delay(50);

    const conn1 = await connectToServer(port);
    await delay(100);
    const conn2 = await connectToServer(port);
    await delay(200);

    // Each connection should have a unique ID
    assertEquals(connections.length, 2);
    assertExists(connections[0].id);
    assertExists(connections[1].id);
    assertEquals(connections[0].id !== connections[1].id, true);

    conn1.close();
    conn2.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - has localAddr and remoteAddr",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertExists(connection!.localAddr);
    assertExists(connection!.remoteAddr);
    assertEquals(connection!.localAddr.port, port);
    assertEquals(connection!.localAddr.hostname, TEST_HOST);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - closed property is initially false",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.closed, false);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - default transfer type is binary",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.transferType, "binary");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - default encoding is utf8",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.encoding, "utf8");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - initially not authenticated",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.authenticated, false);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - initially has no filesystem",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.fs, undefined);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - initially has no username",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.username, undefined);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - has options from server",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port, {
      debug: true,
      anonymous: true,
      fileFormat: "mlsx",
    });
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertExists(connection!.options);
    assertEquals(connection!.options.pasvUrl, TEST_HOST);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - has serve reference",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.serve, server);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - restByteCount is initially 0",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.restByteCount, 0);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - bufferSize is initially 0",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.bufferSize, 0);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
Deno.test({
  name: "Connection - setUsername sets username",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);

    // Setup a listener to resolve the username
    const usernamePromise = connection!.setUsername("testuser");
    const { resolveUsername } = await connection!.awaitUsername;
    resolveUsername.resolve();
    await usernamePromise;

    assertEquals(connection!.username, "testuser");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - close sets closed to true",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);
    assertEquals(connection!.closed, false);

    await connection!.close();

    assertEquals(connection!.closed, true);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - close with code sends reply",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Close with code - this sends a reply before closing
    const closePromise = connection!.close(221, "Goodbye");
    await delay(100);

    // Read the goodbye message
    const goodbye = await readResponse(conn);
    await closePromise;

    assertStringIncludes(goodbye, "221");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with array of messages",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Reply with multiple lines
    await connection!.reply(211, ["Line 1", "Line 2", "Line 3"]);
    await delay(100);

    const response = await readResponse(conn);
    assertStringIncludes(response, "211");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with replyLetter object",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Reply with replyLetter object
    await connection!.reply(200, { message: "Custom reply", encoding: "utf8" });
    await delay(100);

    const response = await readResponse(conn);
    assertStringIncludes(response, "200");
    assertStringIncludes(response, "Custom reply");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with useEmptyMessage option",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Reply with empty message option
    await connection!.reply({ code: 200, useEmptyMessage: true });
    await delay(100);

    // Should receive empty message (just newline)
    const response = await readResponse(conn);
    // The response should be minimal
    assertEquals(response.length < 10, true);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - blacklisted command returns 502",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port, {
      blacklist: ["DELE", "RMD"],
    });
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        // Start command processing
        connection.commands();
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Send blacklisted command
    await conn.write(new TextEncoder().encode("DELE somefile\r\n"));
    await delay(200);

    const response = await readResponse(conn);
    assertStringIncludes(response, "502");
    assertStringIncludes(response, "blacklisted");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - unknown command returns 502",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        // Start command processing
        connection.commands();
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Send unknown command
    await conn.write(new TextEncoder().encode("UNKNOWNCMD args\r\n"));
    await delay(200);

    const response = await readResponse(conn);
    assertStringIncludes(response, "502");
    assertStringIncludes(response, "not implemented");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - debug mode logs commands",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port, { debug: true });
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        // Start command processing
        connection.commands();
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Send NOOP command to exercise debug logging
    await conn.write(new TextEncoder().encode("NOOP\r\n"));
    await delay(200);

    const response = await readResponse(conn);
    assertStringIncludes(response, "200");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - setUsername rejects with error",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);

    // Setup a listener that rejects
    const usernamePromise = connection!.setUsername("baduser");
    const { resolveUsername } = await connection!.awaitUsername;
    resolveUsername.reject(new Error("User not allowed"));
    await usernamePromise;

    // Username should not be set on error
    assertEquals(connection!.username, undefined);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - login with valid data sets authenticated",
  async fn() {
    const port = getTestPort();
    const tempDir = await Deno.makeTempDir();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);

    // First set username
    const usernamePromise = connection!.setUsername("testuser");
    const { resolveUsername } = await connection!.awaitUsername;
    resolveUsername.resolve();
    await usernamePromise;

    // Then login with uid=0 which gives root access
    const loginPromise = connection!.login("password123");
    const { resolvePassword } = await connection!.awaitLogin;
    resolvePassword.resolve({ root: tempDir, uid: 0, gid: 0 });
    await loginPromise;

    assertEquals(connection!.authenticated, true);
    assertExists(connection!.fs);

    conn.close();
    server.close();
    await serverPromise;
    await Deno.remove(tempDir, { recursive: true });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - login reject sets error reply",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Login that will be rejected
    const loginPromise = connection!.login("wrongpassword");
    const { resolvePassword } = await connection!.awaitLogin;
    resolvePassword.reject(new Error("Invalid password"));
    await loginPromise;
    await delay(100);

    // Read the error reply
    const response = await readResponse(conn);
    assertStringIncludes(response, "430");

    assertEquals(connection!.authenticated, false);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - login with blacklist adds to options",
  async fn() {
    const port = getTestPort();
    const tempDir = await Deno.makeTempDir();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);

    // Login with blacklist (use uid=0 for root access)
    const loginPromise = connection!.login("password");
    const { resolvePassword } = await connection!.awaitLogin;
    resolvePassword.resolve({
      root: tempDir,
      uid: 0,
      gid: 0,
      blacklist: ["DELE", "RMD"],
    });
    await loginPromise;

    assertExists(connection!.options.blacklist);
    assertEquals(connection!.options.blacklist!.includes("DELE"), true);
    assertEquals(connection!.options.blacklist!.includes("RMD"), true);

    conn.close();
    server.close();
    await serverPromise;
    await Deno.remove(tempDir, { recursive: true });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - login with inaccessible root returns 550",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await readResponse(conn); // Read welcome message

    assertExists(connection);

    // Login with non-existent root
    const loginPromise = connection!.login("password");
    const { resolvePassword } = await connection!.awaitLogin;
    resolvePassword.resolve({
      root: "/nonexistent/path/that/does/not/exist",
      uid: 1000,
      gid: 1000,
    });
    await loginPromise;
    await delay(100);

    // Read the error reply
    const response = await readResponse(conn);
    assertStringIncludes(response, "550");

    assertEquals(connection!.authenticated, false);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - close with connector closes it",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    await delay(200);

    assertExists(connection);

    // Mock a connector
    let connectorClosed = false;
    connection!.connector = {
      close: () => {
        connectorClosed = true;
      },
    } as unknown as typeof connection.connector;

    await connection!.close();

    assertEquals(connectorClosed, true);
    assertEquals(connection!.closed, true);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ============================================================================
// Reply method edge cases
// ============================================================================

Deno.test({
  name: "Connection - reply with no letters creates default",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Call reply with empty array - should use default letter
    await connection!.reply(200, []);

    const response = await readResponse(conn);
    assertStringIncludes(response, "200");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with unknown code shows 'No information'",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Use an unknown code that doesn't exist in STATUS_TEXT
    await connection!.reply(999);

    const response = await readResponse(conn);
    assertStringIncludes(response, "999");
    assertStringIncludes(response, "No information");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with multiple letters uses dash separator",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Multiple letters should use "-" separator for all but last
    await connection!.reply(211, ["Line 1", "Line 2", "Line 3"]);

    const response = await readResponse(conn);
    assertStringIncludes(response, "211");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with eol option uses space separator",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // With eol option, should use space separator
    await connection!.reply({ code: 200, eol: "\r\n" }, "Test message");

    const response = await readResponse(conn);
    assertStringIncludes(response, "200");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with object letter with raw message",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Reply with object that has raw as true - tests raw branch
    // deno-lint-ignore no-explicit-any
    await connection!.reply(200, { message: "Raw message only", raw: "string value" } as any);

    const response = await readResponse(conn);
    assertStringIncludes(response, "Raw message only");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with custom writer in options",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Create a custom writer that captures writes
    const writtenData: Uint8Array[] = [];
    const customWriter = {
      write: (data: Uint8Array) => {
        writtenData.push(data);
        return Promise.resolve(data.length);
      },
    };

    // Reply with custom writer in options (use as unknown to bypass type check)
    // deno-lint-ignore no-explicit-any
    await connection!.reply({ code: 200, writer: customWriter as unknown as any }, "Custom writer test");

    // Check data was written to custom writer
    assertEquals(writtenData.length, 1);

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - reply with letter code overrides options code",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Letter with its own code
    await connection!.reply(200, { message: "Custom", code: 250 });

    const response = await readResponse(conn);
    // The letter code should be used
    assertStringIncludes(response, "250");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ============================================================================
// setUsername error handling
// ============================================================================

Deno.test({
  name: "Connection - setUsername handles rejection with error 430",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Start setUsername in background
    const setUsernamePromise = connection!.setUsername("testuser");

    // Wait for awaitUsername to be resolved with the resolveUsername deferred
    await delay(50);

    // Simulate server rejecting the username
    const usernameData = await connection!.awaitUsername;
    usernameData.resolveUsername.reject(new Error("Username not allowed"));

    // Wait for setUsername to complete
    await setUsernamePromise;

    // Should receive 430 error
    const response = await readResponse(conn);
    assertStringIncludes(response, "430");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Connection - setUsername handles rejection with non-Error",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Start setUsername in background
    const setUsernamePromise = connection!.setUsername("testuser");

    // Wait for awaitUsername to be resolved
    await delay(50);

    // Simulate server rejecting the username with a string error
    const usernameData = await connection!.awaitUsername;
    usernameData.resolveUsername.reject("String error message");

    // Wait for setUsername to complete
    await setUsernamePromise;

    // Should receive 430 error
    const response = await readResponse(conn);
    assertStringIncludes(response, "430");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ============================================================================
// reply edge cases - writer missing
// ============================================================================

Deno.test({
  name: "Connection - reply logs error when letter has no writer",
  async fn() {
    const port = getTestPort();
    const server = createTestServer(port);
    let connection: Connection | undefined;

    const serverPromise = (async () => {
      for await (const conn of server) {
        connection = conn;
        break;
      }
    })();

    await delay(50);

    const conn = await connectToServer(port);
    // Read welcome message first
    await readResponse(conn);
    await delay(100);

    assertExists(connection);

    // Create a letter with null writer explicitly
    // deno-lint-ignore no-explicit-any
    const letterWithNoWriter = { message: "Test", writer: null } as any;

    // This should hit the else branch in reply that logs error
    await connection!.reply(200, letterWithNoWriter);

    // The message won't be sent to conn, but no exception should occur

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ============================================================================
// TLS Server Tests
// ============================================================================

Deno.test({
  name: "Server - creates TLS listener with certificates",
  ignore: !(await certsExist()),
  async fn() {
    const port = getTestPort();
    const { cert, key, rootCA } = await loadTestCerts();

    const addr: ListenOptions = {
      hostname: TEST_HOST,
      port: port,
      cert: cert,
      key: key,
    };

    const serverOptions: FTPServerOptions = {
      debug: false,
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
    };

    const server = new Server(addr, serverOptions);

    // Server should be in secure mode
    assertEquals(server.secure, true);

    // Start accepting connections
    const serverPromise = (async () => {
      for await (const _connection of server) {
        break;
      }
    })();

    await delay(100);

    // Connect with TLS using root CA for self-signed cert
    const conn = await Deno.connectTls({
      hostname: TEST_HOST,
      port: port,
      caCerts: [rootCA],
    });

    // Read welcome message
    const response = await readResponse(conn);
    assertStringIncludes(response, "220");

    conn.close();
    server.close();
    await serverPromise;
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - TLS mode logs warning about testing status",
  ignore: !(await certsExist()),
  async fn() {
    const port = getTestPort();
    const { cert, key } = await loadTestCerts();

    const addr: ListenOptions = {
      hostname: TEST_HOST,
      port: port,
      cert: cert,
      key: key,
    };

    const serverOptions: FTPServerOptions = {
      debug: true, // Enable debug to see warning
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
    };

    // Just creating the server with TLS should work and log warning
    const server = new Server(addr, serverOptions);
    assertEquals(server.secure, true);

    // No need to accept connections, just close
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// ============================================================================
// webhookError Tests
// ============================================================================

Deno.test({
  name: "Server - webhookError sends POST to configured webhook",
  async fn() {
    const port = getTestPort();
    const webhookPort = getTestPort();

    // Create a simple HTTP server to receive webhook
    const webhookServer = Deno.listen({ port: webhookPort });
    let webhookReceived = false;
    let webhookBody = "";

    const webhookPromise = (async () => {
      const conn = await webhookServer.accept();
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n) {
        const request = new TextDecoder().decode(buffer.subarray(0, n));
        webhookReceived = true;
        // Extract body from HTTP request
        const bodyStart = request.indexOf("\r\n\r\n");
        if (bodyStart !== -1) {
          webhookBody = request.substring(bodyStart + 4);
        }
      }
      // Send minimal HTTP response
      const response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n";
      await conn.write(new TextEncoder().encode(response));
      conn.close();
    })();

    const serverOptions: FTPServerOptions = {
      debug: false,
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
      webhook: `http://${TEST_HOST}:${webhookPort}/webhook`,
    };

    const server = createTestServer(port, serverOptions);

    await delay(50);

    // Call webhookError with an Error
    await server.webhookError(new Error("Test error message"));

    // Wait for webhook to be received
    await webhookPromise;

    assertEquals(webhookReceived, true);
    assertStringIncludes(webhookBody, "Test error message");

    server.close();
    webhookServer.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - webhookError handles string arguments",
  async fn() {
    const port = getTestPort();
    const webhookPort = getTestPort();

    // Create a simple HTTP server to receive webhook
    const webhookServer = Deno.listen({ port: webhookPort });
    let webhookBody = "";

    const webhookPromise = (async () => {
      const conn = await webhookServer.accept();
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n) {
        const request = new TextDecoder().decode(buffer.subarray(0, n));
        const bodyStart = request.indexOf("\r\n\r\n");
        if (bodyStart !== -1) {
          webhookBody = request.substring(bodyStart + 4);
        }
      }
      const response = "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n";
      await conn.write(new TextEncoder().encode(response));
      conn.close();
    })();

    const serverOptions: FTPServerOptions = {
      debug: false,
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
      webhook: `http://${TEST_HOST}:${webhookPort}/webhook`,
    };

    const server = createTestServer(port, serverOptions);

    await delay(50);

    // Call webhookError with a string
    // deno-lint-ignore no-explicit-any
    await (server as any).webhookError("String error");

    await webhookPromise;

    assertStringIncludes(webhookBody, "String error");

    server.close();
    webhookServer.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - webhookError skipped when no webhook configured",
  async fn() {
    const port = getTestPort();

    // No webhook configured
    const serverOptions: FTPServerOptions = {
      debug: false,
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
      // No webhook
    };

    const server = createTestServer(port, serverOptions);

    // webhookError should just return without doing anything
    await server.webhookError(new Error("Test"));

    // No exception = success
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - webhookError handles fetch errors gracefully",
  async fn() {
    const port = getTestPort();

    // Point to non-existent server
    const serverOptions: FTPServerOptions = {
      debug: false,
      pasvUrl: TEST_HOST,
      pasvMin: 10000,
      pasvMax: 10100,
      webhook: `http://${TEST_HOST}:59999/nonexistent`,
    };

    const server = createTestServer(port, serverOptions);

    // webhookError should handle fetch failure gracefully
    await server.webhookError(new Error("Test error"));

    // No exception = success (error is logged but not thrown)
    server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
