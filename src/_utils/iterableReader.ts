/**
 * Modern async iterable reader for FTP connections.
 * Uses native streams instead of deprecated BufReader/MuxAsyncIterator.
 */
class IterableReader implements AsyncIterable<Uint8Array> {
  #closed = false;
  #buffer = "";
  #reader: ReadableStreamDefaultReader<Uint8Array>;

  constructor(public conn: Deno.Conn) {
    this.#reader = conn.readable.getReader();
  }

  close(): void {
    this.#closed = true;
    this.#reader.releaseLock();
  }

  /**
   * Reads lines from the connection, yielding each complete line as Uint8Array.
   * FTP protocol uses \r\n as line delimiter.
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    while (!this.#closed) {
      try {
        const { value, done } = await this.#reader.read();

        if (done) {
          // Connection closed, yield any remaining buffer content
          if (this.#buffer.length > 0) {
            yield encoder.encode(this.#buffer);
            this.#buffer = "";
          }
          break;
        }

        // Add received data to buffer
        this.#buffer += decoder.decode(value);

        // Process complete lines (FTP uses \r\n)
        let lineEnd: number;
        while ((lineEnd = this.#buffer.indexOf("\r\n")) !== -1) {
          const line = this.#buffer.substring(0, lineEnd);
          this.#buffer = this.#buffer.substring(lineEnd + 2);
          yield encoder.encode(line);
        }

        // Also handle single \n for compatibility
        while ((lineEnd = this.#buffer.indexOf("\n")) !== -1) {
          const line = this.#buffer.substring(0, lineEnd).replace(/\r$/, "");
          this.#buffer = this.#buffer.substring(lineEnd + 1);
          yield encoder.encode(line);
        }
      } catch (e) {
        // Handle various connection close scenarios gracefully
        const errorName = (e as Error).name;
        if (
          e instanceof Deno.errors.BadResource ||
          e instanceof Deno.errors.Interrupted ||
          e instanceof Deno.errors.ConnectionReset ||
          errorName === "UnexpectedEof" ||
          errorName === "ConnectionRefused" ||
          errorName === "ConnectionAborted"
        ) {
          // Connection closed, exit gracefully
          break;
        }
        throw e;
      }
    }
  }
}

export default IterableReader;
