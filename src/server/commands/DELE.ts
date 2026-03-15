import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Dele {
  static directive = "DELE";
  static syntax = "{{cmd}} <path>";
  static description = "Delete file";
  static flags = {};

  description = Dele.description;
  syntax = Dele.syntax;
  directive = Dele.directive;
  flags = Dele.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.delete) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "target not found!");
      await this.conn.fs.delete(this.data.args);
      return this.conn.reply(250);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
