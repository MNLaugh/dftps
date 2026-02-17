import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import PassiveConnection from "../connectors/passive.ts";

export default class Pasv {
  static directive = "PASV";
  static syntax = "{{cmd}} <mode>";
  static description = "Initiate passive mode";
  static flags = {};

  description = Pasv.description;
  syntax = Pasv.syntax;
  directive = Pasv.directive;
  flags = Pasv.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      this.conn.connector = new PassiveConnection(this.conn);
      const { hostname, port } = this.conn.connector.create();

      const i1 = (port / 256) | 0;
      const i2 = port % 256;
      return await this.conn.reply(227, `Entering Passive Mode (${hostname.split(".").join(",")},${i1},${i2})`);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 425;
      throw err;
    }
  }
}
