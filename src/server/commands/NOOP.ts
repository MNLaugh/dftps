import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Noop {
  static directive = "NOOP";
  static syntax = "{{cmd}}";
  static description = "No operation";
  static flags = {};

  description = Noop.description;
  syntax = Noop.syntax;
  directive = Noop.directive;
  flags = Noop.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    return await this.conn.reply(200);
  }
}
