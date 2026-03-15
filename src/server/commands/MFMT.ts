import { Connection } from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { format } from "../../../deps.ts";

/**
 * MFMT - Modify File Modification Time (RFC 3659 draft)
 * Allows clients to set modification time of a file
 * Syntax: MFMT YYYYMMDDHHmmss <path>
 */
export default class Mfmt {
  static directive = "MFMT";
  static syntax = "{{cmd}} <timestamp> <path>";
  static description = "Modify the last modification time of a file";
  static flags = {
    feat: "MFMT",
  };

  description = Mfmt.description;
  syntax = Mfmt.syntax;
  directive = Mfmt.directive;
  flags = Mfmt.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      if (!this.conn.fs) return await this.conn.reply(550, "File system not instantiated");
      if (!this.data.args) return await this.conn.reply(501, "Syntax error: MFMT YYYYMMDDHHmmss <path>");

      // Parse: first 14 chars are timestamp, rest is path
      const args = this.data.args;
      const timestampMatch = args.match(/^(\d{14})\s+(.+)$/);

      if (!timestampMatch) {
        return await this.conn.reply(501, "Syntax error: MFMT YYYYMMDDHHmmss <path>");
      }

      const [, timestamp, path] = timestampMatch;

      // Parse YYYYMMDDHHmmss
      const year = parseInt(timestamp.substring(0, 4), 10);
      const month = parseInt(timestamp.substring(4, 6), 10) - 1; // 0-indexed
      const day = parseInt(timestamp.substring(6, 8), 10);
      const hour = parseInt(timestamp.substring(8, 10), 10);
      const minute = parseInt(timestamp.substring(10, 12), 10);
      const second = parseInt(timestamp.substring(12, 14), 10);

      const mtime = new Date(Date.UTC(year, month, day, hour, minute, second));

      if (isNaN(mtime.getTime())) {
        return await this.conn.reply(501, "Invalid timestamp format");
      }

      const fs = this.conn.fs;

      // Check file exists
      try {
        await fs.get(path);
      } catch {
        return await this.conn.reply(550, `${path}: No such file or directory`);
      }

      // Set the modification time
      await fs.utime(path, mtime);

      // Return success with the new modification time
      const modifiedStr = format(mtime, "YYYYMMDDHHmmss");
      return await this.conn.reply(213, `Modify=${modifiedStr}; ${path}`);
    } catch (e) {
      const err = e as Error & { code?: number };
      if (err.message?.includes("permissions")) {
        return await this.conn.reply(550, "Permission denied");
      }
      err.code ||= 550;
      throw err;
    }
  }
}
