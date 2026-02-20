import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Stou {
  static directive = "STRU";
  static syntax = "{{cmd}} <structure>";
  static description = "Set file transfer structure";
  static flags = {};

  description = Stou.description;
  syntax = Stou.syntax;
  directive = Stou.directive;
  flags = Stou.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (!this.data.args || typeof this.data.args !== "string") return await this.conn.reply(501, "must have arg");
    return await this.conn.reply(/^F$/i.test(this.data.args) ? 200 : 504);
  }
}
