import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import Dele from "./DELE.ts";

export default class Cdup {
  static directive = ["RMD", "XRMD"];
  static syntax = "{{cmd}} <path>";
  static description = "Remove a directory";
  static flags = {};

  description = Cdup.description;
  syntax = Cdup.syntax;
  directive = Cdup.directive;
  flags = Cdup.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      return await new Dele(this.conn, this.data).handler();
    } catch (e) {
      throw e;
    }
  }
}
