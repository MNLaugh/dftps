import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Rest {
  static directive = "REST";
  static syntax = "{{cmd}} <byte-count>";
  static description = "Restart transfer from the specified point. Resets after any STORE or RETRIEVE";
  static flags = {
    feat: "REST STREAM",
  };

  description = Rest.description;
  syntax = Rest.syntax;
  directive = Rest.directive;
  flags = Rest.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    const byteCount = parseInt(this.data.args || "", 10);
    if (isNaN(byteCount) || byteCount < 0) return await this.conn.reply(501, "Byte count must be 0 or greater");
    this.conn.restByteCount = byteCount;
    return await this.conn.reply(350, `Restarting next transfer at ${byteCount}`);
  }
}
