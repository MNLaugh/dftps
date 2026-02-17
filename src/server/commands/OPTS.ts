import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";

const OPTIONS: Record<string, (settings: string[]) => string | null> = {
  "utf-8": function utf8([setting]: string[] = []): string | null {
    switch (setting.toLocaleUpperCase()) {
      case "ON":
        return "utf8";
      case "OFF":
        return "ascii";
      default:
        return null;
    }
  },
};
export default class Opts {
  static directive = "OPTS";
  static syntax = "{{cmd}} [<path>]";
  static description = "Select options for a feature";
  static flags = {};

  description = Opts.description;
  syntax = Opts.syntax;
  directive = Opts.directive;
  flags = Opts.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    if (!this.data.args) return await this.conn.reply(501);
    const [_option, ...args] = this.data.args.split(" ");
    const option = _option.toLocaleLowerCase();
    if (typeof OPTIONS[option] === "undefined") return await this.conn.reply(501, "Unknown option command");
    const encoding = OPTIONS[option](args);
    if (!encoding) return await this.conn.reply(501, "Unknown setting for option");
    this.conn.encoding = encoding;
    return await this.conn.reply(200, `UTF8 encoding ${args}`);
  }
}
