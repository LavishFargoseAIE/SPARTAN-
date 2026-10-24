/**
 * SiteGuard Mobile API Service.
 * Adheres strictly to security rule: NEVER send full URL or user identifiers.
 * Only extracted, normalized hostnames leave the device.
 */

export const DEFAULT_API_BASE = "https://spartan-inle.onrender.com";

export interface BrandInfo {
  name: string;
  confidence: number;
  official_url: string;
  signature: string;
}

export interface VerdictResult {
  host: string;
  level: "SAFE" | "SUSPICIOUS" | "DANGEROUS";
  score: number;
  reasons: string[];
  brand?: BrandInfo;
  ttl?: number;
  url_ml_score?: number;
  content_risk_score?: number;
}

export function extractHostFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    let urlStr = trimmed;
    if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
      urlStr = "https://" + urlStr;
    }
    const url = new URL(urlStr);
    return url.hostname.toLowerCase();
  } catch {
    // Basic regex fallback
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0].split("?")[0].toLowerCase();
  }
}

export async function checkHost(
  hostOrUrl: string,
  apiBase: string = DEFAULT_API_BASE,
  lang: string = "en"
): Promise<VerdictResult> {
  const host = extractHostFromInput(hostOrUrl);
  if (!host) {
    throw new Error("Invalid or empty web address");
  }

  const endpoint = `${apiBase.replace(/\/$/, "")}/v1/check`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for mobile networks

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        client: "mobile-0.1.0",
        lang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    throw new Error(`API returned HTTP ${res.status}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[SiteGuard Mobile] API call failed for ${host}:`, err);
    // Fail-open response matching spec
    return {
      host,
      level: "SAFE",
      score: 0,
      reasons: ["api_unreachable_fail_open"],
    };
  }
}
