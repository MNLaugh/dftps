/**
 * Server database injection tests
 *
 * Tests for server.users and database injection functionality
 */
import { assertEquals, assertExists } from "@std/assert";
import { delay } from "@std/async";
import Server from "../src/server/mod.ts";
import type { FTPServerOptions, ListenOptions } from "../src/server/mod.ts";
import { createDb } from "../src/db/database.ts";
import { hash } from "../deps.ts";

const TEST_HOST = "127.0.0.1";
let testPort = 3121;

// Counter for unique test DBs
let testDbCounter = 0;

function getTestPort(): number {
  return testPort++;
}

function getTestDbPath(): string {
  return `./test_serverdb_${Date.now()}_${testDbCounter++}.db`;
}

// Cleanup helper
async function cleanupTestDb(path: string, db: ReturnType<typeof createDb>) {
  try {
    db.close();
  } catch { /* ignore */ }
  try {
    await Deno.remove(path);
  } catch { /* ignore */ }
}

Deno.test({
  name: "Server - users property is undefined without database",
  async fn() {
    const port = getTestPort();
    const addr: ListenOptions = { hostname: TEST_HOST, port };
    const server = new Server(addr);

    assertEquals(server.users, undefined);
    assertEquals(server.database, undefined);

    await server.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - users property is available with database injection",
  async fn() {
    const port = getTestPort();
    const path = getTestDbPath();
    const db = createDb({ connector: "SQLite", filepath: path });

    const addr: ListenOptions = { hostname: TEST_HOST, port };
    const options: FTPServerOptions = { database: db };
    const server = new Server(addr, options);

    assertExists(server.users);
    assertExists(server.database);

    await server.close();
    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - can create and find users via server.users",
  async fn() {
    const port = getTestPort();
    const path = getTestDbPath();
    const db = createDb({ connector: "SQLite", filepath: path });

    const addr: ListenOptions = { hostname: TEST_HOST, port };
    const server = new Server(addr, { database: db });

    // Create user via server.users
    const created = server.users!.create({
      username: "serveruser",
      password: await hash("secret"),
      root: "/home/serveruser",
      uid: 1000,
      gid: 1000,
    });

    assertExists(created);
    assertEquals(created.username, "serveruser");

    // Find user via server.users
    const found = server.users!.findByUsername("serveruser");
    assertExists(found);
    assertEquals(found.id, created.id);

    await server.close();
    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server - multiple servers can use different databases",
  async fn() {
    const port1 = getTestPort();
    const port2 = getTestPort();
    const path1 = getTestDbPath();
    const path2 = getTestDbPath();
    const db1 = createDb({ connector: "SQLite", filepath: path1 });
    const db2 = createDb({ connector: "SQLite", filepath: path2 });

    const server1 = new Server({ hostname: TEST_HOST, port: port1 }, { database: db1 });
    const server2 = new Server({ hostname: TEST_HOST, port: port2 }, { database: db2 });

    // Create user in server1 only
    server1.users!.create({
      username: "server1user",
      password: await hash("pass"),
      root: "/s1",
      uid: 1000,
      gid: 1000,
    });

    // Create different user in server2 only
    server2.users!.create({
      username: "server2user",
      password: await hash("pass"),
      root: "/s2",
      uid: 2000,
      gid: 2000,
    });

    // Verify isolation
    assertExists(server1.users!.findByUsername("server1user"));
    assertEquals(server1.users!.findByUsername("server2user"), undefined);
    assertExists(server2.users!.findByUsername("server2user"));
    assertEquals(server2.users!.findByUsername("server1user"), undefined);

    await server1.close();
    await server2.close();
    await cleanupTestDb(path1, db1);
    await cleanupTestDb(path2, db2);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
