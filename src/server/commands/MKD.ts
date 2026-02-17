import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Mkd {
  static directive = ["MKD", "XMKD"];
  static syntax = "{{cmd}} <path>";
  static description = "Make directory";
  static flags = {};

  description = Mkd.description;
  syntax = Mkd.syntax;
  directive = Mkd.directive;
  flags = Mkd.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.mkdir) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Directory name not found!");
      const path = await this.conn.fs.mkdir(this.data.args);
      return await this.conn.reply(257, `${path.replace(/"/g, '""')} directory created!`);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      err.message ||= "Directory NOT created!";
      throw err;
    }
  }
}
