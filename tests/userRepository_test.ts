/**
 * UserRepository tests
 *
 * Tests for the instanciable UserRepository class
 */
import { assertEquals, assertExists } from "@std/assert";
import { createDb } from "../src/db/database.ts";
import { UserRepository } from "../src/db/UserRepository.ts";
import type { NewUser } from "../src/db/schema.ts";
import { hash } from "../deps.ts";

// Counter for unique test DBs
let testDbCounter = 0;

function getTestDbPath(): string {
  return `./test_userrepo_${Date.now()}_${testDbCounter++}.db`;
}

// Helper to setup test database with UserRepository
function setupTestDb(): { repo: UserRepository; path: string; db: ReturnType<typeof createDb> } {
  const path = getTestDbPath();
  const db = createDb({ connector: "SQLite", filepath: path });
  const repo = new UserRepository(db);
  return { repo, path, db };
}

// Helper to cleanup
async function cleanupTestDb(path: string, db: ReturnType<typeof createDb>) {
  try {
    db.close();
  } catch { /* ignore */ }
  try {
    await Deno.remove(path);
  } catch { /* ignore */ }
}

Deno.test({
  name: "UserRepository - create user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    const newUser: NewUser = {
      username: "testuser",
      password: await hash("password123"),
      root: "/home/testuser",
      uid: 1000,
      gid: 1000,
    };

    const user = repo.create(newUser);

    assertExists(user);
    assertExists(user.id);
    assertEquals(user.username, "testuser");
    assertEquals(user.root, "/home/testuser");
    assertEquals(user.uid, 1000);
    assertEquals(user.gid, 1000);

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - findByUsername returns user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    repo.create({
      username: "findme",
      password: await hash("secret"),
      root: "/data",
      uid: 1001,
      gid: 1001,
    });

    const found = repo.findByUsername("findme");

    assertExists(found);
    assertEquals(found.username, "findme");
    assertEquals(found.root, "/data");

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - findByUsername returns undefined for non-existent user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    const found = repo.findByUsername("nobody");

    assertEquals(found, undefined);

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - findById returns user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    const created = repo.create({
      username: "byid",
      password: await hash("pass"),
      root: "/opt",
      uid: 1002,
      gid: 1002,
    });

    const found = repo.findById(created.id);

    assertExists(found);
    assertEquals(found.id, created.id);
    assertEquals(found.username, "byid");

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - findAll returns all users",
  async fn() {
    const { repo, path, db } = setupTestDb();

    repo.create({
      username: "user1",
      password: await hash("pass1"),
      root: "/home/user1",
      uid: 1000,
      gid: 1000,
    });

    repo.create({
      username: "user2",
      password: await hash("pass2"),
      root: "/home/user2",
      uid: 1001,
      gid: 1001,
    });

    const users = repo.findAll();

    assertEquals(users.length, 2);
    assertEquals(users[0].username, "user1");
    assertEquals(users[1].username, "user2");

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - update user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    const created = repo.create({
      username: "updateme",
      password: await hash("old"),
      root: "/old",
      uid: 1000,
      gid: 1000,
    });

    const updated = repo.update(created.id, {
      root: "/new",
      uid: 2000,
    });

    assertExists(updated);
    assertEquals(updated.root, "/new");
    assertEquals(updated.uid, 2000);
    assertEquals(updated.username, "updateme"); // unchanged

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - delete user",
  async fn() {
    const { repo, path, db } = setupTestDb();

    const created = repo.create({
      username: "deleteme",
      password: await hash("bye"),
      root: "/tmp",
      uid: 1000,
      gid: 1000,
    });

    const deleted = repo.delete(created.id);
    assertEquals(deleted, true);

    const found = repo.findById(created.id);
    assertEquals(found, undefined);

    await cleanupTestDb(path, db);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "UserRepository - multiple instances with different databases",
  async fn() {
    // Setup two separate databases
    const path1 = getTestDbPath();
    const path2 = getTestDbPath();
    const db1 = createDb({ connector: "SQLite", filepath: path1 });
    const db2 = createDb({ connector: "SQLite", filepath: path2 });
    const repo1 = new UserRepository(db1);
    const repo2 = new UserRepository(db2);

    // Create user in repo1 only
    repo1.create({
      username: "onlyinrepo1",
      password: await hash("secret"),
      root: "/repo1",
      uid: 1000,
      gid: 1000,
    });

    // Create different user in repo2 only
    repo2.create({
      username: "onlyinrepo2",
      password: await hash("secret"),
      root: "/repo2",
      uid: 2000,
      gid: 2000,
    });

    // Verify isolation
    const foundInRepo1 = repo1.findByUsername("onlyinrepo1");
    const notInRepo1 = repo1.findByUsername("onlyinrepo2");
    const foundInRepo2 = repo2.findByUsername("onlyinrepo2");
    const notInRepo2 = repo2.findByUsername("onlyinrepo1");

    assertExists(foundInRepo1);
    assertEquals(notInRepo1, undefined);
    assertExists(foundInRepo2);
    assertEquals(notInRepo2, undefined);

    // Cleanup
    try {
      db1.close();
    } catch { /* ignore */ }
    try {
      db2.close();
    } catch { /* ignore */ }
    try {
      await Deno.remove(path1);
    } catch { /* ignore */ }
    try {
      await Deno.remove(path2);
    } catch { /* ignore */ }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
