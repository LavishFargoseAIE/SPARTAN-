/**
 * Cryptographic Ed25519 signature verification in the browser extension
 * using native Web Crypto API (crypto.subtle).
 */

import { isOfficial } from "./allowlist";

const EMBEDDED_PUBLIC_KEY_B64 =
  process.env.REGISTRY_SIGNING_PUBLIC_KEY ||
  "eRjZf+kmHCyhdjhsIr42p0zz3ecrWatwGNNQ4TjdmJY=";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function canonicalRedirectBytes(name: string, official_url: string): Uint8Array {
  const payload = { name, official_url };
  const jsonStr = JSON.stringify(payload, Object.keys(payload).sort());
  return new TextEncoder().encode(jsonStr);
}

let cachedCryptoKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }
  const rawKey = base64ToUint8Array(EMBEDDED_PUBLIC_KEY_B64);
  cachedCryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "Ed25519" },
    false,
    ["verify"]
  );
  return cachedCryptoKey;
}

export interface BrandPayload {
  name: string;
  official_url: string;
  signature: string;
  confidence?: number;
}

/**
 * Verify brand signature and enforce domain pinning.
 * Target must be cryptographically signed by the registry AND pinned to official domains.
 */
export async function verifySignature(brand: BrandPayload): Promise<boolean> {
  if (!brand || !brand.name || !brand.official_url || !brand.signature) {
    return false;
  }

  // 1. Domain pinning check
  try {
    const url = new URL(brand.official_url);
    const host = url.hostname.toLowerCase();
    const isDomainOfficial = await isOfficial(host);
    if (!isDomainOfficial) {
      console.warn(`[SiteGuard] Domain pinning failed: ${host} is not in official domains.`);
      return false;
    }
  } catch (e) {
    console.error("[SiteGuard] Invalid official_url in brand payload:", e);
    return false;
  }

  // 2. Cryptographic signature check
  try {
    const key = await getPublicKey();
    const sigBytes = base64ToUint8Array(brand.signature);
    const dataBytes = canonicalRedirectBytes(brand.name, brand.official_url);

    const valid = await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      sigBytes,
      dataBytes
    );

    return valid;
  } catch (err) {
    console.error("[SiteGuard] Signature verification error:", err);
    return false;
  }
}
