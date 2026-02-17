import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Syst {
  static directive = "SYST";
  static syntax = "{{cmd}}";
  static description = "Return system type";
  static flags = {
    noAuth: true,
  };

  description = Syst.description;
  syntax = Syst.syntax;
  directive = Syst.directive;
  flags = Syst.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    return await this.conn.reply(215);
  }
}
