import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import List from "./LIST.ts";

export default class Nlst {
  static directive = "NLST";
  static syntax = "{{cmd}} [<path>]";
  static description = "Returns a list of file names in a specified directory";
  static flags = {};

  description = Nlst.description;
  syntax = Nlst.syntax;
  directive = Nlst.directive;
  flags = Nlst.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      return await new List(this.conn, this.data).handler();
    } catch (e) {
      throw e;
    }
  }
}
