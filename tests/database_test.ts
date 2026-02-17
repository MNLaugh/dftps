/**
 * Database module tests
 */
import { assertEquals, assertExists } from "@std/assert";
import { createDb, getDb } from "../src/db/database.ts";

const TEST_DB_PATH = "./test_dftps.db";

Deno.test({
  name: "Database - createDb creates SQLite database",
  async fn() {
    // Clean up any existing test db
    try {
      await Deno.remove(TEST_DB_PATH);
    } catch { /* ignore */ }

    const db = createDb({ connector: "SQLite", filepath: TEST_DB_PATH });

    assertExists(db);

    // Verify users table was created
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    assertEquals((result as { name: string })?.name, "users");

    db.close();

    // Cleanup
    await Deno.remove(TEST_DB_PATH);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Database - getDb returns initialized database",
  async fn() {
    try {
      await Deno.remove(TEST_DB_PATH);
    } catch { /* ignore */ }

    createDb({ connector: "SQLite", filepath: TEST_DB_PATH });

    const db = getDb();
    assertExists(db);

    db.close();
    await Deno.remove(TEST_DB_PATH);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Database - throws on invalid connector",
  fn() {
    let threw = false;
    try {
      // @ts-ignore - Testing invalid input
      createDb({ connector: "PostgreSQL", filepath: TEST_DB_PATH });
    } catch (e) {
      threw = true;
      assertEquals((e as Error).message, "Only SQLite is supported in this version.");
    }
    assertEquals(threw, true);
  },
});
