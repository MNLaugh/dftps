import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Abor {
  static directive = "ABOR";
  static syntax = "{{cmd}}";
  static description = "Abort an active file transfer";
  static flags = {};

  description = Abor.description;
  syntax = Abor.syntax;
  directive = Abor.directive;
  flags = Abor.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (this.conn.connector !== undefined && this.conn.connector.conn !== undefined) {
        await this.conn.reply(426, { writer: this.conn.connector.writer });
        await this.conn.connector.close();
      }
      return await this.conn.reply(226);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 225;
      throw err;
    }
  }
}
