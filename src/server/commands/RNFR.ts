import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Rnfr {
  static directive = "RNFR";
  static syntax = "{{cmd}} <name>";
  static description = "Rename from";
  static flags = {};

  description = Rnfr.description;
  syntax = Rnfr.syntax;
  directive = Rnfr.directive;
  flags = Rnfr.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
      await this.conn.fs.get(this.data.args);
      this.conn.fs.renameFrom = this.data.args;
      return await this.conn.reply(350);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
