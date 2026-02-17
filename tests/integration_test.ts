/**
 * Integration tests for FTP server with TLS
 * These tests start the actual server and test real connections
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { delay } from "@std/async";

const HOST = "127.0.0.1";
const PORT = 21;

// Paths for certificates
const CERT_DIR = "./tools/certs";
const CA_FILE = `${CERT_DIR}/rootCA.pem`;

/**
 * Run a command and return the result
 */
async function runCommand(cmd: string[]): Promise<{ success: boolean; output: string }> {
  try {
    const command = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
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
  const isWindows = Deno.build.os === "windows";
  const checkCmd = isWindows ? ["where", cmd] : ["which", cmd];
  const result = await runCommand(checkCmd);
  return result.success;
}

/**
 * Get mkcert CA path
 */
async function getMkcertCAPath(): Promise<string | null> {
  const result = await runCommand(["mkcert", "-CAROOT"]);
  if (result.success) {
    return `${result.output.trim()}/rootCA.pem`;
  }
  return null;
}

/**
 * Load CA certificates for TLS connection
 */
async function loadCACerts(): Promise<string[] | undefined> {
  // Try local CA file first
  try {
    const caCert = await Deno.readTextFile(CA_FILE);
    return [caCert];
  } catch {
    // Try mkcert CA path
    const caPath = await getMkcertCAPath();
    if (caPath) {
      try {
        const caCert = await Deno.readTextFile(caPath);
        return [caCert];
      } catch {
        // No CA available
      }
    }
  }
  return undefined;
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
 * Start the DFtpS server
 */
async function startServer(): Promise<Deno.ChildProcess | null> {
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
      await delay(interval);
      waited += interval;

      if (await isServerRunning()) {
        return child;
      }
    }

    child.kill();
    return null;
  } catch {
    return null;
  }
}

/**
 * Setup certificates if needed
 */
async function ensureCertificates(): Promise<boolean> {
  // Check if certs exist
  try {
    await Deno.stat(`${CERT_DIR}/cert.pem`);
    await Deno.stat(`${CERT_DIR}/key.pem`);
    return true;
  } catch {
    // Need to generate
  }

  // Check if mkcert is available
  if (!await commandExists("mkcert")) {
    console.warn("⚠ mkcert not installed, skipping TLS tests");
    return false;
  }

  // Create cert directory
  try {
    await Deno.mkdir(CERT_DIR, { recursive: true });
  } catch { /* exists */ }

  // Install CA (ignore errors if already installed)
  await runCommand(["mkcert", "-install"]);

  // Generate certificates
  const result = await runCommand([
    "mkcert",
    "-cert-file",
    `${CERT_DIR}/cert.pem`,
    "-key-file",
    `${CERT_DIR}/key.pem`,
    "localhost",
    "127.0.0.1",
    "::1",
  ]);

  if (!result.success) {
    console.warn("⚠ Failed to generate certificates");
    return false;
  }

  // Copy root CA
  const caPath = await getMkcertCAPath();
  if (caPath) {
    try {
      await Deno.copyFile(caPath, CA_FILE);
    } catch { /* ignore */ }
  }

  return true;
}

// Server process shared across tests
let serverProcess: Deno.ChildProcess | null = null;
let serverStartedByTests = false;

Deno.test({
  name: "Integration - setup server",
  async fn() {
    // Ensure certificates exist
    const hasCerts = await ensureCertificates();
    if (!hasCerts) {
      console.warn("Skipping integration tests: no certificates");
      return;
    }

    // Start server if not running
    if (!await isServerRunning()) {
      serverProcess = await startServer();
      serverStartedByTests = true;
      if (!serverProcess) {
        throw new Error("Failed to start server");
      }
    }

    assertEquals(await isServerRunning(), true);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - TLS connection established",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    // Read welcome
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);

    assertEquals(n !== null && n > 0, true);

    const welcome = new TextDecoder().decode(buffer.subarray(0, n!));
    assertStringIncludes(welcome, "220");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - FEAT command returns features",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(4096);

    // Read welcome
    await conn.read(buffer);

    // Send FEAT and read all response
    await conn.write(encoder.encode("FEAT\r\n"));
    
    let response = "";
    while (true) {
      const n = await conn.read(buffer);
      if (!n) break;
      response += decoder.decode(buffer.subarray(0, n));
      // Check if we've received the final line (ends with "211 " pattern)
      const lines = response.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      if (/^211 /.test(lastLine)) break;
      await new Promise(r => setTimeout(r, 50));
    }

    // Verify FEAT response contains expected features
    assertStringIncludes(response, "211-Features:");
    assertStringIncludes(response, "UTF8");
    assertStringIncludes(response, "AUTH TLS SSL");
    assertStringIncludes(response, "MLSD");
    assertStringIncludes(response, "MLST");
    assertStringIncludes(response, "MFMT");
    assertStringIncludes(response, "MDTM");
    assertStringIncludes(response, "REST STREAM");
    assertStringIncludes(response, "PBSZ");
    assertStringIncludes(response, "PROT");
    assertStringIncludes(response, "211 End");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - SYST command returns system type",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send SYST
    await conn.write(encoder.encode("SYST\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    assertStringIncludes(response, "215");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - QUIT command closes connection",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send QUIT
    await conn.write(encoder.encode("QUIT\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    assertStringIncludes(response, "221");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - MLST without auth returns 550",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send MLST without authentication
    await conn.write(encoder.encode("MLST /\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 550 File system not instantiated
    assertStringIncludes(response, "550");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - MLSD without auth returns 550",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send MLSD without authentication
    await conn.write(encoder.encode("MLSD\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 550 File system not instantiated
    assertStringIncludes(response, "550");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - USER command with unknown user returns 430",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send USER command with unknown user
    await conn.write(encoder.encode("USER unknownuser\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 430 Incorrect username
    assertStringIncludes(response, "430");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - PWD without auth returns 550",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send PWD without authentication
    await conn.write(encoder.encode("PWD\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 550 File system not instantiated
    assertStringIncludes(response, "550");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - TYPE command returns 200",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send TYPE I
    await conn.write(encoder.encode("TYPE I\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 200 OK
    assertStringIncludes(response, "200");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - NOOP command returns 200",
  async fn() {
    if (!await isServerRunning()) {
      console.warn("Server not running, skipping");
      return;
    }

    const caCerts = await loadCACerts();
    const conn = await Deno.connectTls({
      hostname: HOST,
      port: PORT,
      caCerts,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    // Read welcome
    await conn.read(buffer);

    // Send NOOP
    await conn.write(encoder.encode("NOOP\r\n"));
    const n = await conn.read(buffer);

    const response = decoder.decode(buffer.subarray(0, n!));
    // Should return 200 OK
    assertStringIncludes(response, "200");

    conn.close();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Integration - cleanup server",
  async fn() {
    if (serverProcess && serverStartedByTests) {
      try {
        serverProcess.kill();
        await serverProcess.status;
      } catch {
        // Already stopped
      }
    }

    // Give time for cleanup
    await delay(100);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
