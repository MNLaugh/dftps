/**
 * Tests for command registry functions (parseCommand, findCommand)
 */
import { assertEquals, assertExists } from "@std/assert";
import { parseCommand, findCommand, REGISTRY } from "../src/server/commands/_REGISTRY.ts";

// ============================================
// parseCommand() tests
// ============================================

Deno.test("parseCommand - simple command without args", () => {
  const result = parseCommand("FEAT");
  assertEquals(result.directive, "FEAT");
  assertEquals(result.args, null);
  assertEquals(result.flags, []);
  assertEquals(result.raw, "FEAT");
});

Deno.test("parseCommand - command with single arg", () => {
  const result = parseCommand("USER admin");
  assertEquals(result.directive, "USER");
  assertEquals(result.args, "admin");
  assertEquals(result.flags, []);
});

Deno.test("parseCommand - command with path arg", () => {
  const result = parseCommand("CWD /home/user/documents");
  assertEquals(result.directive, "CWD");
  assertEquals(result.args, "/home/user/documents");
});

Deno.test("parseCommand - command with space in path", () => {
  const result = parseCommand("RETR my file.txt");
  assertEquals(result.directive, "RETR");
  assertEquals(result.args, "my file.txt");
});

Deno.test("parseCommand - command with flags", () => {
  const result = parseCommand("LIST -a /home");
  assertEquals(result.directive, "LIST");
  assertEquals(result.args, "/home");
  assertEquals(result.flags, ["-a"]);
});

Deno.test("parseCommand - converts directive to uppercase", () => {
  const result = parseCommand("quit");
  assertEquals(result.directive, "QUIT");
});

Deno.test("parseCommand - MFMT with timestamp and path", () => {
  const result = parseCommand("MFMT 20260217120000 /path/to/file.txt");
  assertEquals(result.directive, "MFMT");
  assertEquals(result.args, "20260217120000 /path/to/file.txt");
});

Deno.test("parseCommand - strips quotes", () => {
  const result = parseCommand('STOR "my file.txt"');
  assertEquals(result.directive, "STOR");
  assertEquals(result.args, "my file.txt");
});

Deno.test("parseCommand - strips newlines", () => {
  const result = parseCommand("QUIT\r\n");
  assertEquals(result.directive, "QUIT");
  assertEquals(result.args, null);
});

// ============================================
// findCommand() tests
// ============================================

Deno.test("findCommand - finds USER command", () => {
  const cmd = findCommand("USER");
  assertExists(cmd);
  assertEquals(cmd?.directive, "USER");
});

Deno.test("findCommand - finds FEAT command", () => {
  const cmd = findCommand("FEAT");
  assertExists(cmd);
  assertEquals(cmd?.directive, "FEAT");
});

Deno.test("findCommand - returns undefined for unknown command", () => {
  const cmd = findCommand("UNKNOWN");
  assertEquals(cmd, undefined);
});

Deno.test("findCommand - finds alias XPWD", () => {
  const cmd = findCommand("XPWD");
  assertExists(cmd);
  // XPWD is an alias for PWD
  const directives = Array.isArray(cmd?.directive) ? cmd.directive : [cmd?.directive];
  assertEquals(directives.includes("XPWD"), true);
  assertEquals(directives.includes("PWD"), true);
});

Deno.test("findCommand - finds alias XRMD", () => {
  const cmd = findCommand("XRMD");
  assertExists(cmd);
  const directives = Array.isArray(cmd?.directive) ? cmd.directive : [cmd?.directive];
  assertEquals(directives.includes("XRMD"), true);
});

Deno.test("findCommand - finds MLSD command", () => {
  const cmd = findCommand("MLSD");
  assertExists(cmd);
  assertEquals(cmd?.directive, "MLSD");
});

Deno.test("findCommand - finds MLST command", () => {
  const cmd = findCommand("MLST");
  assertExists(cmd);
  assertEquals(cmd?.directive, "MLST");
});

Deno.test("findCommand - finds MFMT command", () => {
  const cmd = findCommand("MFMT");
  assertExists(cmd);
  assertEquals(cmd?.directive, "MFMT");
});

// ============================================
// REGISTRY tests
// ============================================

Deno.test("REGISTRY - contains expected number of commands", () => {
  // At least 40 commands
  assertEquals(REGISTRY.length >= 40, true);
});

Deno.test("REGISTRY - all commands have required properties", () => {
  for (const cmd of REGISTRY) {
    assertExists(cmd.directive, `Command missing directive`);
    assertExists(cmd.syntax, `Command ${cmd.directive} missing syntax`);
    assertExists(cmd.description, `Command ${cmd.directive} missing description`);
    assertExists(cmd.flags, `Command ${cmd.directive} missing flags`);
  }
});
