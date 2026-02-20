import { makeRange, randomPort } from "../../../deps.ts";
import Connection from "../connection.ts";

interface PasvServerData {
  hostname: string;
  port: number;
}

export default class PassiveConnection {
  connection: Connection;
  port: number;
  listener?: Deno.Listener;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  conn?: Deno.Conn;
  hostname: string;

  constructor(connection: Connection) {
    this.connection = connection;
    this.hostname = connection.options.pasvUrl;
    this.port = randomPort(makeRange(1024, 65535));
  }

  close(): void {
    this.closeConn();

    if (this.listener !== undefined) {
      try {
        this.listener.close();
      } catch (e) {
        throw e;
      }

      this.listener = undefined;
    }
  }

  closeConn(): void {
    if (this.conn !== undefined) {
      try {
        this.conn.close();
      } catch (e) {
        if (
          !(
            e instanceof Deno.errors.BadResource ||
            e instanceof Deno.errors.InvalidData ||
            e instanceof Deno.errors.ConnectionAborted
          )
        ) {
          throw e;
        }
      }

      this.conn = undefined;
    }
  }

  create(): Deno.NetAddr {
    try {
      if (this.conn !== undefined) {
        this.conn.close();
        this.conn = undefined;
      }

      if (this.listener === undefined) {
        this.port = randomPort(makeRange(1024, 65535));
        if (this.connection.serve.secure) {
          const addr = this.connection.serve.addr as Deno.ListenTlsOptions & { certFile?: string; keyFile?: string };
          // Support both old certFile/keyFile and new cert/key patterns
          const cert = (addr as { cert?: string }).cert ||
            (addr.certFile ? Deno.readTextFileSync(addr.certFile) : undefined);
          const key = (addr as { key?: string }).key ||
            (addr.keyFile ? Deno.readTextFileSync(addr.keyFile) : undefined);

          if (!cert || !key) {
            throw new Error("TLS requires both cert and key");
          }

          this.listener = Deno.listenTls({
            port: this.port,
            hostname: this.hostname,
            cert,
            key,
          });
        } else {
          this.listener = Deno.listen({ port: this.port, hostname: this.hostname });
        }
      }

      return (this.listener.addr as Deno.NetAddr);
    } catch (e) {
      throw e;
    }
  }

  async accept(): Promise<void> {
    try {
      if (!this.listener) return undefined;
      if (!this.conn) this.conn = await this.listener.accept();
      if (this.conn) this.reader = this.conn.readable.getReader();
      if (this.conn) this.writer = this.conn.writable.getWriter();
      return;
    } catch (e) {
      throw e;
    }
  }
}
