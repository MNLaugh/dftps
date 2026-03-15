/**
 * User repository for DFtpS
 *
 * Instanciable repository class that receives a Database instance,
 * allowing multiple database instances to be used simultaneously.
 *
 * @module
 */

import type { Database } from "@db/sqlite";
import type { NewUser, User } from "./schema.ts";

/**
 * User repository - provides methods for user CRUD operations
 *
 * Unlike the static Users class, this class is instanciable and receives
 * a Database instance in its constructor, allowing for multiple database
 * instances to be used (e.g., multi-tenant scenarios, testing).
 *
 * @example
 * ```ts
 * import { createDb, UserRepository } from "@dftp/server";
 *
 * const db = createDb({ connector: "SQLite", filepath: "./users.db" });
 * const users = new UserRepository(db);
 *
 * const user = users.findByUsername("admin");
 * ```
 */
export class UserRepository {
  #db: Database;

  /**
   * Create a new UserRepository instance
   *
   * @param db - The SQLite database instance to use
   */
  constructor(db: Database) {
    this.#db = db;
  }

  /**
   * Get the underlying database instance
   */
  get db(): Database {
    return this.#db;
  }

  /**
   * Find a user by username
   *
   * @param username - The username to search for
   * @returns The user if found, undefined otherwise
   */
  findByUsername(username: string): User | undefined {
    const stmt = this.#db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    return stmt.get(username) as User | undefined;
  }

  /**
   * Find a user by ID
   *
   * @param id - The user ID to search for
   * @returns The user if found, undefined otherwise
   */
  findById(id: number): User | undefined {
    const stmt = this.#db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    return stmt.get(id) as User | undefined;
  }

  /**
   * Get all users
   *
   * @returns Array of all users in the database
   */
  findAll(): User[] {
    const stmt = this.#db.prepare("SELECT * FROM users");
    return stmt.all() as User[];
  }

  /**
   * Create a new user
   *
   * @param user - The user data to insert
   * @returns The created user with generated ID
   */
  create(user: NewUser): User {
    const stmt = this.#db.prepare(
      "INSERT INTO users (username, password, root, uid, gid) VALUES (?, ?, ?, ?, ?) RETURNING *",
    );
    return stmt.get(user.username, user.password, user.root, user.uid, user.gid) as User;
  }

  /**
   * Update a user by ID
   *
   * @param id - The user ID to update
   * @param data - Partial user data to update
   * @returns The updated user if found, undefined otherwise
   */
  update(id: number, data: Partial<NewUser>): User | undefined {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.username !== undefined) {
      fields.push("username = ?");
      values.push(data.username);
    }
    if (data.password !== undefined) {
      fields.push("password = ?");
      values.push(data.password);
    }
    if (data.root !== undefined) {
      fields.push("root = ?");
      values.push(data.root);
    }
    if (data.uid !== undefined) {
      fields.push("uid = ?");
      values.push(data.uid);
    }
    if (data.gid !== undefined) {
      fields.push("gid = ?");
      values.push(data.gid);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = this.#db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ? RETURNING *`);
    return stmt.get(...values) as User | undefined;
  }

  /**
   * Delete a user by ID
   *
   * @param id - The user ID to delete
   * @returns true if the user was deleted, false otherwise
   */
  delete(id: number): boolean {
    const stmt = this.#db.prepare("DELETE FROM users WHERE id = ?");
    return stmt.run(id) > 0;
  }

  /**
   * Legacy compatibility: where query (simplified)
   *
   * @param field - The field to search by
   * @param value - The value to match
   * @returns An object with a get() method that returns matching users
   */
  where(field: keyof User, value: string | number): { get: () => User[] } {
    return {
      get: (): User[] => {
        if (field === "username") {
          const user = this.findByUsername(value as string);
          return user ? [user] : [];
        }
        if (field === "id") {
          const user = this.findById(value as number);
          return user ? [user] : [];
        }
        return [];
      },
    };
  }
}

export default UserRepository;
