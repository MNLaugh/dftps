import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import ActiveConnector from "../connectors/active.ts";

export default class Port {
  static directive = "PORT";
  static syntax = "{{cmd}} <x>,<x>,<x>,<x>,<y>,<y>";
  static description = "Specifies an address and port to which the server should connect";
  static flags = {};

  description = Port.description;
  syntax = Port.syntax;
  directive = Port.directive;
  flags = Port.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.data.args) return await this.conn.reply(501, "must have mode");
      this.conn.connector = new ActiveConnector(this.conn);
      const rawConnection = this.data.args.split(",");
      if (rawConnection.length !== 6) return await this.conn.reply(425);

      const ip = rawConnection.slice(0, 4).join(".");
      const portBytes = rawConnection.slice(4).map((p: string) => parseInt(p));
      const port = portBytes[0] * 256 + portBytes[1];

      await this.conn.connector.create(ip, port);
      return await this.conn.reply(200);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 425;
      throw err;
    }
  }
}
