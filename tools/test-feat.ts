// Quick FEAT test script using TLS
const decoder = new TextDecoder();
const encoder = new TextEncoder();

// Load CA certificates from mkcert
const rootCA = Deno.env.get("LOCALAPPDATA") + "\\mkcert\\rootCA.pem";
let caCerts: string[] = [];
try {
  caCerts = [await Deno.readTextFile(rootCA)];
} catch {
  console.log("Warning: No mkcert root CA found, using system defaults");
}

console.log("🔌 Connecting to 127.0.0.1:21 with TLS...");
const conn = await Deno.connectTls({
  hostname: "127.0.0.1",
  port: 21,
  caCerts,
});
console.log("✓ Connected!");

const buffer = new Uint8Array(4096);

async function readAll(): Promise<string> {
  let result = "";
  // Keep reading until we get a line that starts with 3-digit code followed by space (end of multiline)
  while (true) {
    const n = await conn.read(buffer);
    if (!n) break;
    const chunk = decoder.decode(buffer.subarray(0, n));
    result += chunk;
    // Check if we've received the final line (ends with "xxx " pattern on last line)
    const lines = result.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    if (/^\d{3} /.test(lastLine)) break;
    // Small delay to allow more data to arrive
    await new Promise(r => setTimeout(r, 50));
  }
  return result;
}

// Read welcome
console.log("\n=== Welcome ===");
const welcome = await readAll();
console.log(welcome.trim());

// Send FEAT
console.log("\n=== FEAT ===");
await conn.write(encoder.encode("FEAT\r\n"));
const feat = await readAll();
console.log(feat);

// Quit  
console.log("=== QUIT ===");
await conn.write(encoder.encode("QUIT\r\n"));
const quit = await readAll();
console.log(quit.trim());

conn.close();
console.log("\n✓ Done!");
