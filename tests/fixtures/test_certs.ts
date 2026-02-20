/**
 * Test certificates loader for TLS testing.
 * Uses the existing certificates in tools/certs/ directory.
 */

import { dirname, fromFileUrl, join } from "@std/path";

// Get the project root directory
const MODULE_DIR = dirname(fromFileUrl(import.meta.url));
const PROJECT_ROOT = join(MODULE_DIR, "..", "..");
const CERTS_DIR = join(PROJECT_ROOT, "tools", "certs");

/**
 * Load test certificates from tools/certs/
 * @returns Certificate and key content
 */
export async function loadTestCerts(): Promise<{ cert: string; key: string; rootCA: string }> {
  const cert = await Deno.readTextFile(join(CERTS_DIR, "cert.pem"));
  const key = await Deno.readTextFile(join(CERTS_DIR, "key.pem"));
  const rootCA = await Deno.readTextFile(join(CERTS_DIR, "rootCA.pem"));
  return { cert, key, rootCA };
}

/**
 * Check if test certificates exist
 */
export async function certsExist(): Promise<boolean> {
  try {
    await Deno.stat(join(CERTS_DIR, "cert.pem"));
    await Deno.stat(join(CERTS_DIR, "key.pem"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get certificate file paths
 */
export function getCertPaths(): { certPath: string; keyPath: string; rootCAPath: string } {
  return {
    certPath: join(CERTS_DIR, "cert.pem"),
    keyPath: join(CERTS_DIR, "key.pem"),
    rootCAPath: join(CERTS_DIR, "rootCA.pem"),
  };
}
