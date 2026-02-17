/**
 * FTP Server connection tests
 */
import { assertExists, assertStringIncludes } from "@std/assert";
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
