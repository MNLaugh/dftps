import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Cwd {
  static directive = ["CWD", "XCWD"];
  static syntax = "{{cmd}} <path>";
  static description = "Change working directory";
  static flags = {};

  description = Cwd.description;
  syntax = Cwd.syntax;
  directive = Cwd.directive;
  flags = Cwd.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.chdir) return await this.conn.reply(402, "Not supported by file system");

      if (!this.data.args) return await this.conn.reply(501, "arg is necessary");
      const cwd = await this.conn.fs.chdir(this.data.args);
      return await this.conn.reply(250, `"${cwd.replace(/"/g, '""')}"`);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
