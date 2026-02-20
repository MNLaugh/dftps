import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class User {
  static directive = "USER";
  static syntax = "{{cmd}} <username>";
  static description = "Authentication username";
  static flags = {
    noAuth: true,
  };

  description = User.description;
  syntax = User.syntax;
  directive = User.directive;
  flags = User.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (this.conn.username) return await this.conn.reply(530, "Username already set");
    if (this.conn.authenticated) return await this.conn.reply(230);
    if (!this.data.args) return await this.conn.reply(501, "Must provide username");

    if (
      (this.conn.options?.anonymous === true && this.data.args === "anonymous" ||
        (typeof this.conn.options?.anonymous === "string" && this.data.args === this.conn.options.anonymous))
    ) {
      //await this.login(this.conn.username, '@anonymous').catch(async (error: Error) => {
      //  console.error('Error in USER: ', error);
      //  return await this.conn.close(530, 'Authentication failed');
      //});
      return await this.conn.reply(230);
    }
    await this.conn.setUsername(this.data.args);
    return await this.conn.reply(331);
  }
}
