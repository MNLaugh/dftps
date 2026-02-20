import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import { REGISTRY } from "./_REGISTRY.ts";

export default class Feat {
  static directive = "FEAT";
  static syntax = "{{cmd}}";
  static description = "Get the feature list implemented by the server";
  static flags = {
    noAuth: true,
  };

  description = Feat.description;
  syntax = Feat.syntax;
  directive = Feat.directive;
  flags = Feat.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    const features: string[] = ["UTF8"];

    // Collect features from registered commands
    for (const Command of REGISTRY) {
      if (Command.flags?.feat) {
        features.push(Command.flags.feat);
      }
    }

    // RFC 2389 format: multi-line response with each feature on its own line
    if (features.length) {
      const featureLines = features.map((feat) => ` ${feat}`);
      return await this.conn.reply(211, [
        "Features:",
        ...featureLines.map((line) => ({ message: line, raw: true })),
        "End",
      ]);
    } else {
      return await this.conn.reply(211, "No features");
    }
  }
}
