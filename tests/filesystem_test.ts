/**
 * Tests for filesystem formatting functions (ls, mlsx) and FileSystem class
 */
import { assertEquals, assertStringIncludes, assertRejects, assert, assertExists } from "@std/assert";
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

// ============================================
// Additional FileSystem tests
// ============================================

Deno.test("FileSystem - getUniqueName returns unique UUIDs", () => {
  const mockConn = createMockFsConnection();
  const tempDir = Deno.makeTempDirSync();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  
  const names = new Set<string>();
  for (let i = 0; i < 10; i++) {
    names.add(fs.getUniqueName());
  }
  
  // All names should be unique
  assertEquals(names.size, 10);
  
  // Names should only contain alphanumeric characters (no dashes)
  for (const name of names) {
    assertEquals(/^[a-f0-9]+$/i.test(name), true);
  }
  
  Deno.removeSync(tempDir, { recursive: true });
});

Deno.test("FileSystem - access returns true for root user", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0, // root
    gid: 0, // root
  };
  
  await Deno.writeTextFile(`${tempDir}/access.txt`, "test");
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const hasAccess = await fs.access(`${tempDir}/access.txt`);
  
  assertEquals(hasAccess, true);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - access returns false for non-existent file", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 1000,
    gid: 1000,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const hasAccess = await fs.access(`${tempDir}/nonexistent.txt`);
  
  assertEquals(hasAccess, false);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - own returns uid and gid", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 1000,
    gid: 1000,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const ownership = await fs.own();
  
  assertEquals(ownership.uid, 1000);
  assertEquals(ownership.gid, 1000);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with custom function formatter", () => {
  const mockConn = createMockFsConnection();
  const tempDir = Deno.makeTempDirSync();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "custom.txt" });
  
  const customFormatter = (f: FileInfo) => `CUSTOM:${f.name}`;
  const result = fs.stat(file, customFormatter);
  
  assertEquals(result, "CUSTOM:custom.txt");
  
  Deno.removeSync(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with custom function that returns empty", () => {
  const mockConn = createMockFsConnection();
  const tempDir = Deno.makeTempDirSync();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "empty.txt" });
  
  const emptyFormatter = () => "";
  const result = fs.stat(file, emptyFormatter);
  
  // If formatter returns falsy, stat returns undefined
  assertEquals(result, undefined);
  
  Deno.removeSync(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with ep formatter", () => {
  const mockConn = createMockFsConnection();
  const tempDir = Deno.makeTempDirSync();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ 
    name: "eptest.txt",
    dev: 1,
    ino: 12345,
    size: 100,
    mtime: new Date("2024-01-01"),
    mode: 0o644
  });
  
  const result = fs.stat(file, "ep");
  
  assert(result !== undefined);
  assertStringIncludes(result, "eptest.txt");
  assertStringIncludes(result, "+"); // EP format starts with +
  assertStringIncludes(result, "s100"); // size
  assertStringIncludes(result, "r"); // file indicator
});

Deno.test("FileSystem - stat with unknown formatter throws", () => {
  const mockConn = createMockFsConnection();
  const tempDir = Deno.makeTempDirSync();
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  const file = createMockFile({ name: "test.txt" });
  
  try {
    fs.stat(file, "unknown_formatter");
    // Should have thrown
    assertEquals(true, false);
  } catch (e) {
    assertStringIncludes((e as Error).message, "Bad file stat formatter");
  }
  
  Deno.removeSync(tempDir, { recursive: true });
});

Deno.test("FileSystem - chdir with non-existent path throws NotFound", async () => {
  const mockConn = createMockFsConnection();
  const tempDir = await Deno.makeTempDir();
  await Deno.mkdir(`${tempDir}/subdir`);
  const opts: FileSystemOptions = {
    root: tempDir,
    cwd: "/",
    uid: 0,
    gid: 0,
  };
  
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, opts);
  
  // Try to chdir to a non-existent path - should throw NotFound
  await assertRejects(
    async () => { await fs.chdir("/nonexistent"); },
    Deno.errors.NotFound
  );
  
  await Deno.remove(tempDir, { recursive: true });
});

// ============================================
// ls() additional tests
// ============================================

Deno.test("ls - handles file without mode", () => {
  const file: FileInfo = {
    ...createMockFile({ name: "nomode.txt" }),
    mode: null as unknown as number,
  };
  const result = ls(file);
  
  // Should use default permissions -rwxr-xr-x
  assertStringIncludes(result, "-rwxr-xr-x");
});

Deno.test("ls - handles directory without mode", () => {
  const file: FileInfo = {
    ...createMockDir({ name: "nomodedir" }),
    mode: null as unknown as number,
  };
  const result = ls(file);
  
  // Should use default directory permissions drwxr-xr-x
  assertStringIncludes(result, "drwxr-xr-x");
});

Deno.test("ls - handles old file (> 6 months) shows year not time", () => {
  const oldDate = new Date();
  oldDate.setFullYear(oldDate.getFullYear() - 1);
  
  const file = createMockFile({ name: "oldfile.txt", mtime: oldDate });
  const result = ls(file);
  
  // Should include year for old files
  assertStringIncludes(result, String(oldDate.getFullYear()));
});

Deno.test("ls - handles file without mtime", () => {
  const file = createMockFile({ name: "nomtime.txt", mtime: null });
  const result = ls(file);
  
  assertStringIncludes(result, "nomtime.txt");
});

Deno.test("ls - handles file without uid/gid", () => {
  const file = createMockFile({ name: "nouid.txt", uid: null, gid: null });
  const result = ls(file);
  
  // Should use default uid/gid = 1
  assertStringIncludes(result, " 1 ");
});

// ============================================================================
// FileSystem write tests
// ============================================================================

Deno.test({
  name: "FileSystem - write creates new file",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    const data = new TextEncoder().encode("Hello World");
    await fs.write("test.txt", data);
    
    const content = await Deno.readTextFile(`${tempDir}/test.txt`);
    assertEquals(content, "Hello World");
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test({
  name: "FileSystem - write with append",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    // Write initial content
    await Deno.writeTextFile(`${tempDir}/append.txt`, "Initial ");
    
    // Append
    const data = new TextEncoder().encode("Appended");
    await fs.write("append.txt", data, { append: true });
    
    const content = await Deno.readTextFile(`${tempDir}/append.txt`);
    assertEquals(content, "Initial Appended");
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

// ============================================================================
// FileSystem mkdir tests
// ============================================================================

Deno.test({
  name: "FileSystem - mkdir creates directory",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    await fs.mkdir("newdir");
    
    const stat = await Deno.stat(`${tempDir}/newdir`);
    assertEquals(stat.isDirectory, true);
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

// ============================================================================
// FileSystem delete tests
// ============================================================================

Deno.test({
  name: "FileSystem - delete removes directory",
  ignore: Deno.build.os === "windows", // May have permission issues
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    // Create a directory
    await Deno.mkdir(`${tempDir}/toremove`);
    
    await fs.delete("toremove");
    
    const exists = await Deno.stat(`${tempDir}/toremove`).catch(() => null);
    assertEquals(exists, null);
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

// ============================================================================
// FileSystem chdir edge cases
// ============================================================================

Deno.test({
  name: "FileSystem - chdir to file falls back to parent",
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    // Create a file
    await Deno.writeTextFile(`${tempDir}/afile.txt`, "content");
    
    // chdir to a file will fall back to parent (/) due to the catch logic
    const result = await fs.chdir("afile.txt");
    // Should fall back to root - could be / or \\ on Windows
    assertStringIncludes(result, fs.cwd.slice(0, 1)); // Just check it returns something starting with separator
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test({
  name: "FileSystem - chdir with .. navigates up",
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    // Create subdirectory
    await Deno.mkdir(`${tempDir}/subdir`);
    
    // Go into subdirectory
    await fs.chdir("subdir");
    // On Windows can be \subdir, on Unix /subdir
    assertStringIncludes(fs.cwd, "subdir");
    
    // Go back up
    await fs.chdir("..");
    // CWD should be root (/ or \\)
    assertEquals(fs.cwd.length, 1);
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

// ============================================================================
// FileSystem own edge cases
// ============================================================================

Deno.test({
  name: "FileSystem - own uses stat uid when uid is 0",
  ignore: Deno.build.os === "windows", // uid/gid not available on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    const { uid, gid } = await fs.own();
    
    // uid=0 means use stat value
    assertExists(uid);
    assertExists(gid);
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

// ============================================================================
// FileSystem utime tests
// ============================================================================

Deno.test("FileSystem - utime modifies file mtime", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  // Create a file
  await Deno.writeTextFile(`${tempDir}/timefile.txt`, "content");
  
  const newTime = new Date("2025-01-01T00:00:00Z");
  await fs.utime("timefile.txt", newTime);
  
  const stat = await Deno.stat(`${tempDir}/timefile.txt`);
  assertEquals(stat.mtime!.getTime(), newTime.getTime());
  
  await Deno.remove(tempDir, { recursive: true });
});

// ============================================================================
// FileSystem edge cases for uncovered branches
// ============================================================================

Deno.test("FileSystem - constructor uses Deno.cwd when root is empty", () => {
  const mockConn = createMockFsConnection();
  // Pass empty string for root to trigger `root || Deno.cwd()`
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: "", uid: 1000, gid: 1000 });
  
  assertEquals(fs.root, Deno.cwd());
});

Deno.test("FileSystem - stat with custom function formatter", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const fileInfo = await fs.get("test.txt");
  
  // Custom formatter function
  const result = fs.stat(fileInfo, (stat) => `custom:${stat.name}`);
  assertEquals(result, "custom:test.txt");
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with function returning empty triggers fallback", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const fileInfo = await fs.get("test.txt");
  
  // Function returning empty string - should return undefined/falsy
  const result = fs.stat(fileInfo, () => "");
  assertEquals(result, undefined);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with invalid format type returns empty", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const fileInfo = await fs.get("test.txt");
  
  // Pass a number (neither string nor function) - triggers else return ""
  // deno-lint-ignore no-explicit-any
  const result = fs.stat(fileInfo, 123 as any);
  assertEquals(result, "");
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with unknown string format throws", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const fileInfo = await fs.get("test.txt");
  
  // Unknown format string should throw
  try {
    fs.stat(fileInfo, "unknown_format");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Bad file stat formatter");
  }
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - stat with throwing function rethrows", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const fileInfo = await fs.get("test.txt");
  
  // Function that throws
  try {
    fs.stat(fileInfo, () => { throw new Error("Custom error"); });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Custom error");
  }
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - access returns true for root user (uid=0)", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  // uid=0 means root, should always have access
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 1000 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const result = await fs.access(`${tempDir}/test.txt`);
  assertEquals(result, true);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - access returns true for root group (gid=0)", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  // gid=0 means root group, should always have access
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 1000, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/test.txt`, "content");
  const result = await fs.access(`${tempDir}/test.txt`);
  assertEquals(result, true);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - access returns false for non-existent file", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 1000, gid: 1000 });
  
  const result = await fs.access(`${tempDir}/nonexistent.txt`);
  assertEquals(result, false);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - own uses uid from instance when set", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 1234, gid: 5678 });
  
  const { uid, gid } = await fs.own();
  assertEquals(uid, 1234);
  assertEquals(gid, 5678);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - get throws NotFound for missing file", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await assertRejects(
    async () => await fs.get("nonexistent.txt"),
    Deno.errors.NotFound,
  );
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test({
  name: "FileSystem - write creates new file with chown",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    await fs.write("newfile.txt", new TextEncoder().encode("content"));
    
    const content = await Deno.readTextFile(`${tempDir}/newfile.txt`);
    assertEquals(content, "content");
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test({
  name: "FileSystem - write appends to existing file",
  ignore: Deno.build.os === "windows", // chown not supported on Windows
  async fn() {
    const tempDir = await Deno.makeTempDir();
    const mockConn = createMockFsConnection();
    const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
    
    await Deno.writeTextFile(`${tempDir}/append.txt`, "hello");
    await fs.write("append.txt", new TextEncoder().encode(" world"), { append: true });
    
    const content = await Deno.readTextFile(`${tempDir}/append.txt`);
    assertEquals(content, "hello world");
    
    await Deno.remove(tempDir, { recursive: true });
  },
});

Deno.test("FileSystem - read returns StreamFile", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/readable.txt`, "content");
  
  const result = await fs.read("readable.txt");
  assertExists(result.stream);
  assertExists(result.clientPath);
  
  result.stream.close();
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("FileSystem - list returns files in directory", async () => {
  const tempDir = await Deno.makeTempDir();
  const mockConn = createMockFsConnection();
  const fs = new FileSystem(mockConn as unknown as import("../src/server/connection.ts").default, { root: tempDir, uid: 0, gid: 0 });
  
  await Deno.writeTextFile(`${tempDir}/file1.txt`, "a");
  await Deno.writeTextFile(`${tempDir}/file2.txt`, "b");
  
  const files = await fs.list();
  assertEquals(files.length, 2);
  
  await Deno.remove(tempDir, { recursive: true });
});