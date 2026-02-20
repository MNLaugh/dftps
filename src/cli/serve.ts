import { Command, verify } from "../../deps.ts";

import Server from "../server/mod.ts";
import type { ListenOptions } from "../server/mod.ts";
import type { LoginResolvable, UsernameResolvable } from "../server/connection.ts";
import { type User, Users } from "../db/Users.ts";
import tomlJson from "../_utils/toml.ts";

import { upgradable } from "./mod.ts";

const configFile = "/etc/dftps.toml";
const config = tomlJson({ fileUrl: configFile });

// Helper to read cert/key files if paths are provided
async function loadTlsConfig(addr: Record<string, unknown>): Promise<ListenOptions> {
  const result: ListenOptions = {
    hostname: (addr.hostname as string) ?? "127.0.0.1",
    port: (addr.port as number) ?? 21,
  };

  // Load cert file if path provided
  if (addr.certFile && typeof addr.certFile === "string") {
    try {
      result.cert = await Deno.readTextFile(addr.certFile);
    } catch (e) {
      console.error(`Failed to read cert file: ${addr.certFile}`, e);
    }
  }

  // Load key file if path provided
  if (addr.keyFile && typeof addr.keyFile === "string") {
    try {
      result.key = await Deno.readTextFile(addr.keyFile);
    } catch (e) {
      console.error(`Failed to read key file: ${addr.keyFile}`, e);
    }
  }

  return result;
}

const serveCommands = new Command()
  .description("Run your Ftp serveur.")
  .option("-d, --debug [debug:boolean]", "Active debug mode", { default: null })
  .action(async ({ debug }) => {
    await upgradable();
    if ((debug === null && config.options.debug) || debug) console.log("Start serve with debug mode");

    // Load TLS config from files if specified
    const addr = await loadTlsConfig(config.addr);

    const serve = new Server(addr, config.options);
    for await (const connection of serve) {
      const { awaitUsername, awaitLogin } = connection;
      let user: User | undefined;
      awaitUsername.then(async ({ username, resolveUsername }: UsernameResolvable) => {
        const found = await Users.findByUsername(username);
        if (!found) return resolveUsername.reject("Incorrect username!");
        user = found;
        resolveUsername.resolve();
      });
      awaitLogin.then(async ({ password, resolvePassword }: LoginResolvable) => {
        if (!user) return resolvePassword.reject("User not found!");
        if (!await verify(user.password, password)) return resolvePassword.reject("Wrong password!");
        const { root, uid, gid } = user;
        resolvePassword.resolve({ root, uid, gid });
      });
    }
  });

export default serveCommands;
