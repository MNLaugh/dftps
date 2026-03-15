import { Connection } from "../connection.ts";
import type { CommandConstructor, CommandData } from "./_REGISTRY.ts";
import { findCommand, REGISTRY } from "./_REGISTRY.ts";
import { chunk } from "../../_utils/lodash.ts";

export default class Help {
  static directive = "HELP";
  static syntax = "{{cmd}} [<command>]";
  static description =
    "Returns usage documentation on a command if specified, else a general help document is returned";
  static flags = {};

  description = Help.description;
  syntax = Help.syntax;
  directive = Help.directive;
  flags = Help.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    const directive = (this.data.args) ? this.data.args.toUpperCase() : null;
    if (directive) {
      const command = findCommand(directive);
      if (!command) return await this.conn.reply(502, `Unknown command ${directive}.`);
      const { syntax, description } = command;
      const reply = [syntax.replace("{{cmd}}", directive), description];
      return await this.conn.reply(214, reply);
    } else {
      const directives: string[] = [];
      REGISTRY.forEach((command: CommandConstructor) => {
        if (command.directive instanceof Array) command.directive.forEach((d: string) => directives.push(d));
        else directives.push(command.directive);
      });
      const supportedCommands = chunk(directives, 5).map((chunk: string[]) => chunk.join("\t"));
      return await this.conn.reply(211, [
        "Supported commands:",
        ...supportedCommands,
        'Use "HELP [command]" for syntax help.',
      ]);
    }
  }
}
