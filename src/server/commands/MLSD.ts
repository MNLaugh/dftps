import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { encode } from "../../../deps.ts";
import { mlsx } from "../filesystem.ts";

/**
 * MLSD - Machine Listing of a Directory (RFC 3659)
 * Returns directory contents in machine-readable format
 */
export default class Mlsd {
  static directive = "MLSD";
  static syntax = "{{cmd}} [<path>]";
  static description = "Returns directory listing in machine-readable format (RFC 3659)";
  static flags = {
    feat: "MLSD",
  };

  description = Mlsd.description;
  syntax = Mlsd.syntax;
  directive = Mlsd.directive;
  flags = Mlsd.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.list) return await this.conn.reply(502, "Not supported by file system");

      const path = this.data.args || ".";
      const fs = this.conn.fs;

      if (this.conn.connector) {
        await this.conn.connector.accept();
        if (!this.conn.connector.conn || !this.conn.connector.writer) {
          return await this.conn.close(425, "Can't open data connection");
        }

        const writer = this.conn.connector.writer;

        try {
          const files = await fs.list(path);
          await this.conn.reply(150, "Opening data connection for MLSD");

          for (const file of files) {
            if (!file) continue;
            const line = mlsx(file);
            await writer.write(encode(line + "\r\n"));
          }

          this.conn.connector.close();
          return await this.conn.reply(226, "Transfer complete");
        } catch (e) {
          this.conn.connector.close();
          if (e instanceof Deno.errors.NotFound) {
            return await this.conn.reply(550, "Directory not found");
          }
          throw e;
        }
      } else {
        return await this.conn.reply(425, "Use PASV or PORT first");
      }
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
