/**
 * @module
 *
 * DFtpS - A modern FTP server for Deno
 *
 * A lightweight, secure FTP server written in TypeScript for Deno runtime.
 * Features TLS/SSL support, Argon2id password hashing, SQLite user database,
 * and full RFC 959/2228/2389/2428/3659 compliance.
 *
 * @example Basic FTP server
 * ```ts
 * import { Server } from "@dftp/server";
 *
 * const server = new Server({ port: 21 });
 *
 * console.log("FTP server listening on port 21");
 *
 * for await (const connection of server) {
 *   connection.on("login", async ({ username, password }, resolve) => {
 *     if (username === "admin" && password === "secret") {
 *       resolve({ root: "/srv/ftp", uid: 1000, gid: 1000 });
 *     }
 *   });
 * }
 * ```
 *
 * @example With TLS support
 * ```ts
 * import { Server } from "@dftp/server";
 *
 * const server = new Server({
 *   port: 21,
 *   cert: Deno.readTextFileSync("cert.pem"),
 *   key: Deno.readTextFileSync("key.pem"),
 * });
 * ```
 *
 * @example With SQLite user database
 * ```ts
 * import { Server, createDb, Users } from "@dftp/server";
 * import { hash, verify } from "@node-rs/argon2";
 *
 * // Initialize database
 * createDb({ path: "./users.db" });
 *
 * // Create a user
 * const hashedPassword = await hash("secret");
 * Users.create({
 *   username: "admin",
 *   password: hashedPassword,
 *   root: "/srv/ftp",
 *   uid: 1000,
 *   gid: 1000,
 * });
 *
 * const server = new Server({ port: 21 });
 *
 * for await (const connection of server) {
 *   connection.on("login", async ({ username, password }, resolve, reject) => {
 *     const user = Users.findByUsername(username);
 *     if (user && await verify(user.password, password)) {
 *       resolve({ root: user.root, uid: user.uid, gid: user.gid });
 *     } else {
 *       reject();
 *     }
 *   });
 * }
 * ```
 *
 * @example With database injection (recommended for multi-instance scenarios)
 * ```ts
 * import { Server, createDb } from "@dftp/server";
 * import { hash, verify } from "@node-rs/argon2";
 *
 * // Create database and pass it to the server
 * const db = createDb({ connector: "SQLite", filepath: "./users.db" });
 * const server = new Server({ port: 21 }, { database: db });
 *
 * // Access users via server.users
 * const hashedPassword = await hash("secret");
 * server.users?.create({
 *   username: "admin",
 *   password: hashedPassword,
 *   root: "/srv/ftp",
 *   uid: 1000,
 *   gid: 1000,
 * });
 *
 * for await (const connection of server) {
 *   connection.on("login", async ({ username, password }, resolve, reject) => {
 *     const user = server.users?.findByUsername(username);
 *     if (user && await verify(user.password, password)) {
 *       resolve({ root: user.root, uid: user.uid, gid: user.gid });
 *     } else {
 *       reject();
 *     }
 *   });
 * }
 * ```
 */

/**
 * FTP Server class and configuration types
 * @see {@link Server} - Main FTP server class
 * @see {@link ListenOptions} - TCP listener options
 * @see {@link FTPServerOptions} - Server configuration options
 */
export * from "./src/server/mod.ts";

/**
 * FTP Connection handling
 * @see {@link Connection} - Represents a single FTP client connection
 */
export * from "./src/server/connection.ts";

/**
 * Virtual filesystem for FTP operations
 * @see {@link FileSystem} - Handles file operations for FTP commands
 */
export * from "./src/server/filesystem.ts";

/**
 * FTP status codes and messages (RFC 959)
 * @see {@link Status} - FTP response status codes enum
 * @see {@link STATUS_TEXT} - Human-readable status messages
 */
export * from "./src/server/ftp_status.ts";

/**
 * Database initialization
 * @see {@link createDb} - Initialize SQLite database for user storage
 */
export { createDb, type DatabaseConfig } from "./src/db/mod.ts";

/**
 * User management
 * @see {@link Users} - Static user repository (legacy, uses global DB)
 * @see {@link UserRepository} - Instanciable user repository (recommended)
 * @see {@link User} - User entity type
 * @see {@link NewUser} - Type for creating new users
 */
export { type NewUser, type User, Users } from "./src/db/Users.ts";
export { UserRepository } from "./src/db/UserRepository.ts";
