import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import Cwd from "./CWD.ts";

export default class Cdup {
  static directive = ["CDUP", "XCUP"];
  static syntax = "{{cmd}}";
  static description = "Change to Parent Directory";
  static flags = {};

  description = Cdup.description;
  syntax = Cdup.syntax;
  directive = Cdup.directive;
  flags = Cdup.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    this.data.args = "..";
    try {
      return await new Cwd(this.conn, this.data).handler();
    } catch (e) {
      throw e;
    }
  }
}
