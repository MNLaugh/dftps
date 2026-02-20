/**
 * Users repository tests
 */
import { assertEquals, assertExists } from "@std/assert";
import { createDb, getDb } from "../src/db/database.ts";
import { type NewUser, Users } from "../src/db/Users.ts";
import { hash, verify } from "../deps.ts";

// Counter for unique test DBs
let testDbCounter = 0;

function getTestDbPath(): string {
  return `./test_users_${Date.now()}_${testDbCounter++}.db`;
}

// Helper to setup test database
function setupTestDb(): { db: ReturnType<typeof createDb>; path: string } {
  const path = getTestDbPath();
  const db = createDb({ connector: "SQLite", filepath: path });
  return { db, path };
}

// Helper to cleanup
async function cleanupTestDb(path: string) {
  try {
    getDb().close();
  } catch { /* ignore */ }
  try {
    await Deno.remove(path);
  } catch { /* ignore */ }
}

Deno.test({
  name: "Users - create user",
  async fn() {
    const { path } = setupTestDb();

    const newUser: NewUser = {
      username: "testuser",
      password: await hash("password123"),
      root: "/home/testuser",
      uid: 1000,
      gid: 1000,
    };

    const user = Users.create(newUser);

    assertExists(user);
    assertExists(user.id);
    assertEquals(user.username, "testuser");
    assertEquals(user.root, "/home/testuser");
    assertEquals(user.uid, 1000);
    assertEquals(user.gid, 1000);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - findByUsername returns user",
  async fn() {
    const { path } = setupTestDb();

    Users.create({
      username: "findme",
      password: await hash("secret"),
      root: "/data",
      uid: 1001,
      gid: 1001,
    });

    const found = Users.findByUsername("findme");

    assertExists(found);
    assertEquals(found.username, "findme");
    assertEquals(found.root, "/data");

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - findByUsername returns undefined for non-existent user",
  async fn() {
    const { path } = setupTestDb();

    const found = Users.findByUsername("nobody");

    assertEquals(found, undefined);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - findById returns user",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "byid",
      password: await hash("pass"),
      root: "/opt",
      uid: 1002,
      gid: 1002,
    });

    const found = Users.findById(created.id);

    assertExists(found);
    assertEquals(found.id, created.id);
    assertEquals(found.username, "byid");

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - findAll returns all users",
  async fn() {
    const { path } = setupTestDb();

    Users.create({
      username: "user1",
      password: await hash("pass1"),
      root: "/home/user1",
      uid: 1000,
      gid: 1000,
    });

    Users.create({
      username: "user2",
      password: await hash("pass2"),
      root: "/home/user2",
      uid: 1001,
      gid: 1001,
    });

    const users = Users.findAll();

    assertEquals(users.length, 2);
    assertEquals(users[0].username, "user1");
    assertEquals(users[1].username, "user2");

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - update user",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "updateme",
      password: await hash("oldpass"),
      root: "/old",
      uid: 1000,
      gid: 1000,
    });

    const updated = Users.update(created.id, {
      root: "/new",
      uid: 2000,
    });

    assertExists(updated);
    assertEquals(updated.root, "/new");
    assertEquals(updated.uid, 2000);
    assertEquals(updated.username, "updateme"); // unchanged

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - delete user",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "deleteme",
      password: await hash("pass"),
      root: "/tmp",
      uid: 1000,
      gid: 1000,
    });

    const deleted = Users.delete(created.id);
    assertEquals(deleted, true);

    const found = Users.findById(created.id);
    assertEquals(found, undefined);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - password verification with argon2",
  async fn() {
    const { path } = setupTestDb();

    const password = "MySecurePassword123!";
    const hashedPassword = await hash(password);

    Users.create({
      username: "authtest",
      password: hashedPassword,
      root: "/secure",
      uid: 1000,
      gid: 1000,
    });

    const user = Users.findByUsername("authtest");
    assertExists(user);

    // Verify correct password - verify(hash, password)
    const validAuth = await verify(user.password, password);
    assertEquals(validAuth, true);

    // Verify wrong password
    const invalidAuth = await verify(user.password, "wrongpassword");
    assertEquals(invalidAuth, false);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - legacy where() compatibility",
  async fn() {
    const { path } = setupTestDb();

    Users.create({
      username: "legacy",
      password: await hash("pass"),
      root: "/legacy",
      uid: 1000,
      gid: 1000,
    });

    const results = Users.where("username", "legacy").get();

    assertEquals(results.length, 1);
    assertEquals(results[0].username, "legacy");

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - where by id",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "whereid",
      password: await hash("pass"),
      root: "/whereid",
      uid: 1000,
      gid: 1000,
    });

    const results = Users.where("id", created.id).get();

    assertEquals(results.length, 1);
    assertEquals(results[0].id, created.id);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - where with unknown field returns empty",
  async fn() {
    const { path } = setupTestDb();

    Users.create({
      username: "unknown",
      password: await hash("pass"),
      root: "/unknown",
      uid: 1000,
      gid: 1000,
    });

    // Using a field other than "username" or "id"
    const results = Users.where("root" as keyof typeof Users.prototype, "/unknown").get();

    assertEquals(results, []);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - update with empty data returns existing user",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "emptyupdate",
      password: await hash("pass"),
      root: "/emptyupdate",
      uid: 1000,
      gid: 1000,
    });

    // Update with no fields
    const updated = Users.update(created.id, {});

    assertEquals(updated?.username, "emptyupdate");

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Users - update individual fields",
  async fn() {
    const { path } = setupTestDb();

    const created = Users.create({
      username: "individual",
      password: await hash("pass"),
      root: "/individual",
      uid: 1000,
      gid: 1000,
    });

    // Update username only
    Users.update(created.id, { username: "newname" });

    // Update password only
    const newPass = await hash("newpass");
    Users.update(created.id, { password: newPass });

    // Update gid only
    const updated = Users.update(created.id, { gid: 2000 });

    assertEquals(updated?.username, "newname");
    assertEquals(updated?.gid, 2000);

    await cleanupTestDb(path);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
