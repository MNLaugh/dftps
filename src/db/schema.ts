/**
 * Database schema types for DFtpS
 *
 * Defines the shape of data stored in the SQLite database.
 *
 * @module
 */

/**
 * User entity stored in the database
 *
 * Represents an FTP user with authentication credentials and permissions.
 */
export type User = {
  /** Unique user ID (auto-generated) */
  id: number;
  /** Username for FTP login */
  username: string;
  /** Hashed password (Argon2id) */
  password: string;
  /** Root directory path for this user */
  root: string;
  /** Unix user ID for permission checks */
  uid: number;
  /** Unix group ID for permission checks */
  gid: number;
  /** Creation timestamp */
  created_at?: string | null;
  /** Last update timestamp */
  updated_at?: string | null;
};

/**
 * Data required to create a new user
 *
 * Omits auto-generated fields like id and timestamps.
 */
export type NewUser = Omit<User, "id" | "created_at" | "updated_at">;
