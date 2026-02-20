import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Size {
  static directive = "SIZE";
  static syntax = "{{cmd}} <path>";
  static description = "Return the size of a file";
  static flags = {
    feat: "SIZE",
  };

  description = Size.description;
  syntax = Size.syntax;
  directive = Size.directive;
  flags = Size.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
      const fileStat = await this.conn.fs.get(this.data.args);
      return await this.conn.close(213, fileStat.size.toString());
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
