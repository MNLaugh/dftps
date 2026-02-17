import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Rnto {
  static directive = "RNTO";
  static syntax = "{{cmd}} <name>";
  static description = "Rename to";
  static flags = {};

  description = Rnto.description;
  syntax = Rnto.syntax;
  directive = Rnto.directive;
  flags = Rnto.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.rename) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
      await this.conn.fs.rename(this.conn.fs.renameFrom, this.data.args);
      return await this.conn.reply(250);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
