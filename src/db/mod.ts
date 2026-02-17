/**
 * Database module for DFtpS - Using native SQLite
 */

export { createDb, type Database, type DatabaseConfig, getDb } from "./database.ts";
export { type NewUser, type User } from "./schema.ts";
export * as schema from "./schema.ts";

// Re-export createDb as default for backwards compatibility
export { createDb as default } from "./database.ts";

// Legacy type exports for API compatibility
export type Configs = import("./database.ts").DatabaseConfig;
