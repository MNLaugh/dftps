/**
 * Tests for FTP command classes - static properties and structure
 * Note: We import via REGISTRY to avoid circular dependency issues with FEAT
 */
import { assertEquals, assertExists } from "@std/assert";
import { findCommand } from "../src/server/commands/_REGISTRY.ts";

// Get commands from REGISTRY using findCommand to avoid circular imports
const AUTH = findCommand("AUTH")!;
const USER = findCommand("USER")!;
const PASS = findCommand("PASS")!;
const PWD = findCommand("PWD")!;
const SYST = findCommand("SYST")!;
const FEAT = findCommand("FEAT")!;
const QUIT = findCommand("QUIT")!;
const LIST = findCommand("LIST")!;
const CWD = findCommand("CWD")!;
const MKD = findCommand("MKD")!;
const RMD = findCommand("RMD")!;
const DELE = findCommand("DELE")!;
const RETR = findCommand("RETR")!;
const STOR = findCommand("STOR")!;
const TYPE = findCommand("TYPE")!;
const PASV = findCommand("PASV")!;
const PORT = findCommand("PORT")!;
const MLSD = findCommand("MLSD")!;
const MLST = findCommand("MLST")!;
const MFMT = findCommand("MFMT")!;
const MDTM = findCommand("MDTM")!;
const REST = findCommand("REST")!;

// ============================================================================
// AUTH command tests
// ============================================================================

Deno.test("AUTH - has correct directive", () => {
  assertEquals(AUTH.directive, "AUTH");
});

Deno.test("AUTH - has syntax", () => {
  assertEquals(AUTH.syntax, "{{cmd}} <type>");
});

Deno.test("AUTH - has description", () => {
  assertExists(AUTH.description);
});

Deno.test("AUTH - allows unauthenticated access", () => {
  assertEquals(AUTH.flags.noAuth, true);
});

Deno.test("AUTH - announces in FEAT", () => {
  assertEquals(AUTH.flags.feat, "AUTH TLS SSL");
});

// ============================================================================
// USER command tests
// ============================================================================

Deno.test("USER - has correct directive", () => {
  assertEquals(USER.directive, "USER");
});

Deno.test("USER - has syntax with username", () => {
  assertEquals(USER.syntax, "{{cmd}} <username>");
});

Deno.test("USER - allows unauthenticated access", () => {
  assertEquals(USER.flags.noAuth, true);
});

// ============================================================================
// PASS command tests
// ============================================================================

Deno.test("PASS - has correct directive", () => {
  assertEquals(PASS.directive, "PASS");
});

Deno.test("PASS - has syntax with password", () => {
  assertEquals(PASS.syntax, "{{cmd}} <password>");
});

Deno.test("PASS - allows unauthenticated access", () => {
  assertEquals(PASS.flags.noAuth, true);
});

// ============================================================================
// PWD command tests
// ============================================================================

Deno.test("PWD - has correct directive with alias", () => {
  assertEquals(PWD.directive, ["PWD", "XPWD"]);
});

Deno.test("PWD - has description", () => {
  assertEquals(PWD.description, "Print current working directory");
});

// ============================================================================
// SYST command tests
// ============================================================================

Deno.test("SYST - has correct directive", () => {
  assertEquals(SYST.directive, "SYST");
});

Deno.test("SYST - returns system type", () => {
  assertEquals(SYST.description, "Return system type");
});

Deno.test("SYST - allows unauthenticated", () => {
  assertEquals(SYST.flags.noAuth, true);
});

// ============================================================================
// FEAT command tests
// ============================================================================

Deno.test("FEAT - has correct directive", () => {
  assertEquals(FEAT.directive, "FEAT");
});

Deno.test("FEAT - allows unauthenticated", () => {
  assertEquals(FEAT.flags.noAuth, true);
});

// ============================================================================
// QUIT command tests
// ============================================================================

Deno.test("QUIT - has correct directive", () => {
  assertEquals(QUIT.directive, "QUIT");
});

Deno.test("QUIT - has empty flags", () => {
  assertEquals(Object.keys(QUIT.flags).length, 0);
});

// ============================================================================
// LIST command tests
// ============================================================================

Deno.test("LIST - has correct directive with alias", () => {
  assertEquals(LIST.directive, ["LIST", "NLST"]);
});

Deno.test("LIST - has syntax", () => {
  assertExists(LIST.syntax);
});

// ============================================================================
// CWD command tests
// ============================================================================

Deno.test("CWD - has correct directive with alias", () => {
  assertEquals(CWD.directive, ["CWD", "XCWD"]);
});

Deno.test("CWD - changes directory", () => {
  assertEquals(CWD.description, "Change working directory");
});

// ============================================================================
// MKD command tests
// ============================================================================

Deno.test("MKD - has correct directive with alias", () => {
  assertEquals(MKD.directive, ["MKD", "XMKD"]);
});

Deno.test("MKD - creates directory", () => {
  assertEquals(MKD.description, "Make directory");
});

// ============================================================================
// RMD command tests
// ============================================================================

Deno.test("RMD - has correct directive with alias", () => {
  assertEquals(RMD.directive, ["RMD", "XRMD"]);
});

Deno.test("RMD - removes directory", () => {
  assertEquals(RMD.description, "Remove a directory");
});

// ============================================================================
// DELE command tests
// ============================================================================

Deno.test("DELE - has correct directive", () => {
  assertEquals(DELE.directive, "DELE");
});

Deno.test("DELE - deletes file", () => {
  assertEquals(DELE.description, "Delete file");
});

// ============================================================================
// RETR command tests
// ============================================================================

Deno.test("RETR - has correct directive", () => {
  assertEquals(RETR.directive, "RETR");
});

Deno.test("RETR - retrieves file", () => {
  assertEquals(RETR.description, "Retrieve a copy of the file");
});

// ============================================================================
// STOR command tests
// ============================================================================

Deno.test("STOR - has correct directive with alias", () => {
  assertEquals(STOR.directive, ["STOR", "APPE"]);
});

Deno.test("STOR - stores file", () => {
  assertEquals(STOR.description, "Store data as a file at the server");
});

// ============================================================================
// TYPE command tests
// ============================================================================

Deno.test("TYPE - has correct directive", () => {
  assertEquals(TYPE.directive, "TYPE");
});

Deno.test("TYPE - sets transfer type", () => {
  assertEquals(TYPE.description, "Set the transfer mode, binary (I) or ascii (A)");
});

Deno.test("TYPE - announces in FEAT", () => {
  assertEquals(TYPE.flags.feat, "TYPE A,I,L");
});

// ============================================================================
// PASV command tests
// ============================================================================

Deno.test("PASV - has correct directive", () => {
  assertEquals(PASV.directive, "PASV");
});

Deno.test("PASV - enters passive mode", () => {
  assertEquals(PASV.description, "Initiate passive mode");
});

// ============================================================================
// PORT command tests
// ============================================================================

Deno.test("PORT - has correct directive", () => {
  assertEquals(PORT.directive, "PORT");
});

Deno.test("PORT - active mode", () => {
  assertEquals(PORT.description, "Specifies an address and port to which the server should connect");
});

// ============================================================================
// MLSD command tests (RFC 3659)
// ============================================================================

Deno.test("MLSD - has correct directive", () => {
  assertEquals(MLSD.directive, "MLSD");
});

Deno.test("MLSD - machine listing", () => {
  assertEquals(MLSD.description, "Returns directory listing in machine-readable format (RFC 3659)");
});

Deno.test("MLSD - announces in FEAT", () => {
  assertEquals(MLSD.flags.feat, "MLSD");
});

// ============================================================================
// MLST command tests (RFC 3659)
// ============================================================================

Deno.test("MLST - has correct directive", () => {
  assertEquals(MLST.directive, "MLST");
});

Deno.test("MLST - machine listing single", () => {
  assertEquals(MLST.description, "Returns file/directory info in machine-readable format (RFC 3659)");
});

Deno.test("MLST - announces in FEAT", () => {
  assertEquals(MLST.flags.feat, "MLST type*;size*;modify*;perm*;unique*;");
});

// ============================================================================
// MFMT command tests
// ============================================================================

Deno.test("MFMT - has correct directive", () => {
  assertEquals(MFMT.directive, "MFMT");
});

Deno.test("MFMT - modifies time", () => {
  assertEquals(MFMT.description, "Modify the last modification time of a file");
});

Deno.test("MFMT - announces in FEAT", () => {
  assertEquals(MFMT.flags.feat, "MFMT");
});

// ============================================================================
// MDTM command tests
// ============================================================================

Deno.test("MDTM - has correct directive", () => {
  assertEquals(MDTM.directive, "MDTM");
});

Deno.test("MDTM - gets modification time", () => {
  assertEquals(MDTM.description, "Return the last-modified time of a specified file");
});

Deno.test("MDTM - announces in FEAT", () => {
  assertEquals(MDTM.flags.feat, "MDTM");
});

// ============================================================================
// REST command tests
// ============================================================================

Deno.test("REST - has correct directive", () => {
  assertEquals(REST.directive, "REST");
});

Deno.test("REST - restart transfer", () => {
  assertEquals(REST.description, "Restart transfer from the specified point. Resets after any STORE or RETRIEVE");
});

Deno.test("REST - announces in FEAT", () => {
  assertEquals(REST.flags.feat, "REST STREAM");
});
