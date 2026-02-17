/**
 * Tests for filesystem formatting functions (ls, mlsx) and FileSystem class
 */
import { assertEquals, assertStringIncludes, assertRejects, assert } from "@std/assert";
import { ls, mlsx } from "../src/server/filesystem.ts";
import type { FileInfo } from "../src/server/filesystem.ts";
import FileSystem from "../src/server/filesystem.ts";
import type { FileSystemOptions } from "../src/server/filesystem.ts";

// Helper to create mock FileInfo
function createMockFile(overrides: Partial<FileInfo> = {}): FileInfo {
  return {
    name: overrides.name ?? "test.txt",
    isFile: overrides.isFile ?? true,
    isDirectory: overrides.isDirectory ?? false,
    isSymlink: overrides.isSymlink ?? false,
    size: overrides.size ?? 1234,
    mtime: overrides.mtime ?? new Date("2026-02-17T12:00:00Z"),
    atime: overrides.atime ?? new Date("2026-02-17T12:00:00Z"),
    birthtime: overrides.birthtime ?? new Date("2026-01-01T00:00:00Z"),
    ctime: "ctime" in overrides ? (overrides.ctime as Date | null) : null,
    dev: overrides.dev ?? 1,
    ino: overrides.ino ?? 12345,
    mode: overrides.mode ?? 0o644,
    nlink: overrides.nlink ?? 1,
    uid: overrides.uid ?? 1000,
    gid: overrides.gid ?? 1000,
    rdev: overrides.rdev ?? 0,
    blksize: overrides.blksize ?? 4096,
    blocks: overrides.blocks ?? 8,
    isBlockDevice: overrides.isBlockDevice ?? false,
    isCharDevice: overrides.isCharDevice ?? false,
    isFifo: overrides.isFifo ?? false,
    isSocket: overrides.isSocket ?? false,
  } as FileInfo;
}

function createMockDir(overrides: Partial<FileInfo> = {}): FileInfo {
  return createMockFile({
    name: "mydir",
    isFile: false,
    isDirectory: true,
    size: 4096,
    mode: 0o755,
    ...overrides,
  });
}

// ============================================
// ls() tests - Unix-style listing format
// ============================================

Deno.test("ls - formats file correctly", () => {
  const file = createMockFile({ name: "document.pdf", size: 5678 });
  const result = ls(file);
  
  assertStringIncludes(result, "document.pdf");
  assertStringIncludes(result, "5678");
  // Should start with - for file
  assertEquals(result.startsWith("-"), true);
});

Deno.test("ls - formats directory correctly", () => {
  const dir = createMockDir({ name: "photos" });
  const result = ls(dir);
  
  assertStringIncludes(result, "photos");
  // Should start with d for directory
  assertEquals(result.startsWith("d"), true);
});

Deno.test("ls - includes permissions", () => {
  const file = createMockFile({ mode: 0o755 });
  const result = ls(file);
  
  // Should have rwx for owner
  assertStringIncludes(result, "rwx");
});

Deno.test("ls - includes uid and gid", () => {
  const file = createMockFile({ uid: 1000, gid: 1000 });
  const result = ls(file);
  
  assertStringIncludes(result, "1000");
});

// ============================================
// mlsx() tests - Machine-readable format (RFC 3659)
// ============================================

Deno.test("mlsx - formats file with type=file", () => {
  const file = createMockFile({ name: "readme.md" });
  const result = mlsx(file);
  
  assertStringIncludes(result, "type=file");
  assertStringIncludes(result, "readme.md");
});

Deno.test("mlsx - formats directory with type=dir", () => {
  const dir = createMockDir({ name: "src" });
  const result = mlsx(dir);
  
  assertStringIncludes(result, "type=dir");
  assertStringIncludes(result, "src");
});

Deno.test("mlsx - includes size", () => {
  const file = createMockFile({ size: 9999 });
  const result = mlsx(file);
  
  assertStringIncludes(result, "size=9999");
});

Deno.test("mlsx - includes modify timestamp in YYYYMMDDHHMMSS format", () => {
  const file = createMockFile({ mtime: new Date("2026-02-17T15:30:45Z") });
  const result = mlsx(file);
  
  // Should include modify=20260217153045
  assertStringIncludes(result, "modify=20260217153045");
});

Deno.test("mlsx - includes perm for file", () => {
  const file = createMockFile();
  const result = mlsx(file);
  
  assertStringIncludes(result, "perm=");
  // Files should have adfrw permissions
  assertStringIncludes(result, "perm=adfrw");
});

Deno.test("mlsx - includes perm for directory", () => {
  const dir = createMockDir();
  const result = mlsx(dir);
  
  assertStringIncludes(result, "perm=");
  // Directories should have cdeflmp permissions
  assertStringIncludes(result, "perm=cdeflmp");
});

Deno.test("mlsx - includes unique identifier when dev/ino available", () => {
  const file = createMockFile({ dev: 16, ino: 255 });
  const result = mlsx(file);
  
  // dev=16 (hex: 10), ino=255 (hex: ff)
  assertStringIncludes(result, "unique=10.ff");
});

Deno.test("mlsx - format ends with semicolon-space-filename", () => {
  const file = createMockFile({ name: "myfile.txt" });
  const result = mlsx(file);
  
  // Format should be "fact1;fact2;...; filename"
  assertEquals(result.endsWith("; myfile.txt"), true);
});

Deno.test("mlsx - handles file without mtime", () => {
  const file = createMockFile({ mtime: null as unknown as Date });
  const result = mlsx(file);
  
  // Should still work, using current date
  assertStringIncludes(result, "modify=");
  assertStringIncludes(result, "type=file");
});
// ============================================
// FileSystem class tests
// ============================================

// Mock Connection for FileSystem tests
function createMockFsConnection(): { options: { root: string }; otp: (n: number) => string } & Record<string, unknown> {
  return {
    options: { root: Deno.cwd() },
    otp: (len: number) => "test12345".slice(0, len),
  };
}

Deno.test("FileSystem - constructor initializes correctly", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 1000,
    gid: 1000,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  
  assertEquals(fs.root, Deno.cwd());
  // Root cwd is normalized to "/" or "\"
  assert(fs.currentDirectory() === "/" || fs.currentDirectory() === "\\");
  assertEquals(fs.uid, 1000);
  assertEquals(fs.gid, 1000);
});

Deno.test("FileSystem - currentDirectory returns cwd", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/subdir",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  // Path uses OS separator
  assertStringIncludes(fs.currentDirectory(), "subdir");
});

Deno.test("FileSystem - chdir changes directory", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  // src should exist
  await fs.chdir("src");
  assertStringIncludes(fs.currentDirectory(), "src");
});

Deno.test("FileSystem - chdir with absolute path", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/test",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  await fs.chdir("/src");
  assertStringIncludes(fs.currentDirectory(), "src");
});

Deno.test("FileSystem - get returns FileInfo for existing file", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const info = await fs.get("README.md");
  
  assertEquals(info.name, "README.md");
  assertEquals(info.isFile, true);
  assertEquals(info.isDirectory, false);
});

Deno.test("FileSystem - get throws for non-existent file", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  
  await assertRejects(
    async () => { await fs.get("nonexistent_file_12345.xyz"); },
    Deno.errors.NotFound
  );
});

Deno.test("FileSystem - list returns array of files", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const files = await fs.list(".");
  
  assert(Array.isArray(files));
  assert(files.length > 0);
  // Should have README.md
  const readmeFile = files.find(f => f.name === "README.md");
  assert(readmeFile !== undefined);
});

Deno.test("FileSystem - stat with ls formatter", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "test.txt" });
  const result = fs.stat(file, "ls");
  
  assert(result !== undefined);
  assertStringIncludes(result, "test.txt");
  assertEquals(result.startsWith("-"), true);
});

Deno.test("FileSystem - stat with mlsx formatter", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "data.json" });
  const result = fs.stat(file, "mlsx");
  
  assert(result !== undefined);
  assertStringIncludes(result, "type=file");
  assertStringIncludes(result, "data.json");
});

Deno.test("FileSystem - stat with custom function", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "custom.txt", size: 100 });
  
  const customFormatter = (f: FileInfo) => `CUSTOM: ${f.name} (${f.size})`;
  const result = fs.stat(file, customFormatter);
  
  assertEquals(result, "CUSTOM: custom.txt (100)");
});

Deno.test("FileSystem - access returns boolean", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  // Root user (uid=0) should have access
  const hasAccess = await fs.access(Deno.cwd());
  assertEquals(hasAccess, true);
});

Deno.test("FileSystem - access returns false for non-existent path", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 1000,
    gid: 1000,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const hasAccess = await fs.access("/nonexistent/path/12345");
  assertEquals(hasAccess, false);
});

Deno.test("FileSystem - own returns uid/gid", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 1000,
    gid: 1000,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const result = await fs.own();
  
  assertEquals(typeof result.uid, "number");
  assertEquals(typeof result.gid, "number");
});

Deno.test("FileSystem - _resolvePath handles relative paths", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/test",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const resolved = fs._resolvePath("subdir");
  
  // Path uses OS separator
  assertStringIncludes(resolved.clientPath, "test");
  assertStringIncludes(resolved.clientPath, "subdir");
});

Deno.test("FileSystem - _resolvePath handles absolute paths", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/test",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const resolved = fs._resolvePath("/other");
  
  // Path uses OS separator  
  assertStringIncludes(resolved.clientPath, "other");
});

Deno.test("FileSystem - list on src directory", async () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const files = await fs.list("src");
  
  assert(Array.isArray(files));
  // Should have _utils, server, cli, db directories
  const dirNames = files.map(f => f.name);
  assert(dirNames.includes("server") || dirNames.includes("_utils"));
});

Deno.test("FileSystem - renameFrom is initialized empty", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  assertEquals(fs.renameFrom, "");
});

Deno.test("FileSystem - root getter returns correct path", () => {
  const mockConn = createMockFsConnection();
  const testRoot = "d:\\test\\path";
  const opts: FileSystemOptions = {
    root: testRoot,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  // root is resolved, so check it contains the test path
  assertStringIncludes(fs.root, "test");
});

Deno.test("FileSystem - getUniqueName returns unique string", () => {
  const mockConn = createMockFsConnection();
  const opts: FileSystemOptions = {
    root: Deno.cwd(),
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const name1 = fs.getUniqueName();
  const name2 = fs.getUniqueName();
  
  // Should be non-empty strings
  assert(name1.length > 0);
  assert(name2.length > 0);
  // Should be different
  assert(name1 !== name2);
});

Deno.test({
  name: "FileSystem - mkdir creates directory",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  fn: async () => {
    const mockConn = createMockFsConnection();
    const tempDir = await Deno.makeTempDir();
    const opts: FileSystemOptions = {
      root: tempDir,
      cwd: "/",
      uid: 0,
      gid: 0,
    };
    
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
    const result = await fs.mkdir("testdir");
    
    assertStringIncludes(result, "testdir");
    
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test({
  name: "FileSystem - write creates file",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  fn: async () => {
    const mockConn = createMockFsConnection();
    const tempDir = await Deno.makeTempDir();
    const opts: FileSystemOptions = {
      root: tempDir,
      cwd: "/",
      uid: 0,
      gid: 0,
    };
  
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
    const encoder = new TextEncoder();
    await fs.write("test.txt", encoder.encode("Hello FTP"));
  
    // Verify file exists
    const content = await Deno.readTextFile(`${tempDir}/test.txt`);
    assertEquals(content, "Hello FTP");
  
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test({
  name: "FileSystem - write with append",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  fn: async () => {
    const mockConn = createMockFsConnection();
    const tempDir = await Deno.makeTempDir();
    const opts: FileSystemOptions = {
      root: tempDir,
      cwd: "/",
      uid: 0,
      gid: 0,
    };
  
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
    const encoder = new TextEncoder();
  
    await fs.write("test.txt", encoder.encode("Hello"));
    await fs.write("test.txt", encoder.encode(" World"), { append: true });
  
    const content = await Deno.readTextFile(`${tempDir}/test.txt`);
    assertEquals(content, "Hello World");
  
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test("FileSystem - read returns stream", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  // Create test file
  await Deno.writeTextFile(`${tempDir}/read.txt`, "Test content");
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const result = await fs.read("read.txt");
  
  assert(result.stream !== undefined);
  assertStringIncludes(result.clientPath, "read.txt");
  
  // Close the stream
  result.stream.close();
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - delete removes file", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  // Create test file
  await Deno.writeTextFile(`${tempDir}/todelete.txt`, "Delete me");
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  await fs.delete("todelete.txt");
  
  // Verify file is gone
  await assertRejects(
    async () => { await Deno.stat(`${tempDir}/todelete.txt`); },
    Deno.errors.NotFound
  );
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - rename moves file", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  // Create test file
  await Deno.writeTextFile(`${tempDir}/old.txt`, "Rename me");
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  await fs.rename("old.txt", "new.txt");
  
  // Verify old file is gone
  await assertRejects(
    async () => { await Deno.stat(`${tempDir}/old.txt`); },
    Deno.errors.NotFound
  );
  
  // Verify new file exists
  const content = await Deno.readTextFile(`${tempDir}/new.txt`);
  assertEquals(content, "Rename me");
  
  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});