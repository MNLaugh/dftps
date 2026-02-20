/**
 * Test FTP connection with TLS
 * Cross-platform script that handles certificate generation
 *
 * Run: deno run -A tools/test-ftp.ts
 */

const HOST = "127.0.0.1";
const PORT = 21;

// Detect OS
const isWindows = Deno.build.os === "windows";
const isMac = Deno.build.os === "darwin";
const isLinux = Deno.build.os === "linux";

// Paths for certificates
const CERT_DIR = "./tools/certs";
const CERT_FILE = `${CERT_DIR}/cert.pem`;
const KEY_FILE = `${CERT_DIR}/key.pem`;
const CA_FILE = `${CERT_DIR}/rootCA.pem`;

/**
 * Run a command and return the result
 */
async function runCommand(cmd: string[], options?: { cwd?: string }): Promise<{ success: boolean; output: string }> {
  try {
    const command = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      cwd: options?.cwd,
      stdout: "piped",
      stderr: "piped",
    });
    const result = await command.output();
    const output = new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
    return { success: result.success, output };
  } catch (e) {
    return { success: false, output: String(e) };
  }
}

/**
 * Check if a command exists
 */
async function commandExists(cmd: string): Promise<boolean> {
  const checkCmd = isWindows ? ["where", cmd] : ["which", cmd];
  const result = await runCommand(checkCmd);
  return result.success;
}

/**
 * Install mkcert based on OS
 */
async function installMkcert(): Promise<boolean> {
  console.log("📦 Installing mkcert...");

  if (isWindows) {
    // Try winget first, then chocolatey, then scoop
    if (await commandExists("winget")) {
      const result = await runCommand(["winget", "install", "-e", "--id", "FiloSottile.mkcert"]);
      if (result.success) return true;
    }
    if (await commandExists("choco")) {
      const result = await runCommand(["choco", "install", "mkcert", "-y"]);
      if (result.success) return true;
    }
    if (await commandExists("scoop")) {
      const result = await runCommand(["scoop", "install", "mkcert"]);
      if (result.success) return true;
    }
    console.error("❌ Cannot install mkcert. Please install manually:");
    console.error("   winget install FiloSottile.mkcert");
    console.error("   OR choco install mkcert");
    console.error("   OR scoop install mkcert");
    return false;
  }

  if (isMac) {
    if (await commandExists("brew")) {
      const result = await runCommand(["brew", "install", "mkcert"]);
      if (result.success) return true;
    }
    console.error("❌ Cannot install mkcert. Please install Homebrew first:");
    console.error('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    console.error("   Then: brew install mkcert");
    return false;
  }

  if (isLinux) {
    // Try apt, dnf, pacman
    if (await commandExists("apt")) {
      await runCommand(["sudo", "apt", "update"]);
      const result = await runCommand(["sudo", "apt", "install", "-y", "mkcert"]);
      if (result.success) return true;
    }
    if (await commandExists("dnf")) {
      const result = await runCommand(["sudo", "dnf", "install", "-y", "mkcert"]);
      if (result.success) return true;
    }
    if (await commandExists("pacman")) {
      const result = await runCommand(["sudo", "pacman", "-S", "--noconfirm", "mkcert"]);
      if (result.success) return true;
    }
    console.error("❌ Cannot install mkcert. Please install manually for your distro.");
    return false;
  }

  return false;
}

/**
 * Setup certificates using mkcert
 */
async function setupCertificates(): Promise<boolean> {
  // Check if certs already exist
  try {
    await Deno.stat(CERT_FILE);
    await Deno.stat(KEY_FILE);
    console.log("✓ Certificates already exist");
    return true;
  } catch {
    // Need to generate
  }

  // Check if mkcert is installed
  if (!await commandExists("mkcert")) {
    console.log("⚠ mkcert not found");
    if (!await installMkcert()) {
      return false;
    }
    // Verify installation
    if (!await commandExists("mkcert")) {
      console.error("❌ mkcert installation failed");
      return false;
    }
  }

  console.log("🔐 Setting up certificates...");

  // Create cert directory
  try {
    await Deno.mkdir(CERT_DIR, { recursive: true });
  } catch {
    // Already exists
  }

  // Install local CA (ignore errors if already installed)
  console.log("   Installing local CA...");
  const caResult = await runCommand(["mkcert", "-install"]);
  // mkcert -install can "fail" if CA already installed, that's OK
  if (!caResult.success && !caResult.output.includes("already installed")) {
    console.warn("   ⚠ CA install warning:", caResult.output.trim());
  }

  // Generate certificates
  console.log("   Generating certificates for localhost...");
  const certResult = await runCommand([
    "mkcert",
    "-cert-file",
    CERT_FILE,
    "-key-file",
    KEY_FILE,
    "localhost",
    "127.0.0.1",
    "::1",
  ]);

  if (!certResult.success) {
    console.error("❌ Failed to generate certificates:", certResult.output);
    return false;
  }

  // Copy root CA for client verification
  const caPath = await getMkcertCAPath();
  if (caPath) {
    try {
      await Deno.copyFile(caPath, CA_FILE);
      console.log("   ✓ Root CA copied");
    } catch (e) {
      console.warn("   ⚠ Could not copy root CA:", e);
    }
  }

  console.log("✓ Certificates generated successfully");
  return true;
}

/**
 * Get mkcert CA path based on OS
 */
async function getMkcertCAPath(): Promise<string | null> {
  // mkcert -CAROOT returns the CA directory
  const result = await runCommand(["mkcert", "-CAROOT"]);
  if (result.success) {
    const caRoot = result.output.trim();
    return `${caRoot}/rootCA.pem`;
  }
  return null;
}

/**
 * Load certificates for TLS connection
 */
async function loadCACerts(): Promise<string[] | undefined> {
  try {
    const caCert = await Deno.readTextFile(CA_FILE);
    return [caCert];
  } catch {
    // Try to get from mkcert directly
    const caPath = await getMkcertCAPath();
    if (caPath) {
      try {
        const caCert = await Deno.readTextFile(caPath);
        return [caCert];
      } catch {
        // Fallback: no CA verification
      }
    }
  }
  return undefined;
}

/**
 * Test FTP connection
 */
async function testFtpConnection() {
  console.log(`\n🔌 Connecting to ${HOST}:${PORT} with TLS...`);

  try {
    const caCerts = await loadCACerts();

    // Connect with TLS directly (implicit FTPS)
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });
    console.log("✓ TLS connection established");

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Read welcome message
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n) {
      const welcome = decoder.decode(buffer.subarray(0, n));
      console.log("Server welcome:", welcome.trim());
    }

    // Send USER command
    console.log("\nSending USER test...");
    await conn.write(encoder.encode("USER test\r\n"));

    const n2 = await conn.read(buffer);
    if (n2) {
      const response = decoder.decode(buffer.subarray(0, n2));
      console.log("Server response:", response.trim());
    }

    // Quit
    await conn.write(encoder.encode("QUIT\r\n"));
    const n3 = await conn.read(buffer);
    if (n3) {
      const response = decoder.decode(buffer.subarray(0, n3));
      console.log("Server response:", response.trim());
    }

    conn.close();
    console.log("\n✓ FTP TLS test completed successfully!");
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.ConnectionRefused) {
      return false; // Server not started
    }
    console.error("✗ Error:", e);
    return false;
  }
}

/**
 * Check if server is running
 */
async function isServerRunning(): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: HOST, port: PORT });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the DFtpS server as a subprocess
 */
async function startServer(): Promise<Deno.ChildProcess | null> {
  console.log("\n🚀 Starting DFtpS server...");

  try {
    const command = new Deno.Command("deno", {
      args: ["task", "dev"],
      stdout: "piped",
      stderr: "piped",
    });

    const child = command.spawn();

    // Wait for server to be ready (max 10 seconds)
    const maxWait = 10000;
    const interval = 200;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      waited += interval;

      if (await isServerRunning()) {
        console.log("✓ Server started");
        return child;
      }
    }

    console.error("❌ Server failed to start within timeout");
    child.kill();
    return null;
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    return null;
  }
}

// Main
console.log("🚀 DFtpS TLS Test Script");
console.log(`   OS: ${Deno.build.os} (${Deno.build.arch})`);

if (!await setupCertificates()) {
  console.error("\n❌ Cannot run test without certificates");
  Deno.exit(1);
}

// Check if server is already running
let serverProcess: Deno.ChildProcess | null = null;
let serverWasStarted = false;

if (await isServerRunning()) {
  console.log("✓ Server already running");
} else {
  serverProcess = await startServer();
  serverWasStarted = true;
  if (!serverProcess) {
    console.error("\n❌ Cannot run test without server");
    Deno.exit(1);
  }
}

// Run the test
const success = await testFtpConnection();

// Cleanup: stop server if we started it
if (serverProcess && serverWasStarted) {
  console.log("\n🛑 Stopping server...");
  try {
    serverProcess.kill();
    await serverProcess.status;
  } catch {
    // Already stopped
  }
}

Deno.exit(success ? 0 : 1);
