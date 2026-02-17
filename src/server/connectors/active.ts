import Connection from "../connection.ts";

export default class ActiveConnector {
  hostname?: string;
  port?: number;
  connection: Connection;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  conn?: Deno.Conn;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private async connect({ hostname, port }: { hostname: string; port: number }): Promise<Deno.Conn> {
    try {
      const addr = this.connection.serve.addr as Deno.ListenTlsOptions & { certFile?: string; cert?: string };
      if (!this.connection.serve.secure && !addr.cert && !addr.certFile) {
        return await Deno.connect({ hostname, port });
      } else {
        // For TLS connections, we need the certificate
        let cert = addr.cert;
        if (!cert && addr.certFile) {
          cert = await Deno.readTextFile(addr.certFile);
        }
        if (!cert) {
          throw new Error("TLS certificate required for secure connection");
        }
        return await Deno.connectTls({ hostname, port, caCerts: [cert] });
      }
    } catch (e) {
      throw e;
    }
  }

  close(): void {
    try {
      if (this.conn) this.conn.close();
    } catch (e) {
      throw e;
    }
  }

  async accept() {
    try {
      if (!this.conn && this.hostname && this.port) {
        this.conn = await this.connect({ hostname: this.hostname, port: this.port });
      }
      if (this.conn) this.reader = this.conn.readable.getReader();
      if (this.conn) this.writer = this.conn.writable.getWriter();
      return this;
    } catch (e) {
      throw e;
    }
  }

  async create(hostname: string, port: number) {
    try {
      this.hostname = hostname;
      this.port = port;
      if (this.conn) this.conn.close();
      this.conn = await this.connect({ hostname, port });
    } catch (e) {
      throw e;
    }
  }
}
