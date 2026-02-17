import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Mode {
  static directive = "MODE";
  static syntax = "{{cmd}} <mode>";
  static description = "Sets the transfer mode (Stream, Block, or Compressed)";
  static flags = {};

  description = Mode.description;
  syntax = Mode.syntax;
  directive = Mode.directive;
  flags = Mode.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    return await this.conn.reply((this.data.args && /^S$/i.test(this.data.args)) ? 200 : 504);
  }
}
