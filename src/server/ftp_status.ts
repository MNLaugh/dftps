/**
 * FTP Status codes and messages
 *
 * Defines FTP response codes as per RFC 959, RFC 2228, and RFC 2428.
 *
 * @module
 */

/**
 * FTP status codes enum
 *
 * Standard FTP response codes as documented by:
 * - RFC 959 - File Transfer Protocol
 * - RFC 2428 - FTP Extensions for IPv6 and NATs
 * - RFC 2228 - FTP Security Extensions
 */
export enum Status {
  // 100 Series - The requested action is being initiated, expect another reply before
  // proceeding with a new command.
  FileStatusOK = 150, // RFC 959, 4.2.1

  // 200 Series - The requested action has been successfully completed.
  OK = 200, // RFC 959, 4.2.1
  NotImplemented = 202, // RFC 959, 4.2.1
  SystemStatus = 211, // RFC 959, 4.2.1
  DirectoryStatus = 212, // RFC 959, 4.2.1
  FileStatus = 213, // RFC 959, 4.2.1
  HelpMessage = 214, // RFC 959, 4.2.1
  SystemType = 215, // RFC 959, 4.2.1
  ServiceReady = 220, // RFC 959, 4.2.1
  ClosingControlConn = 221, // RFC 959, 4.2.1
  ClosingDataConn = 226, // RFC 959, 4.2.1
  EnteringPASV = 227, // RFC 959, 4.2.1
  EnteringEPSV = 229, // RFC 2428, 3
  UserLoggedIn = 230, // RFC 959, 4.2.1
  AuthAccepted = 234, // RFC 2228, 3
  FileOK = 250, // RFC 959, 4.2.1
  PathCreated = 257, // RFC 959, 4.2.1

  // 300 Series - The command has been accepted, but the requested action is on hold,
  // pending receipt of further information.
  UserOK = 331, // RFC 959, 4.2.1
  FileActionPending = 350, // RFC 959, 4.2.1

  // 400 Series - The command was not accepted and the requested action did not take place,
  // but the error condition is temporary and the action may be requested again.
  ServiceNotAvailable = 421, // RFC 959, 4.2.1
  CannotOpenDataConnection = 425, // RFC 959, 4.2.1
  FileActionNotTaken = 450, // RFC 959, 4.2.1

  // 500 Series - Syntax error, command unrecognized and the requested action did not take
  // place. This may include errors such as command line too long.
  SyntaxErrorNotRecognised = 500, // RFC 959, 4.2.1
  SyntaxErrorParameters = 501, // RFC 959, 4.2.1
  CommandNotImplemented = 502, // RFC 959, 4.2.1
  NotLoggedIn = 530, // RFC 959, 4.2.1
  ActionNotTaken = 550, // RFC 959, 4.2.1
}

export const STATUS_TEXT: Map<number, string> = new Map<number, string>([
  [Status.FileStatusOK, "Using transfer connection"],
  [Status.OK, "OK"],
  [Status.NotImplemented, "Not Implemented"],
  [Status.SystemStatus, "System status"],
  //[Status.DirectoryStatus, "Directory status"],
  [Status.FileStatus, "Server status"],
  //[Status.HelpMessage, "Help message"],
  [Status.SystemType, "UNIX Type: L8"],
  //[Status.ServiceReady, "Custom message"],
  [Status.ClosingControlConn, "Goodbye"],
  [Status.ClosingDataConn, "Closing transfer connection"],
  [Status.EnteringPASV, "Entering Passive Mode"],
  [Status.EnteringEPSV, "Entering Extended Passive Mode"],
  [Status.UserLoggedIn, "Password ok, continue"],
  [Status.AuthAccepted, "AUTH command ok"],
  [Status.FileOK, "Done !"],
  [Status.PathCreated, "Created dir"],
  [Status.UserOK, "OK"],
  [Status.FileActionPending, "OK"],
  [Status.ServiceNotAvailable, "Service not available"],
  [Status.CannotOpenDataConnection, "Error"],
  [Status.FileActionNotTaken, "Could not STAT"],
  //[Status.SyntaxErrorNotRecognised, "Not understood"],
  [Status.SyntaxErrorParameters, "bad command"],
  [Status.CommandNotImplemented, "This extension hasn't been implemented !"],
  [Status.NotLoggedIn, "I can't deal with yo"],
  //[Status.ActionNotTaken, "Error"],
]);
