import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Quit {
  static directive = "QUIT";
  static syntax = "{{cmd}}";
  static description = "Disconnect";
  static flags = {};

  description = Quit.description;
  syntax = Quit.syntax;
  directive = Quit.directive;
  flags = Quit.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      return await this.conn.close(221, "Client called QUIT");
    } catch (e) {
      throw e;
    }
  }
}
