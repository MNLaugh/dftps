/**
 * User repository for DFtpS
 *
 * This module provides functions to interact with the users table
 * using native SQLite via @db/sqlite.
 */

import { getDb } from "./database.ts";
import { type NewUser, type User } from "./schema.ts";

/**
 * Users repository class - provides static methods for user CRUD operations
 */
export class Users {
  private static get db() {
    return getDb();
  }

  /**
   * Find a user by username
   */
  static findByUsername(username: string): User | undefined {
    const stmt = this.db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    return stmt.get(username) as User | undefined;
  }

  /**
   * Find a user by ID
   */
  static findById(id: number): User | undefined {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    return stmt.get(id) as User | undefined;
  }

  /**
   * Get all users
   */
  static findAll(): User[] {
    const stmt = this.db.prepare("SELECT * FROM users");
    return stmt.all() as User[];
  }

  /**
   * Create a new user
   */
  static create(user: NewUser): User {
    const stmt = this.db.prepare(
      "INSERT INTO users (username, password, root, uid, gid) VALUES (?, ?, ?, ?, ?) RETURNING *",
    );
    return stmt.get(user.username, user.password, user.root, user.uid, user.gid) as User;
  }

  /**
   * Update a user by ID
   */
  static update(id: number, data: Partial<NewUser>): User | undefined {
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
    const stmt = this.db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ? RETURNING *`);
    return stmt.get(...values) as User | undefined;
  }

  /**
   * Delete a user by ID
   */
  static delete(id: number): boolean {
    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    return stmt.run(id) > 0;
  }

  /**
   * Legacy compatibility: where query (simplified)
   */
  static where(field: keyof User, value: string | number): { get: () => User[] } {
    return {
      get: (): User[] => {
        if (field === "username") {
          const user = Users.findByUsername(value as string);
          return user ? [user] : [];
        }
        if (field === "id") {
          const user = Users.findById(value as number);
          return user ? [user] : [];
        }
        return [];
      },
    };
  }
}

export default Users;
export type { NewUser, User };
