import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Stor {
  static directive = ["STOR", "APPE"];
  static syntax = "{{cmd}} [<path>]";
  static description = "Store data as a file at the server";
  static flags = {};

  description = Stor.description;
  syntax = Stor.syntax;
  directive = Stor.directive;
  flags = Stor.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.read) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "File name not found!");
      if (!this.conn.connector) return await this.conn.reply(402, "Not passive found");
      if (!this.conn.connector.conn) await this.conn.connector.accept();
      if (!this.conn.connector.conn) return await this.conn.reply(402, "Not passive connection found");
      let append = this.data.directive === "APPE";
      const filePath = this.data.args;

      await this.conn.reply(150);
      // Use native readable stream
      const reader = this.conn.connector.conn.readable.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            await this.conn.fs.write(filePath, value, { append });
            append = true;
          }
        }
      } finally {
        reader.releaseLock();
      }
      await this.conn.reply(226, filePath);
      return this.conn.connector.close();
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
