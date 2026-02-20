import { colors, Command, deferred, hash, Table } from "../../deps.ts";
import type { Deferred } from "../../deps.ts";

import { upgradable } from "./mod.ts";

import { Users } from "../db/Users.ts";

export const deferUsers: Deferred<string | null | void> = deferred();

type iUser = {
  username: string;
  password: string;
  root: string;
  uid: number;
  gid: number;
};

const table = new Table()
  .header([
    colors.yellow("Username"),
    colors.yellow("Folder"),
    colors.yellow("uid"),
    colors.yellow("gid"),
  ])
  .border(true);

const userCmdAdd = new Command()
  .description("Add an ftp user.")
  .option("-u, --username <val:string>", "Username of ftp account", { required: true })
  .option("-p, --password <val:string>", "Password of ftp account", { required: true })
  .option("-r, --root <val:string>", "Path of ftp account", { required: true })
  .option("--uid <val:number>", "User id of ftp account", { required: true })
  .option("--gid <val:number>", "Group id of ftp account", { required: true })
  .action(async ({ username, password, root, uid, gid }) => {
    const existingUser = Users.findByUsername(username);
    if (existingUser) return deferUsers.reject(`User "${username}" Already exist!`);
    const data: iUser = {
      username,
      password: await hash(password),
      root,
      uid: uid,
      gid: gid,
    };
    Users.create(data);

    deferUsers.resolve(`User "${username}" added with success.`);
  });

const userCmdDel = new Command()
  .description("Remove an ftp user.")
  .option("-u, --username <val:string>", "Username of ftp account", { required: true })
  .action(async ({ username }) => {
    await upgradable();
    const user = Users.findByUsername(username);
    if (!user) return deferUsers.reject(`User "${username}" not found!\n Use -h`);
    Users.delete(user.id);

    deferUsers.resolve(`User "${username}" deleted with success.`);
  });

const userCmdGet = new Command()
  .description("Show informations of an ftp user.")
  .option("-u, --username <val:string>", "Username of ftp account", { required: true })
  .action(async ({ username }) => {
    await upgradable();
    const users = Users.where("username", username).get();
    if (users.length === 0) return deferUsers.reject(`User "${username}" not found!`);
    const { root, uid, gid } = users[0];
    const displayUsername = colors.bold.blue(username);
    const displayRoot = colors.bold.blue(root as string);
    const displayUid = colors.bold.blue(`${uid}`);
    const displayGid = colors.bold.blue(`${gid}`);
    table.body([[displayUsername, displayRoot, displayUid, displayGid]]).render();

    deferUsers.resolve();
  });

export const usersCommands = new Command()
  .description("User section.")
  .action(async () => {
    await upgradable();
    const users = Users.findAll();
    if (users.length === 0) return deferUsers.reject(`Users list empty, use add command to add an user.`);
    table
      .body(users.map(({ username, root, uid, gid }) => {
        const displayUsername = colors.bold.blue(username as string);
        const displayRoot = colors.bold.blue(root as string);
        const displayUid = colors.bold.blue(`${uid}`);
        const displayGid = colors.bold.blue(`${gid}`);
        return [displayUsername, displayRoot, displayUid, displayGid];
      })).render();

    deferUsers.resolve();
  })
  .command("add", userCmdAdd)
  .command("del", userCmdDel)
  .command("get", userCmdGet);
