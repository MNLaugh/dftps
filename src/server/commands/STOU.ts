import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import Stor from "./STOR.ts";

export default class Stou {
  static directive = "STOU";
  static syntax = "{{cmd}}";
  static description = "Store file uniquely";
  static flags = {};

  description = Stou.description;
  syntax = Stou.syntax;
  directive = Stou.directive;
  flags = Stou.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
      const fileName = this.data.args;
      const getUniqueName = this.conn.fs.getUniqueName;
      this.conn.fs.get(this.data.args)
        .then(() => getUniqueName())
        .catch(() => fileName)
        .then((name: string) => {
          this.data.args = name;
          return new Stor(this.conn, this.data).handler();
        });
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
