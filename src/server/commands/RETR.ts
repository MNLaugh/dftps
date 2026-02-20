import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

export default class Retr {
  static directive = "RETR";
  static syntax = "{{cmd}} [<path>]";
  static description = "Retrieve a copy of the file";
  static flags = {};

  description = Retr.description;
  syntax = Retr.syntax;
  directive = Retr.directive;
  flags = Retr.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.read) return await this.conn.reply(402, "Not supported by file system");
      if (!this.data.args) return await this.conn.reply(501, "File name not found!");
      if (!this.conn.connector) return await this.conn.reply(402, "Not passive found");
      if (!this.conn.connector.conn) await this.conn.connector.accept();
      if (!this.conn.connector.conn) return await this.conn.reply(402, "Not passive connection found");

      const filePath = this.data.args;
      const { stream, clientPath } = await this.conn.fs.read(filePath);

      await this.conn.reply(150);
      // Use native readable stream from FsFile
      const readableStream = stream.readable;
      await readableStream.pipeTo(this.conn.connector.conn.writable);
      this.conn.connector.conn.close();
      return await this.conn.reply(226, clientPath);
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 551;
      throw err;
    }
  }
}
