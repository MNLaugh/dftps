import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Type {
  static directive = "TYPE";
  static syntax = "{{cmd}} <mode>";
  static description = "Set the transfer mode, binary (I) or ascii (A)";
  static flags = {
    feat: "TYPE A,I,L",
  };

  description = Type.description;
  syntax = Type.syntax;
  directive = Type.directive;
  flags = Type.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (!this.data.args || typeof this.data.args !== "string") return await this.conn.reply(501, "must have arg");
    if (/^A[0-9]?$/i.test(this.data.args)) {
      this.conn.transferType = "ascii";
    } else if (/^L[0-9]?$/i.test(this.data.args) || /^I$/i.test(this.data.args)) {
      this.conn.transferType = "binary";
    } else {
      return await this.conn.reply(504);
    }
    return await this.conn.reply(200, `Switch to "${this.conn.transferType}" transfer mode.`);
  }
}
