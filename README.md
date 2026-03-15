# DFtpS - Deno Ftp Server

![logo](./assets/dftps_logo.png) [![deno doc](https://doc.deno.land/badge.svg)](https://mnlaugh.github.io/dftps-guide/)

DFtpS is an FTP server based on [ftp-srv](https://github.com/autovance/ftp-srv) with Deno.

**Version 2.0.0** - Fully modernized for Deno 2.x with:

- JSR-based imports (`@std/*`, `@cliffy/*`)
- Drizzle ORM (replacing deprecated denodb)
- Argon2 password hashing (replacing scrypt)
- Native Streams API (no more BufReader/BufWriter)
- Full TypeScript strict mode

Check our guide in [https://mnlaugh.github.io/dftps-guide/guide/](https://mnlaugh.github.io/dftps-guide/)

- [Install](#install)
- [Make your own](#make-your-own)
  - [Simple](#simple)
  - [With database](#with-database)
- [Log example](#log-example)
- [Deno Dependencies](#deno-dependencies)
- [List of FTP commands](#list-of-ftp-commands)
- [Contributing](#contributing)
- [References](#references)

## Usage

### Install

```sh
curl -fsSL https://deno.land/x/dftps/install.sh | sh
```

### Install Specific Version

```sh
curl -fsSL https://deno.land/x/dftps/install.sh | sh -s v1.0.0
```

---

## Make your own

### Simple

- First, we import the Server class and type for user authentication.

```ts
import { Server } from "jsr:@dftps/server";
import type { LoginResolvable, UsernameResolvable } from "jsr:@dftps/server";
```

- Then we just need to create an instance of Server with these options described below.

```ts
const serve = new Server({ port: 21, hostname: "127.0.0.1" });
```

- All we have to do is wait for a new connection and check the veracity of it using the authentication tools
  (awaitUsername, awaitLogin).

```ts
for await (const connection of serve) {
  const { awaitUsername, awaitLogin } = connection;
  /** waiting to receiving username from connection */
  awaitUsername.then(({ username, resolveUsername }: UsernameResolvable) => {
    if (username !== "my-username") return resolveUsername.reject("Incorrect username!");
    resolveUsername.resolve();
  });
  /** waiting to receiving password from connection and finalize the user authenticate */
  awaitLogin.then(({ password, resolvePassword }: LoginResolvable) => {
    if (password !== "my-password") return resolvePassword.reject("Wrong password!");
    resolvePassword.resolve({ root: "my-folder", uid: 1000, gid: 1000 });
  });
}
```

### With database

- Import the database utilities:

  ```ts
  import { Server, createDb } from "jsr:@dftps/server";
  import { verify } from "@node-rs/argon2";
  ```

- Database configuration (SQLite):
  - SQLite Options
    - filepath [string] (Required) - Path to the SQLite database file

```ts
/** Initialize SQLite database and pass it to the server */
const db = createDb({ connector: "SQLite", filepath: "./data/dftps.db" });

const serve = new Server(
  { port: 21, hostname: "127.0.0.1" },
  { database: db }  // Inject database into server
);

for await (const connection of serve) {
  const { awaitUsername, awaitLogin } = connection;
  let user: User | undefined;

  /** Waiting to receiving username from connection */
  awaitUsername.then(async ({ username, resolveUsername }: UsernameResolvable) => {
    /** Find user via server.users */
    user = serve.users?.findByUsername(username);
    if (!user) return resolveUsername.reject("Incorrect username!");
    resolveUsername.resolve();
  });

  /** Waiting to receiving password from connection and finalize the user authenticate */
  awaitLogin.then(async ({ password, resolvePassword }: LoginResolvable) => {
    if (!user) return resolvePassword.reject("User not found!");
    if (!await verify(user.password, password)) return resolvePassword.reject("Wrong password!");
    const { root, uid, gid } = user;
    resolvePassword.resolve({ root, uid, gid });
  });
}
```

> **Note:** You can also use the static `Users` class directly (legacy approach), but injecting the database via `{ database: db }` is recommended for multi-instance scenarios.
```

## Log example

![output_example](./assets/example_log.gif)

---

## Deno Dependencies

All dependencies are now available via [JSR](https://jsr.io) with modern Deno 2.x compatibility:

- ### Standard Library (JSR)

  - [@std/async](https://jsr.io/@std/async) - Async utilities
  - [@std/path](https://jsr.io/@std/path) - Path manipulation
  - [@std/fs](https://jsr.io/@std/fs) - File system operations
  - [@std/datetime](https://jsr.io/@std/datetime) - Date/time formatting
  - [@std/assert](https://jsr.io/@std/assert) - Assertions

- ### CLI Framework

  - [@cliffy/command](https://jsr.io/@cliffy/command) - CLI commands
  - [@cliffy/table](https://jsr.io/@cliffy/table) - Table formatting
  - [@cliffy/ansi](https://jsr.io/@cliffy/ansi) - ANSI colors

- ### Database

  - [@db/sqlite](https://jsr.io/@db/sqlite) - Native SQLite for Deno

- ### Security

  - [@node-rs/argon2](https://www.npmjs.com/package/@node-rs/argon2) - Password hashing

## [List of FTP commands](https://en.wikipedia.org/wiki/List_of_FTP_commands)

See [COMMANDS.md](COMMANDS.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## References

- [Ftp](https://cr.yp.to/ftp.html)
- [Ftp commands](https://en.wikipedia.org/wiki/List_of_FTP_commands)
- [Ftp reply codes](https://en.wikipedia.org/wiki/List_of_FTP_server_return_codes)
