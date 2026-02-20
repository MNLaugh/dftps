import { colors, Command } from "../../deps.ts";

import { version } from "./mod.ts";

async function run(commands: string[]): Promise<void> {
  const command = new Deno.Command(commands[0], {
    args: commands.slice(1),
    stdout: "piped",
    stderr: "piped",
  });

  const result = await command.output();
  const error = new TextDecoder().decode(result.stderr);
  const output = new TextDecoder().decode(result.stdout);

  if (!result.success) throw error;
  if (error.length !== 0) console.log(error);
  if (output.length !== 0) console.log(output);
}

export const upgradeCommands = new Command()
  //.option("-u, --username [val:string]", "Username of ftp account.", { global: true, required: true })
  .description("Upgrade dftps.")
  .action(async () => {
    try {
      const release = await latest();
      if (release.tag_name.replace("v", "") === version) {
        return console.log(colors.bold.magenta("You already have latest release installed."));
      }

      // Detect OS and architecture
      const os = Deno.build.os;
      const arch = Deno.build.arch;

      let artifactName = "";
      let isWindows = false;

      if (os === "linux" && arch === "x86_64") {
        artifactName = "dftps-linux-x64.tar.gz";
      } else if (os === "darwin" && arch === "x86_64") {
        artifactName = "dftps-macos-x64.tar.gz";
      } else if (os === "darwin" && arch === "aarch64") {
        artifactName = "dftps-macos-arm64.tar.gz";
      } else if (os === "windows" && arch === "x86_64") {
        artifactName = "dftps-windows-x64.zip";
        isWindows = true;
      } else {
        return console.log(colors.bold.red(`Unsupported platform: ${os}/${arch}`));
      }

      // Find the matching asset
      const asset = release.assets.find((a: { name: string }) => a.name === artifactName);
      if (!asset) {
        return console.log(colors.bold.red(`No release found for ${artifactName}`));
      }

      console.log(`Download latest version of DFtpS (${release.tag_name}) for ${os}/${arch}`);

      if (isWindows) {
        console.log(colors.yellow("On Windows, please download manually from:"));
        console.log(asset.browser_download_url);
        return;
      }

      await run([
        "curl",
        "--fail",
        "--location",
        "--progress-bar",
        "--output",
        "/tmp/dftps.tar.gz",
        asset.browser_download_url,
      ]);
      await run(["tar", "-xzf", "/tmp/dftps.tar.gz", "-C", "/tmp"]);
      await run(["sudo", "cp", "/tmp/dftps", "/usr/local/bin/dftps"]);
      await run(["sudo", "chmod", "+x", "/usr/local/bin/dftps"]);
      await run(["rm", "-rf", "/tmp/dftps.tar.gz", "/tmp/dftps", "/tmp/dftps.toml", "/tmp/README.md", "/tmp/LICENSE"]);

      console.log(`DftpS was upgraded successfully to ${release.tag_name}`);
      console.log("Run 'dftps --help' to get started");
    } catch (e) {
      throw e;
    }
  });

export async function latest() {
  try {
    const uri = "https://api.github.com/repos/MNLaugh/dftps/releases/latest";
    const response = await fetch(uri);
    return await response.json();
  } catch (e) {
    throw e;
  }
}

/*
bin_dir="/usr/bin"
exe="dftps"
config="default.config.toml"

chmod +x "$bin_dir/dftps"

cp "$bin_dir/$config" "/etc"
mv "/etc/$config" "/etc/$exe.toml"

echo "DftpS was installed successfully"
echo "You must be modify you'r config file in '/etc/$exe.toml'"
echo "Run 'dftps --help' to get started"
*/
