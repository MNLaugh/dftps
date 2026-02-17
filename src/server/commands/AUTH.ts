import Connection from "../connection.ts";
import type { CommandData } from "./_REGISTRY.ts";
import type { ListenOptions } from "../mod.ts";

export default class Auth {
  static directive = "AUTH";
  static syntax = "{{cmd}} <type>";
  static description = "Set authentication mechanism";
  static flags = {
    noAuth: true,
    feat: "AUTH TLS SSL",
  };

  description = Auth.description;
  syntax = Auth.syntax;
  directive = Auth.directive;
  flags = Auth.flags;

  constructor(private conn: Connection, public data: CommandData) {}

  async handler(): Promise<void> {
    try {
      const addr = this.conn.serve.addr as ListenOptions;
      // Check for TLS support using new cert/key properties
      if (!addr.cert || !addr.key) {
        return await this.conn.reply(502, "This server does not support TLS");
      }
      if (this.conn.serve.secure) return await this.conn.reply(202);

      // Upgrade to TLS connection
      this.conn.serve.listener.close();
      this.conn.serve.listener = Deno.listenTls({
        hostname: addr.hostname,
        port: addr.port!,
        cert: addr.cert,
        key: addr.key,
      });
      const conn = await this.conn.serve.listener.accept();
      this.conn.conn = conn;
      this.conn.serve.secure = true;
      return;
    } catch (e) {
      const err = e as Error & { code?: number };
      err.code ||= 504;
      throw err;
    }
  }
}
