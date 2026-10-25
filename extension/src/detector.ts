/**
 * Client-side Local Lookalike & Threat Detector.
 * Provides instant (<5ms) offline detection of brand impersonation, typosquatting,
 * combosquatting, homoglyphs, and phishing without needing an active backend.
 * Ensures the extension never shows 0 score or fails open on brand lookalikes.
 */

import { isOfficialSync } from "./allowlist";
import { ALL_REGISTERED_BRANDS, BrandRecord } from "./brands_data";

export interface DetectionVerdict {
  host: string;
  level: "SAFE" | "SUSPICIOUS" | "DANGEROUS";
  score: number;
  isOfficial?: boolean;
  reasons: string[];
  brand?: {
    name: string;
    confidence: number;
    official_url: string;
  };
}

const DECEPTIVE_KEYWORDS = new Set([
  "login",
  "signin",
  "sign-in",
  "secure",
  "security",
  "kyc",
  "update",
  "verify",
  "verification",
  "account",
  "banking",
  "portal",
  "claim",
  "refund",
  "bonus",
  "sale",
  "deal",
  "offer",
  "discount",
  "free",
  "gift",
  "win",
  "support",
  "help",
  "service",
  "bill",
  "pay",
  "payment",
  "card",
  "pin",
  "otp",
  "auth",
  "care",
]);

const HIGH_RISK_TLDS = new Set([
  "xyz",
  "top",
  "click",
  "sale",
  "live",
  "online",
  "site",
  "link",
  "shop",
  "info",
  "club",
  "work",
  "icu",
  "vip",
  "buzz",
  "fit",
  "loan",
  "cam",
  "rest",
  "stream",
  "download",
]);

const KNOWN_2PART_TLDS = new Set([
  "co.in",
  "com.in",
  "net.in",
  "org.in",
  "gov.in",
  "edu.in",
  "ac.in",
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "co.jp",
  "com.br",
  "co.nz",
  "co.za",
  "com.sg",
  "com.my",
  "com.hk",
  "co.kr",
]);

/**
 * Normalize label using skeleton homoglyph mapping:
 * 0 -> o, 1 -> l, 3 -> e, 5 -> s, rn -> m, vv -> w, $ -> s, @ -> a
 */
export function toSkeleton(input: string): string {
  return input
    .toLowerCase()
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/@/g, "a");
}

/**
 * Computes Damerau-Levenshtein distance (insertions, deletions, substitutions, and transpositions).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[m][n];
}

/**
 * Parses host into primary domain label, subdomain, and suffix.
 */
export function parseHostname(host: string): {
  domainLabel: string;
  subdomain: string;
  suffix: string;
} {
  const clean = host.toLowerCase().trim();
  const parts = clean.split(".");
  if (parts.length <= 1) {
    return { domainLabel: parts[0] || "", subdomain: "", suffix: "" };
  }

  let suffix = parts[parts.length - 1];
  let domainLabel = parts[parts.length - 2];
  let subParts = parts.slice(0, parts.length - 2);

  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join(".");
    if (KNOWN_2PART_TLDS.has(lastTwo)) {
      suffix = lastTwo;
      domainLabel = parts[parts.length - 3];
      subParts = parts.slice(0, parts.length - 3);
    }
  }

  return { domainLabel, subdomain: subParts.join("."), suffix };
}

/**
 * Synchronously evaluates host name for lookalikes locally (<5ms).
 */
export function detectHostLocallySync(host: string): DetectionVerdict {
  const cleanHost = host.toLowerCase().trim();

  // 1. Genuine allowlist check
  if (isOfficialSync(cleanHost)) {
    // Find matching brand display name if available
    const brand = ALL_REGISTERED_BRANDS.find((b) =>
      b.official_domains.some((d) => cleanHost === d || cleanHost.endsWith("." + d))
    );
    return {
      host: cleanHost,
      level: "SAFE",
      score: 0,
      isOfficial: true,
      reasons: ["matches_official_allowlist"],
      brand: brand
        ? {
            name: brand.name,
            confidence: 1.0,
            official_url: brand.canonical_url,
          }
        : undefined,
    };
  }

  const { domainLabel, subdomain, suffix } = parseHostname(cleanHost);
  const labelSkel = toSkeleton(domainLabel);
  const cleanSkel = toSkeleton(cleanHost);
  const subSkel = toSkeleton(subdomain);
  const flatCleanSkel = cleanSkel.replace(/[-_.]/g, "");
  const segments = domainLabel.split(/[-_]/).map(toSkeleton);
  const subSegments = subdomain ? subdomain.split(/[-_.]/).map(toSkeleton) : [];

  const hasHomoglyphs = cleanHost !== cleanSkel;
  const isSuspiciousTld = HIGH_RISK_TLDS.has(suffix);
  const foundKeywords: string[] = [];
  for (const kw of DECEPTIVE_KEYWORDS) {
    if (cleanHost.includes(kw) || cleanSkel.includes(kw)) {
      foundKeywords.push(kw);
    }
  }

  let bestBrand: BrandRecord | null = null;
  let bestScore = 0;
  let bestPriority = -1; // 3: exact segment match, 2: typosquat, 1: combosquat/subdomain
  let bestTokenLen = 0;
  let bestReasons: string[] = [];

  for (const b of ALL_REGISTERED_BRANDS) {
    // If the host is genuinely in official domains, it's safe
    if (b.official_domains.some((d) => cleanHost === d || cleanHost.endsWith("." + d))) {
      return {
        host: cleanHost,
        level: "SAFE",
        score: 0,
        isOfficial: true,
        reasons: ["matches_official_allowlist"],
        brand: {
          name: b.name,
          confidence: 1.0,
          official_url: b.canonical_url,
        },
      };
    }

    for (const tok of b.tokens) {
      if (!tok || tok.length < 3) continue;

      // Skip generic words unless it is part of the brand ID
      if (DECEPTIVE_KEYWORDS.has(tok.toLowerCase()) && !b.id.toLowerCase().includes(tok.toLowerCase())) {
        continue;
      }

      const tokSkel = toSkeleton(tok);
      const tLen = tokSkel.length;

      let priority = -1;
      let baseScore = 0;
      let reasonType = "";

      // Priority 3: Exact segment match or exact domain label match
      if (segments.includes(tokSkel) || subSegments.includes(tokSkel)) {
        priority = 3;
        baseScore = 90;
        reasonType = "combosquatting";
      } else if (labelSkel === tokSkel) {
        priority = 3;
        baseScore = 92;
        reasonType = "imitates_brand";
      }

      // Priority 2: Typosquatting / Edit distance on domain label or segments
      if (priority < 2) {
        const dist = damerauLevenshtein(labelSkel, tokSkel);
        const maxLen = Math.max(labelSkel.length, tLen);
        const sim = maxLen > 0 ? 1 - dist / maxLen : 0;

        if (
          (dist <= 2 && tLen >= 5 && sim >= 0.7) ||
          (dist <= 1 && tLen === 4 && sim >= 0.75)
        ) {
          priority = 2;
          baseScore = 88;
          reasonType = "typosquatting";
        } else {
          for (const seg of segments) {
            const sDist = damerauLevenshtein(seg, tokSkel);
            const sMax = Math.max(seg.length, tLen);
            const sSim = sMax > 0 ? 1 - sDist / sMax : 0;
            if (
              (sDist <= 2 && tLen >= 5 && sSim >= 0.7) ||
              (sDist <= 1 && tLen === 4 && sSim >= 0.75)
            ) {
              priority = 2;
              baseScore = 87;
              reasonType = "typosquatting";
              break;
            }
          }
        }
      }

      // Priority 1: Subdomain abuse
      if (priority < 1 && subdomain) {
        if (subSkel.includes(tokSkel) || subdomain.includes(tok)) {
          priority = 1;
          baseScore = 91;
          reasonType = "subdomain_abuse";
        }
      }

      // Priority 1: Substring containment (for tokens >= 4 chars not marked exact_only)
      if (priority < 1 && tLen >= 4 && b.token_match !== "exact_only") {
        if (flatCleanSkel.includes(tokSkel) || cleanHost.includes(tok)) {
          priority = 1;
          baseScore = 85;
          reasonType = "combosquatting";
        }
      }

      if (priority > 0) {
        const reasons = ["imitates_brand"];
        if (reasonType && reasonType !== "imitates_brand") {
          reasons.push(reasonType);
        }

        // Adjust candidate score
        let candScore = baseScore;
        if (foundKeywords.length > 0) {
          candScore = Math.min(candScore + 5, 98);
          if (!reasons.includes("combosquatting")) reasons.push("combosquatting");
        }
        if (isSuspiciousTld) {
          candScore = Math.min(candScore + 4, 98);
          reasons.push("suspicious_tld");
        }
        if (hasHomoglyphs) {
          candScore = Math.min(candScore + 3, 99);
          reasons.push("punycode_homoglyph");
        }

        // Selection: prefer higher priority, then longer token, then higher score
        if (
          priority > bestPriority ||
          (priority === bestPriority && tLen > bestTokenLen) ||
          (priority === bestPriority && tLen === bestTokenLen && candScore > bestScore)
        ) {
          bestPriority = priority;
          bestScore = candScore;
          bestBrand = b;
          bestTokenLen = tLen;
          bestReasons = reasons;
        }
      }
    }
  }

  // If a brand lookalike was detected with score >= 70
  if (bestScore >= 70 && bestBrand) {
    return {
      host: cleanHost,
      level: "DANGEROUS",
      score: bestScore,
      isOfficial: false,
      reasons: Array.from(new Set(bestReasons)),
      brand: {
        name: bestBrand.name,
        confidence: Number((bestScore / 100).toFixed(2)),
        official_url: bestBrand.canonical_url,
      },
    };
  }

  // Generic evaluation for other suspicious sites (suspicious TLD + deceptive keyword)
  if (isSuspiciousTld && foundKeywords.length > 0) {
    return {
      host: cleanHost,
      level: "SUSPICIOUS",
      score: 65,
      isOfficial: false,
      reasons: ["suspicious_tld", "trust_word_abuse"],
    };
  }

  // Non-brand, unverified safe site (e.g. example.com, personal blog)
  return {
    host: cleanHost,
    level: "SAFE",
    score: 0,
    isOfficial: false,
    reasons: ["unverified_domain"],
  };
}

/**
 * Asynchronously evaluates host name for lookalikes locally (<5ms).
 */
export async function detectHostLocally(host: string): Promise<DetectionVerdict> {
  return detectHostLocallySync(host);
}
