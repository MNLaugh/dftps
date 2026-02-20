import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Clnt {
  static directive = "CLNT";
  static syntax = "{{cmd}} <software>";
  static description = "Identify the client software ";
  static flags = {
    noAuth: true,
  };

  description = Clnt.description;
  syntax = Clnt.syntax;
  directive = Clnt.directive;
  flags = Clnt.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      this.conn.software = this.data.args || "";
      console.log(this.data.args);
      return await this.conn.reply(200);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 500;
      throw err;
    }
  }
}
