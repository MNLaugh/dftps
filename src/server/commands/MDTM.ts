import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { format } from "../../../deps.ts";

export default class Mdtm {
  static directive = "MDTM";
  static syntax = "{{cmd}} <path>";
  static description = "Return the last-modified time of a specified file";
  static flags = {
    feat: "MDTM",
  };

  description = Mdtm.description;
  syntax = Mdtm.syntax;
  directive = Mdtm.directive;
  flags = Mdtm.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Not arguments found");
      const fileStat = await this.conn.fs.get(this.data.args);
      if (!fileStat.mtime) return await this.conn.reply(550);
      const modified = format(new Date(fileStat.mtime), "YYYYMMDDHHmmss.SSS");
      return await this.conn.reply(213, modified);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
