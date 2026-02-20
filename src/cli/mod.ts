import { colors, Command } from "../../deps.ts";

import tomlJson from "../_utils/toml.ts";
import Logger from "../_utils/logger.ts";
import { createDb } from "../db/mod.ts";
import type { Configs } from "../db/mod.ts";

import { deferUsers, usersCommands } from "./users.ts";
import serveCommands from "./serve.ts";
import { latest, upgradeCommands } from "./upgrade.ts";

export const version = "2.0.0";
const logger = new Logger({ prefix: `[DFtpS] => ` });
const defaultConfigFile = "./default.config.toml";
const configFile = "/etc/dftps.toml";
async function ConfigFileChecker(): Promise<void> {
  try {
    await Deno.stat(configFile);
  } catch (_) {
    try {
      await Deno.copyFile(defaultConfigFile, configFile);
      logger.warn(`Your configuration file as been created in "${configFile}", You now need to edit it!`);
      Deno.exit(0);
    } catch (e) {
      logger.error("Error on creating config file", e, "You have to probably run me with sudo!");
      Deno.exit(0);
    }
  }
}

export async function upgradable() {
  const release = await latest();
  if (release.tag_name.replace("v", "") !== version) {
    return console.log(colors.bold.magenta('A new version of dftps is available made "dftps upgrade" to install it.'));
  }
}

await ConfigFileChecker();
const config = tomlJson({ fileUrl: configFile });

if (!config || !config.database) throw new Error("Database configuration not found in " + configFile);

await createDb(config.database as Configs);

const cmd = await new Command()
  .name("DFtpS")
  .version(version)
  .description("DFtpS configuration command line interface.")
  .command("user", usersCommands)
  .command("serve", serveCommands)
  .command("upgrade", upgradeCommands);

cmd.parse(Deno.args);

deferUsers
  .then((message: string | void | null) => {
    if (message) logger.info(message);
    Deno.exit(0);
  })
  .catch((error: string) => {
    logger.warn(error);
    Deno.exit(1);
  });
