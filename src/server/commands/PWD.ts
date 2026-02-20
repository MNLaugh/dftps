import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Pwd {
  static directive = ["PWD", "XPWD"];
  static syntax = "{{cmd}}";
  static description = "Print current working directory";
  static flags = {
    noAuth: true,
  };

  description = Pwd.description;
  syntax = Pwd.syntax;
  directive = Pwd.directive;
  flags = Pwd.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn?.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn?.fs.currentDirectory) return await this.conn.reply(402, "Not supported by file system");
      const cwd = this.conn.fs.currentDirectory();
      return await this.conn.reply(257, `"${cwd.replace(/"/g, '""')}"`);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
