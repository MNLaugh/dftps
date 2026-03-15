import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import Stor from "./STOR.ts";

export default class Appe {
  static directive = "APPE";
  static syntax = "{{cmd}} <path>";
  static description = "Append to a file";
  static flags = {};

  description = Appe.description;
  syntax = Appe.syntax;
  directive = Appe.directive;
  flags = Appe.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      return await new Stor(this.conn, this.data).handler();
    } catch (e) {
      throw e;
    }
  }
}
