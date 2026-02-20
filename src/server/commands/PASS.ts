import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Pass {
  static directive = "PASS";
  static syntax = "{{cmd}} <password>";
  static description = "Authentication password";
  static flags = {
    noAuth: true,
  };

  description = Pass.description;
  syntax = Pass.syntax;
  directive = Pass.directive;
  flags = Pass.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.username) return await this.conn.reply(503);
      if (this.conn.authenticated) return await this.conn.reply(202);
      if (!this.data.args) return await this.conn.close(501, "Must provide password");
      await this.conn.login(this.data.args);
      return await this.conn.reply(230);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 530;
      throw err;
    }
  }
}
