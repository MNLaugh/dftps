import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import PassiveConnection from "../connectors/passive.ts";

export default class Epsv {
  static directive = "EPSV";
  static syntax = "{{cmd}} [<protocol>]";
  static description = "Initiate passive mode";
  static flags = {};

  description = Epsv.description;
  syntax = Epsv.syntax;
  directive = Epsv.directive;
  flags = Epsv.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      this.conn.connector = new PassiveConnection(this.conn);
      const { port } = this.conn.connector.create();
      return await this.conn.reply(229, `EPSV OK (|||${port}|)`);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 425;
      throw err;
    }
  }
}
