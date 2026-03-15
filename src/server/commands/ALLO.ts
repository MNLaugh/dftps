import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Allo {
  static directive = "ALLO";
  static syntax = "{{cmd}}";
  static description = "Allocate sufficient disk space to receive a file";
  static flags = {};

  description = Allo.description;
  syntax = Allo.syntax;
  directive = Allo.directive;
  flags = Allo.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    return await this.conn.reply(202);
  }
}
