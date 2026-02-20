/**
 * Tests for Logger utility
 */
import { assertEquals, assertExists } from "@std/assert";
import Logger, { Colors } from "../src/_utils/logger.ts";

// ============================================================================
// Colors enum tests
// ============================================================================

Deno.test("Colors - has reset code", () => {
  assertEquals(Colors.Reset, "\x1b[0m");
});

Deno.test("Colors - has foreground colors", () => {
  assertEquals(Colors.FgRed, "\x1b[31m");
  assertEquals(Colors.FgGreen, "\x1b[32m");
  assertEquals(Colors.FgYellow, "\x1b[33m");
  assertEquals(Colors.FgBlue, "\x1b[34m");
  assertEquals(Colors.FgWhite, "\x1b[37m");
});

Deno.test("Colors - has background colors", () => {
  assertEquals(Colors.BgRed, "\x1b[41m");
  assertEquals(Colors.BgGreen, "\x1b[42m");
  assertEquals(Colors.BgBlue, "\x1b[44m");
});

Deno.test("Colors - has lite (bright) colors", () => {
  assertEquals(Colors.FgLiteRed, "\x1b[91m");
  assertEquals(Colors.FgLiteGreen, "\x1b[92m");
  assertEquals(Colors.FgLiteBlue, "\x1b[94m");
  assertEquals(Colors.FgLiteCyan, "\x1b[96m");
});

Deno.test("Colors - has text styles", () => {
  assertEquals(Colors.Bright, "\x1b[1m");
  assertEquals(Colors.Dim, "\x1b[2m");
  assertEquals(Colors.Italic, "\x1b[3m");
  assertEquals(Colors.Underscore, "\x1b[4m");
});

// ============================================================================
// Logger creation tests
// ============================================================================

Deno.test("Logger - creates with default options", () => {
  const logger = new Logger();
  assertExists(logger);
});

Deno.test("Logger - creates with custom prefix", () => {
  const logger = new Logger({ prefix: "[Test]" });
  assertExists(logger);
});

Deno.test("Logger - creates with static method", () => {
  const logger = Logger.create({ prefix: "[Static]" });
  assertExists(logger);
});

Deno.test("Logger - creates with colorize disabled", () => {
  const logger = new Logger({ colorize: false });
  assertExists(logger);
});

// ============================================================================
// Logger methods exist tests
// ============================================================================

Deno.test("Logger - has log method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.log, "function");
});

Deno.test("Logger - has success method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.success, "function");
});

Deno.test("Logger - has info method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.info, "function");
});

Deno.test("Logger - has warn method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.warn, "function");
});

Deno.test("Logger - has error method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.error, "function");
});

Deno.test("Logger - has debug method", () => {
  const logger = new Logger();
  assertEquals(typeof logger.debug, "function");
});

// ============================================================================
// Logger output tests (capture console.log)
// ============================================================================

Deno.test("Logger - log outputs message", () => {
  const logs: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args);

  try {
    const logger = new Logger({ prefix: "[Test]", colorize: false });
    logger.log("test message");

    assertEquals(logs.length, 1);
    // Check that the message contains our text
    const output = logs[0].join(" ");
    assertEquals(output.includes("test message"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("Logger - handles objects", () => {
  const logs: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args);

  try {
    const logger = new Logger({ colorize: false });
    logger.log({ key: "value" });

    assertEquals(logs.length, 1);
    const output = logs[0].join(" ");
    assertEquals(output.includes('{"key":"value"}'), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("Logger - handles errors", () => {
  const logs: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args);

  try {
    const logger = new Logger({ colorize: false });
    logger.error(new Error("test error"));

    assertEquals(logs.length, 1);
    const output = logs[0].join(" ");
    assertEquals(output.includes("Error: test error"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("Logger - handles arrays", () => {
  const logs: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args);

  try {
    const logger = new Logger({ colorize: false });
    logger.log([1, 2, 3]);

    assertEquals(logs.length, 1);
    const output = logs[0].join(" ");
    assertEquals(output.includes("1,2,3"), true);
  } finally {
    console.log = originalLog;
  }
});
