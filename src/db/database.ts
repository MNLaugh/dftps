/**
 * Database module for DFtpS using native Deno SQLite
 *
 * Uses @db/sqlite for native SQLite support in Deno.
 *
 * @module
 */

import { Database } from "@db/sqlite";
import * as schema from "./schema.ts";

/** Supported database connector types */
export type DatabaseConnector = "SQLite";

/** SQLite database configuration */
export interface SQLiteConfig {
  /** Database connector type */
  connector: "SQLite";
  /** Path to the SQLite database file */
  filepath: string;
}

/** Database configuration options */
export type DatabaseConfig = SQLiteConfig;

let db: Database;

/**
 * Initialize and create the SQLite database
 *
 * Creates the database file and initializes the users table schema.
 * Must be called before using any database operations.
 *
 * @param config - Database configuration with connector type and filepath
 * @returns The initialized Database instance
 *
 * @example
 * ```ts
 * const db = createDb({ connector: "SQLite", filepath: "./users.db" });
 * ```
 */
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

/**
 * Get the current database instance
 *
 * @returns The Database instance
 * @throws If createDb() has not been called first
 */
export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call createDb() first.");
  }
  return db;
}

export { schema };
export type { Database };
export default createDb;
