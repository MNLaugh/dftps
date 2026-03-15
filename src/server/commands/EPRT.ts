import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import ActiveConnector from "../connectors/active.ts";

// const FAMILY: Record<number, number> = {
//   1: 4,
//   2: 6
// };

export default class Eprt {
  static directive = "EPRT";
  static syntax = "{{cmd}} |<protocol>|<address>|<port>|";
  static description = "Specifies an address and port to which the server should connect";
  static flags = {};

  description = Eprt.description;
  syntax = Eprt.syntax;
  directive = Eprt.directive;
  flags = Eprt.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.data.args) return await this.conn.reply(501, "Arguments require");
      const [, /*protocol*/ , ip, port] = this.data.args.split("|").values();
      //const family = FAMILY[protocol];
      //if (!family) return await this.conn.reply(504, 'Unknown network protocol');
      this.conn.connector = new ActiveConnector(this.conn);
      await this.conn.connector.create(ip, parseInt(port));
      return await this.conn.reply(200);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 425;
      throw err;
    }
  }
}
