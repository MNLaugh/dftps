import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Pbsz {
  static directive = "PROT";
  static syntax = "{{cmd}}";
  static description = "Data Channel Protection Level";
  static flags = {
    noAuth: true,
    feat: "PROT",
  };

  description = Pbsz.description;
  syntax = Pbsz.syntax;
  directive = Pbsz.directive;
  flags = Pbsz.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (!this.conn.serve.secure) return await this.conn.reply(202, "Not supported");
    if (!this.conn.bufferSize && typeof this.conn.bufferSize !== "number") return await this.conn.reply(503);
    const prot = (!this.data.args) ? null : this.data.args.toUpperCase();
    switch (prot) {
      case "P":
        return await this.conn.reply(200);
      case "C":
      case "S":
      case "E":
        return await this.conn.reply(536, "Not supported");
      default:
        return await this.conn.reply(504);
    }
  }
}
