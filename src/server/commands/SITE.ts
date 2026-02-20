import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Site {
  static directive = "SITE";
  static syntax = "{{cmd}} <subcommand> <mode> <path>";
  static description = "Sends site specific commands to remote server";
  static flags = {};

  description = Site.description;
  syntax = Site.syntax;
  directive = Site.directive;
  flags = Site.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.chmod) return this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return this.conn.reply(550, "Subcommand or/and arguments required");

      const [subcommand, mode, ...fileNameParts] = this.data.args.split(" ");
      const fileName = fileNameParts.join(" ");
      switch (subcommand) {
        case "CHMOD":
          await this.conn.fs.chmod(fileName, parseInt(mode, 8));
          break;
        default:
          return await this.conn.reply(500);
      }
      return await this.conn.reply(200);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 500;
      throw err;
    }
  }
}
