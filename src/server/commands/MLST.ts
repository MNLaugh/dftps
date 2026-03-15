import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { mlsx } from "../filesystem.ts";

/**
 * MLST - Machine Listing of a Single Entry (RFC 3659)
 * Returns information about a single file/directory in machine-readable format
 * The response is sent over the control connection (not data connection)
 */
export default class Mlst {
  static directive = "MLST";
  static syntax = "{{cmd}} [<path>]";
  static description = "Returns file/directory info in machine-readable format (RFC 3659)";
  static flags = {
    feat: "MLST type*;size*;modify*;perm*;unique*;",
  };

  description = Mlst.description;
  syntax = Mlst.syntax;
  directive = Mlst.directive;
  flags = Mlst.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.conn.fs.get) return await this.conn.reply(502, "Not supported by file system");

      const path = this.data.args || ".";
      const fs = this.conn.fs;

      try {
        const file = await fs.get(path);
        const line = mlsx(file);

        // MLST response format (RFC 3659):
        // 250-Listing <path>
        //  <facts> <filename>
        // 250 End
        return await this.conn.reply(250, [
          `Listing ${path}`,
          ` ${line}`,
          "End",
        ]);
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return await this.conn.reply(550, `${path}: No such file or directory`);
        }
        throw e;
      }
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 550;
      throw err;
    }
  }
}
