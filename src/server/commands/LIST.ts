import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { encode } from "../../../deps.ts";
// FileInfo type used implicitly via FileSystem

export default class List {
  static directive = ["LIST", "NLST"];
  static syntax = "{{cmd}} [<path>]";
  static description =
    "Returns information of a file or directory if specified, else information of the current working directory is returned";
  static flags = {};

  description = List.description;
  syntax = List.syntax;
  directive = List.directive;
  flags = List.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(402, "Not supported by file system");
      if (!this.conn.fs.list) return await this.conn.reply(402, "Not supported by file system");
      const simple = this.data.directive === "NLST";
      const path = this.data.args || ".";
      const fs = this.conn.fs;
      if (this.conn.connector) {
        await this.conn.connector.accept();
        if (!this.conn.connector.conn || !this.conn.connector.writer) {
          return await this.conn.close(402, "Not passive writer found");
        }
        const writer = this.conn.connector.writer;
        const stat = await fs.get(path);
        const files = (stat && stat.isDirectory) ? await fs.list(path) : [stat];

        await this.conn.reply(150);

        // Write file list directly to the data connection
        for (const file of files) {
          if (!file) continue;

          let message: string;
          if (simple) {
            message = file.name;
          } else {
            const format = (!this.conn.options || !this.conn.options.fileFormat) ? "ls" : this.conn.options.fileFormat;
            const statResult = fs.stat(file, format);
            message = (!statResult) ? "" : statResult;
          }

          if (message) {
            await writer.write(encode(message + "\r\n"));
          }
        }

        this.conn.connector.close();
        return await this.conn.reply(226, "Transfer OK");
      } else return await this.conn.reply(402, "Not passive found");
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 226;
      throw err;
    }
  }
}
