import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Pbsz {
  static directive = "PBSZ";
  static syntax = "{{cmd}}";
  static description = "Protection Buffer Size";
  static flags = {
    noAuth: true,
    feat: "PBSZ",
  };

  description = Pbsz.description;
  syntax = Pbsz.syntax;
  directive = Pbsz.directive;
  flags = Pbsz.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (!this.conn.serve.secure) return await this.conn.reply(202, "Not supported");
    if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
    this.conn.bufferSize = parseInt(this.data.args, 10);
    return await this.conn.reply(200, this.conn.bufferSize === 0 ? "OK" : "Buffer too large: PBSZ=0");
  }
}
