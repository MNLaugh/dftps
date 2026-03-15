import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { ls } from "../filesystem.ts";
import type { FileInfo } from "../filesystem.ts";

export default class Stat {
  static directive = "STAT";
  static syntax = "{{cmd}} <path>";
  static description = "Returns the current status";
  static flags = {};

  description = Stat.description;
  syntax = Stat.syntax;
  directive = Stat.directive;
  flags = Stat.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "Arguments not found");
      const fileStat = await this.conn.fs.get(this.data.args);
      let reply: {
        code: number;
        stats: FileInfo[];
      };
      if (fileStat.isDirectory) {
        if (!this.conn.fs.list) return await this.conn.reply(402, "Not supported by file system");
        const list = await this.conn.fs.list(this.data.args);
        reply = { code: 213, stats: list };
      } else reply = { code: 212, stats: [fileStat] };
      const messages: string[] = ["Start"];
      for (let i = 0; i < reply.stats.length - 1; i++) {
        const message = ls(reply.stats[i]);
        messages.push(message);
      }
      messages.push("End");
      return await this.conn.reply(reply.code, messages);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 450;
      throw err;
    }
  }
}
