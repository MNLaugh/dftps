import { DPath, exists, format, v4 } from "../../deps.ts";
import { SEPARATOR as SEP } from "@std/path";
import { padStart } from "../_utils/lodash.ts";
import Connection from "./connection.ts";

export type FileSystemOptions = {
  root: string;
  cwd?: string;
  uid: number;
  gid: number;
};

export type statFunction = (fileStat: FileInfo) => string;
export type FileInfo = Deno.FileInfo & { name: string };

export type StreamFile = {
  stream: Deno.FsFile;
  clientPath: string;
};

type ResolvedPath = {
  clientPath: string;
  fsPath: string;
};

export default class FileSystem {
  connection: Connection;
  cwd: string;
  private _root: string;
  uid: number;
  gid: number;

  renameFrom = "";

  constructor(connection: Connection, { cwd, root, uid, gid }: FileSystemOptions) {
    this.connection = connection;
    this.cwd = DPath.normalize(cwd ? DPath.join(SEP, cwd) : SEP);
    this._root = DPath.resolve(root || Deno.cwd());
    this.uid = uid;
    this.gid = gid;
  }

  get root() {
    return this._root;
  }

  async access(path: string): Promise<boolean> {
    try {
      const stat = await Deno.stat(path);
      return (this.uid === 0 || this.gid === 0 || this.uid === stat.uid || this.gid === stat.gid);
    } catch (_) {
      return false;
    }
  }

  async own(): Promise<{ uid: number | null; gid: number | null }> {
    try {
      const stat = await Deno.stat(this._root);
      const uid = (this.uid) ? this.uid : stat.uid;
      const gid = (this.gid) ? this.gid : stat.uid;
      return { uid, gid };
    } catch (e) {
      throw e;
    }
  }

  _resolvePath(path = "."): ResolvedPath {
    const normalPath = DPath.normalize(path);
    const clientPath = (DPath.isAbsolute(normalPath)) ? path : DPath.join(this.cwd, normalPath);
    const fsPath = DPath.resolve(DPath.normalize(DPath.join(this.root, clientPath)));
    return { clientPath, fsPath };
  }

  currentDirectory() {
    return this.cwd;
  }

  async get(fileName: string): Promise<FileInfo> {
    const { fsPath } = this._resolvePath(fileName);
    try {
      const stat = await Deno.stat(fsPath);
      return Object.assign(stat, { name: fileName });
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        throw new Deno.errors.NotFound(`No such following file or directory "${fsPath}" `);
      }
      throw e;
    }
  }

  private FORMATS: Record<string, statFunction> = { ls, ep, mlsx };
  stat(fileStat: FileInfo, format: string | statFunction = "ls") {
    if (typeof format === "function") {
      try {
        const result = format(fileStat);
        if (result) return result;
      } catch (e) {
        throw e;
      }
    } else if (typeof format === "string") {
      if (typeof this.FORMATS[format] === "undefined") throw new Error("Bad file stat formatter");
      return this.FORMATS[format](fileStat);
    } else return "";
  }

  async list(path = ".") {
    const { fsPath } = this._resolvePath(path);
    const files = [];
    try {
      for await (const dirEntry of Deno.readDir(fsPath)) {
        const fileName = dirEntry.name;
        const filePath = DPath.join(fsPath, fileName);
        const hasAccess = await this.access(filePath);
        const stat = await Deno.stat(filePath);
        if (hasAccess) files.push(Object.assign(stat, { name: fileName }));
      }
      return files;
    } catch (e) {
      throw e;
    }
  }

  async chdir(path = "."): Promise<string> {
    const { fsPath, clientPath } = this._resolvePath(path);
    try {
      const FileInfo = await Deno.stat(fsPath);
      if (!FileInfo.isDirectory) throw new Error("Not a valid directory");
      this.cwd = clientPath;
      return this.cwd;
    } catch (_) {
      if (_ instanceof Deno.errors.NotFound) {
        throw new Deno.errors.NotFound(`No such following file or directory "${fsPath}" `);
      }
      const poped = path.split("/");
      poped.pop();
      return this.chdir(poped.join("/"));
    }
  }

  async write(fileName: string, data: Uint8Array, { append = false } = {}): Promise<void> {
    const { fsPath } = this._resolvePath(fileName);
    try {
      if (await exists(fsPath)) {
        const access = this.access(fsPath);
        if (!access) throw new Error("You don't have permissions!");
      }
      let chown = false;
      if (!await exists(fsPath)) chown = true;
      await Deno.writeFile(fsPath, data, { append });
      if (chown) await this.chown(fsPath);
    } catch (e) {
      throw e;
    }
  }

  async read(fileName: string): Promise<StreamFile> {
    const { fsPath, clientPath } = this._resolvePath(fileName);
    const access = this.access(fsPath);
    if (!access) throw new Error("You don't have permissions!");
    try {
      const stream = await Deno.open(fsPath, { read: true });
      return { stream, clientPath };
    } catch (e) {
      throw e;
    }
  }

  async delete(path: string): Promise<void> {
    const { fsPath } = this._resolvePath(path);
    const access = this.access(fsPath);
    if (!access) throw new Error("You don't have permissions!");
    try {
      return await Deno.remove(fsPath, { recursive: true });
    } catch (e) {
      throw e;
    }
  }

  async mkdir(path: string): Promise<string> {
    const { fsPath } = this._resolvePath(path);
    try {
      await Deno.mkdir(fsPath, { recursive: true });
      await this.chown(fsPath);
      return fsPath;
    } catch (e) {
      throw e;
    }
  }

  async rename(from: string, to: string) {
    const { fsPath: fromPath } = this._resolvePath(from);
    const { fsPath: toPath } = this._resolvePath(to);
    const access = this.access(fromPath);
    if (!access) throw new Error("You don't have permissions!");
    try {
      return await Deno.rename(fromPath, toPath);
    } catch (e) {
      throw e;
    }
  }

  async chmod(path: string, mode: number) {
    const { fsPath } = this._resolvePath(path);
    const access = this.access(fsPath);
    if (!access) throw new Error("You don't have permissions!");
    try {
      return await Deno.chmod(fsPath, mode);
    } catch (e) {
      throw e;
    }
  }

  async chown(path: string, _uid?: number, _gid?: number): Promise<void> {
    const { uid, gid } = await this.own();
    const access = this.access(path);
    if (!access) throw new Error("You don't have permissions!");
    try {
      await Deno.chown(path, _uid || uid, _gid || gid);
    } catch (e) {
      throw e;
    }
  }

  async utime(path: string, mtime: Date): Promise<void> {
    const { fsPath } = this._resolvePath(path);
    const access = await this.access(fsPath);
    if (!access) throw new Error("You don't have permissions!");
    try {
      // Use current atime, set new mtime
      const stat = await Deno.stat(fsPath);
      const atime = stat.atime || new Date();
      await Deno.utime(fsPath, atime, mtime);
    } catch (e) {
      throw e;
    }
  }

  getUniqueName(): string {
    return v4.generate().replace(/\W/g, "");
  }
}

export function ls(fileStat: FileInfo): string {
  const now = new Date();
  const mtime = (!fileStat.mtime) ? now : new Date(fileStat.mtime);
  const timeDiff = now.getMonth() - mtime.getMonth() + (12 * (now.getFullYear() - mtime.getFullYear()));
  const dateFormat = timeDiff < 6 ? "MM dd hh:mm" : "MM dd yyyy";

  return [
    fileStat.mode
      ? [
        fileStat.isDirectory ? "d" : "-",
        fileStat.mode & 256 ? "r" : "-",
        fileStat.mode & 128 ? "w" : "-",
        fileStat.mode & 64 ? "x" : "-",
        fileStat.mode & 32 ? "r" : "-",
        fileStat.mode & 16 ? "w" : "-",
        fileStat.mode & 8 ? "x" : "-",
        fileStat.mode & 4 ? "r" : "-",
        fileStat.mode & 2 ? "w" : "-",
        fileStat.mode & 1 ? "x" : "-",
      ].join("")
      : fileStat.isDirectory
      ? "drwxr-xr-x"
      : "-rwxr-xr-x",
    "1",
    fileStat.uid || 1,
    fileStat.gid || 1,
    padStart(fileStat.size.toString(), 12),
    padStart(format(mtime, dateFormat), 12),
    " ",
    fileStat.name,
  ].join(" ");
}

function ep(fileStat: FileInfo): string {
  const facts = compact([
    fileStat.dev && fileStat.ino ? `i${fileStat.dev.toString(16)}.${fileStat.ino.toString(16)}` : null,
    fileStat.size ? `s${fileStat.size}` : null,
    fileStat.mtime ? `m${new Date(fileStat.mtime).getTime()}` : null,
    fileStat.mode ? `up${(fileStat.mode & 4095).toString(8)}` : null,
    fileStat.isDirectory ? "/" : "r",
  ]).join(",");
  return `+${facts}\t${fileStat.name}`;
}

function compact(array: Array<string | null>): Array<string | null> {
  let resIndex = 0;
  const result: Array<string | null> = [];
  if (array == null) return result;
  for (const value of array) {
    if (value) result[resIndex++] = value;
  }
  return result;
}

/**
 * MLSx format (RFC 3659) - Machine-readable format used by MLSD/MLST
 * Facts: type, size, modify, perm, unique
 */
export function mlsx(fileStat: FileInfo): string {
  const type = fileStat.isDirectory ? "dir" : "file";
  const mtime = fileStat.mtime ? new Date(fileStat.mtime) : new Date();
  
  // Format: YYYYMMDDHHMMSS
  const modify = [
    mtime.getUTCFullYear(),
    padStart(String(mtime.getUTCMonth() + 1), 2, "0"),
    padStart(String(mtime.getUTCDate()), 2, "0"),
    padStart(String(mtime.getUTCHours()), 2, "0"),
    padStart(String(mtime.getUTCMinutes()), 2, "0"),
    padStart(String(mtime.getUTCSeconds()), 2, "0"),
  ].join("");

  // Permissions for MLSx
  // a - APPE allowed, c - create allowed, d - delete allowed, 
  // e - enter directory, f - rename, l - list, m - mkdir, p - purge,
  // r - read, w - write
  let perm = "";
  if (fileStat.isDirectory) {
    perm = "cdeflmp"; // can create, delete, enter, list files, modify, purge
  } else {
    perm = "adfrw"; // can append, delete, rename, read, write
  }

  const facts = [
    `type=${type}`,
    `size=${fileStat.size}`,
    `modify=${modify}`,
    `perm=${perm}`,
  ];

  // Add unique identifier if available
  if (fileStat.dev !== null && fileStat.ino !== null) {
    facts.push(`unique=${fileStat.dev?.toString(16)}.${fileStat.ino?.toString(16)}`);
  }

  return `${facts.join(";")}; ${fileStat.name}`;
}
