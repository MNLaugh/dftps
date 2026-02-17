/**
 * Tests for FTP status codes and messages
 */
import { assertEquals, assertExists } from "@std/assert";
import { Status, STATUS_TEXT } from "../src/server/ftp_status.ts";

// ============================================================================
// Status enum tests
// ============================================================================

Deno.test("Status - 100 series codes", () => {
  assertEquals(Status.FileStatusOK, 150);
});

Deno.test("Status - 200 series success codes", () => {
  assertEquals(Status.OK, 200);
  assertEquals(Status.NotImplemented, 202);
  assertEquals(Status.SystemStatus, 211);
  assertEquals(Status.DirectoryStatus, 212);
  assertEquals(Status.FileStatus, 213);
  assertEquals(Status.HelpMessage, 214);
  assertEquals(Status.SystemType, 215);
  assertEquals(Status.ServiceReady, 220);
  assertEquals(Status.ClosingControlConn, 221);
  assertEquals(Status.ClosingDataConn, 226);
  assertEquals(Status.EnteringPASV, 227);
  assertEquals(Status.EnteringEPSV, 229);
  assertEquals(Status.UserLoggedIn, 230);
  assertEquals(Status.AuthAccepted, 234);
  assertEquals(Status.FileOK, 250);
  assertEquals(Status.PathCreated, 257);
});

Deno.test("Status - 300 series pending codes", () => {
  assertEquals(Status.UserOK, 331);
  assertEquals(Status.FileActionPending, 350);
});

Deno.test("Status - 400 series temporary error codes", () => {
  assertEquals(Status.ServiceNotAvailable, 421);
  assertEquals(Status.CannotOpenDataConnection, 425);
  assertEquals(Status.FileActionNotTaken, 450);
});

Deno.test("Status - 500 series permanent error codes", () => {
  assertEquals(Status.SyntaxErrorNotRecognised, 500);
  assertEquals(Status.SyntaxErrorParameters, 501);
  assertEquals(Status.CommandNotImplemented, 502);
  assertEquals(Status.NotLoggedIn, 530);
  assertEquals(Status.ActionNotTaken, 550);
});

// ============================================================================
// STATUS_TEXT tests
// ============================================================================

Deno.test("STATUS_TEXT - is a Map", () => {
  assertExists(STATUS_TEXT);
  assertEquals(STATUS_TEXT instanceof Map, true);
});

Deno.test("STATUS_TEXT - contains expected messages", () => {
  assertEquals(STATUS_TEXT.get(Status.OK), "OK");
  assertEquals(STATUS_TEXT.get(Status.ClosingControlConn), "Goodbye");
  assertEquals(STATUS_TEXT.get(Status.SystemType), "UNIX Type: L8");
  assertEquals(STATUS_TEXT.get(Status.UserLoggedIn), "Password ok, continue");
  assertEquals(STATUS_TEXT.get(Status.AuthAccepted), "AUTH command ok");
});

Deno.test("STATUS_TEXT - PASV messages", () => {
  assertEquals(STATUS_TEXT.get(Status.EnteringPASV), "Entering Passive Mode");
  assertEquals(STATUS_TEXT.get(Status.EnteringEPSV), "Entering Extended Passive Mode");
});

Deno.test("STATUS_TEXT - error messages exist", () => {
  assertExists(STATUS_TEXT.get(Status.ServiceNotAvailable));
  assertExists(STATUS_TEXT.get(Status.NotLoggedIn));
  assertExists(STATUS_TEXT.get(Status.CommandNotImplemented));
});

Deno.test("STATUS_TEXT - transfer messages", () => {
  assertEquals(STATUS_TEXT.get(Status.FileStatusOK), "Using transfer connection");
  assertEquals(STATUS_TEXT.get(Status.ClosingDataConn), "Closing transfer connection");
});
