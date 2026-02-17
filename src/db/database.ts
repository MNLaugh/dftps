/**
 * Database module for DFtpS using native Deno SQLite
 *
 * Uses @db/sqlite for native SQLite support in Deno.
 */

import { Database } from "@db/sqlite";
import * as schema from "./schema.ts";

export type DatabaseConnector = "SQLite";

export interface SQLiteConfig {
  connector: "SQLite";
  filepath: string;
}

export type DatabaseConfig = SQLiteConfig;

let db: Database;

export function createDb(config: DatabaseConfig): Database {
  if (config.connector !== "SQLite") {
    throw new Error("Only SQLite is supported in this version.");
  }

  db = new Database(config.filepath);

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      root TEXT NOT NULL,
      uid INTEGER NOT NULL DEFAULT 1000,
      gid INTEGER NOT NULL DEFAULT 1000,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call createDb() first.");
  }
  return db;
}

export { schema };
export type { Database };
export default createDb;
