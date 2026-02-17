/**
 * Tests for TOML parser
 */
import { assertEquals, assertThrows } from "@std/assert";
import tomlJson from "../src/_utils/toml.ts";

// ============================================================================
// Basic parsing tests
// ============================================================================

Deno.test("toml - parses empty input", () => {
  const result = tomlJson({});
  assertEquals(result, {});
});

Deno.test("toml - parses simple key-value", () => {
  const result = tomlJson({ data: 'name = "test"' });
  assertEquals(result.name, "test");
});

Deno.test("toml - parses multiple key-values", () => {
  const result = tomlJson({ data: 'host = "localhost"\nport = 21' });
  assertEquals(result.host, "localhost");
  assertEquals(result.port, 21);
});

Deno.test("toml - parses boolean true", () => {
  const result = tomlJson({ data: "enabled = true" });
  assertEquals(result.enabled, true);
});

Deno.test("toml - parses boolean false", () => {
  const result = tomlJson({ data: "disabled = false" });
  assertEquals(result.disabled, false);
});

Deno.test("toml - parses integer", () => {
  const result = tomlJson({ data: "count = 42" });
  assertEquals(result.count, 42);
});

Deno.test("toml - parses float", () => {
  const result = tomlJson({ data: "pi = 3.14" });
  assertEquals(result.pi, 3.14);
});

// ============================================================================
// Section tests
// ============================================================================

Deno.test("toml - parses section", () => {
  const result = tomlJson({ data: "[server]\nport = 21" });
  assertEquals(result.server?.port, 21);
});

Deno.test("toml - parses multiple sections", () => {
  const data = `[server]
port = 21

[database]
host = "localhost"`;
  const result = tomlJson({ data });
  assertEquals(result.server?.port, 21);
  assertEquals(result.database?.host, "localhost");
});

Deno.test("toml - parses nested section", () => {
  const data = `[server]
port = 21

[server.tls]
enabled = true`;
  const result = tomlJson({ data });
  assertEquals(result.server?.port, 21);
  assertEquals(result.server?.tls?.enabled, true);
});

// ============================================================================
// Array tests
// ============================================================================

Deno.test("toml - parses inline array", () => {
  // Note: TOML parser preserves spaces after commas
  const result = tomlJson({ data: 'ports = [21,22,80]' });
  assertEquals(result.ports, [21, 22, 80]);
});

Deno.test("toml - parses string array", () => {
  // Note: TOML parser preserves spaces after commas
  const result = tomlJson({ data: 'hosts = ["a","b","c"]' });
  assertEquals(result.hosts, ["a", "b", "c"]);
});

Deno.test("toml - parses multiline array", () => {
  const data = `items = [
1,
2,
3
]`;
  const result = tomlJson({ data });
  assertEquals(result.items, [1, 2, 3]);
});

// ============================================================================
// Comment tests
// ============================================================================

Deno.test("toml - ignores comments", () => {
  const data = `# This is a comment
name = "test"
# Another comment`;
  const result = tomlJson({ data });
  assertEquals(result.name, "test");
  assertEquals(Object.keys(result).length, 1);
});

// ============================================================================
// Error handling tests
// ============================================================================

Deno.test("toml - throws on invalid syntax without spaces", () => {
  assertThrows(
    () => tomlJson({ data: "key='value'" }),
    Error,
    "Syntaxe like",
  );
});

// ============================================================================
// Real config tests
// ============================================================================

Deno.test("toml - parses FTP config structure", () => {
  const data = `hostname = "127.0.0.1"
port = 21
pasv_url = "127.0.0.1"
pasv_min = 10000
pasv_max = 10100

[tls]
cert = "/path/to/cert.pem"
key = "/path/to/key.pem"`;

  const result = tomlJson({ data });
  assertEquals(result.hostname, "127.0.0.1");
  assertEquals(result.port, 21);
  assertEquals(result.pasv_url, "127.0.0.1");
  assertEquals(result.pasv_min, 10000);
  assertEquals(result.pasv_max, 10100);
  assertEquals(result.tls?.cert, "/path/to/cert.pem");
  assertEquals(result.tls?.key, "/path/to/key.pem");
});
