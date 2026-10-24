/**
 * Local signed allowlist management.
 * Checks known official domains instantly on-device (<5ms) without network latency.
 */

// Initial seed allowlist for high-priority banks, gov, payments, and dev test
const EMBEDDED_OFFICIAL_DOMAINS = new Set<string>([
  "examplebank.bank.in",
  "examplebank.co.in",
  "sbi.co.in",
  "onlinesbi.sbi",
  "onlinesbi.com",
  "hdfcbank.com",
  "icicibank.com",
  "axisbank.com",
  "kotak.com",
  "pnbindia.in",
  "bankofbaroda.in",
  "canarabank.com",
  "unionbankofindia.co.in",
  "bankofindia.co.in",
  "rbi.org.in",
  "npci.org.in",
  "incometax.gov.in",
  "uidai.gov.in",
  "epfindia.gov.in",
  "irctc.co.in",
  "india.gov.in",
  "google.com",
  "microsoft.com",
  "apple.com",
  "amazon.in",
  "flipkart.com",
  "paytm.com",
  "phonepe.com",
  "razorpay.com",
  "zerodha.com",
  "groww.in",
]);

let cachedAllowlist: Set<string> = new Set(EMBEDDED_OFFICIAL_DOMAINS);

export function getAllowlist(): Set<string> {
  return cachedAllowlist;
}

export function updateAllowlist(domains: string[]): void {
  for (const d of domains) {
    cachedAllowlist.add(d.toLowerCase());
  }
}

/**
 * Checks if a hostname belongs to an official domain.
 */
export async function isOfficial(host: string): Promise<boolean> {
  const clean = host.toLowerCase().trim();
  if (cachedAllowlist.has(clean)) {
    return true;
  }

  // Check parent domains (e.g. retail.examplebank.bank.in -> examplebank.bank.in)
  const parts = clean.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (cachedAllowlist.has(parent)) {
      return true;
    }
  }

  return false;
}
