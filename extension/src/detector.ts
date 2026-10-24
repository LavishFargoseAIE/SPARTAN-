/**
 * Client-side Local Lookalike & Threat Detector.
 * Provides instant (<2ms) offline detection of brand impersonation and phishing.
 * Ensures the extension never shows 0 score or fails open on obvious brand lookalikes.
 */

import { isOfficial } from "./allowlist";

export interface DetectionVerdict {
  host: string;
  level: "SAFE" | "SUSPICIOUS" | "DANGEROUS";
  score: number;
  reasons: string[];
  brand?: {
    name: string;
    confidence: number;
    official_url: string;
  };
}

interface KnownBrandRule {
  id: string;
  name: string;
  official_domains: string[];
  canonical_url: string;
  tokens: string[];
}

const TOP_BRAND_RULES: KnownBrandRule[] = [
  {
    id: "amazon-india",
    name: "Amazon India",
    official_domains: ["amazon.in", "amazon.com"],
    canonical_url: "https://www.amazon.in",
    tokens: ["amazon", "amazn", "amzn"],
  },
  {
    id: "state-bank-of-india",
    name: "State Bank of India",
    official_domains: ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com"],
    canonical_url: "https://sbi.co.in/",
    tokens: ["onlinesbi", "sbi", "statebankofindia", "statebank"],
  },
  {
    id: "hdfc-bank",
    name: "HDFC Bank",
    official_domains: ["hdfcbank.com"],
    canonical_url: "https://hdfcbank.com/",
    tokens: ["hdfcbank", "hdfc"],
  },
  {
    id: "icici-bank",
    name: "ICICI Bank",
    official_domains: ["icicibank.com"],
    canonical_url: "https://icicibank.com/",
    tokens: ["icicibank", "icici"],
  },
  {
    id: "axis-bank",
    name: "Axis Bank",
    official_domains: ["axisbank.com"],
    canonical_url: "https://axisbank.com/",
    tokens: ["axisbank", "axis"],
  },
  {
    id: "punjab-national-bank",
    name: "Punjab National Bank",
    official_domains: ["pnbindia.in", "netpnb.com"],
    canonical_url: "https://pnbindia.in/",
    tokens: ["pnbindia", "pnb", "punjabnationalbank"],
  },
  {
    id: "bank-of-baroda",
    name: "Bank of Baroda",
    official_domains: ["bankofbaroda.in", "bobibanking.com"],
    canonical_url: "https://bankofbaroda.in/",
    tokens: ["bankofbaroda", "bobibanking"],
  },
  {
    id: "kotak-mahindra-bank",
    name: "Kotak Mahindra Bank",
    official_domains: ["kotak.com"],
    canonical_url: "https://kotak.com/",
    tokens: ["kotak", "kotakmahindrabank"],
  },
  {
    id: "income-tax-department",
    name: "Income Tax Department",
    official_domains: ["incometax.gov.in", "incometaxindia.gov.in"],
    canonical_url: "https://incometax.gov.in/",
    tokens: ["incometax", "incometaxefiling", "efiling"],
  },
  {
    id: "uidai-aadhaar",
    name: "UIDAI Aadhaar",
    official_domains: ["uidai.gov.in"],
    canonical_url: "https://uidai.gov.in/",
    tokens: ["uidai", "aadhaar", "myaadhaar"],
  },
  {
    id: "irctc",
    name: "IRCTC",
    official_domains: ["irctc.co.in"],
    canonical_url: "https://irctc.co.in/",
    tokens: ["irctc"],
  },
  {
    id: "paytm",
    name: "Paytm",
    official_domains: ["paytm.com"],
    canonical_url: "https://paytm.com/",
    tokens: ["paytm"],
  },
  {
    id: "phonepe",
    name: "PhonePe",
    official_domains: ["phonepe.com"],
    canonical_url: "https://phonepe.com/",
    tokens: ["phonepe"],
  },
  {
    id: "google",
    name: "Google",
    official_domains: ["google.com", "google.co.in"],
    canonical_url: "https://google.com/",
    tokens: ["google"],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    official_domains: ["microsoft.com", "live.com", "office.com"],
    canonical_url: "https://microsoft.com/",
    tokens: ["microsoft", "office365"],
  },
  {
    id: "apple",
    name: "Apple",
    official_domains: ["apple.com", "icloud.com"],
    canonical_url: "https://apple.com/",
    tokens: ["apple", "icloud"],
  },
  {
    id: "netflix",
    name: "Netflix",
    official_domains: ["netflix.com"],
    canonical_url: "https://netflix.com/",
    tokens: ["netflix"],
  },
  {
    id: "flipkart",
    name: "Flipkart",
    official_domains: ["flipkart.com"],
    canonical_url: "https://flipkart.com/",
    tokens: ["flipkart"],
  },
  {
    id: "paypal",
    name: "PayPal",
    official_domains: ["paypal.com"],
    canonical_url: "https://paypal.com/",
    tokens: ["paypal"],
  },
];

const DECEPTIVE_KEYWORDS = [
  "login",
  "secure",
  "verify",
  "verification",
  "kyc",
  "update",
  "account",
  "banking",
  "support",
  "help",
  "service",
  "portal",
  "signin",
  "sign-in",
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
  "alert",
];

const HIGH_RISK_TLDS = [
  ".xyz",
  ".top",
  ".click",
  ".sale",
  ".live",
  ".online",
  ".site",
  ".link",
  ".shop",
  ".info",
  ".club",
  ".work",
  ".icu",
  ".vip",
  ".buzz",
  ".fit",
  ".loan",
];

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
 * Evaluates host name for lookalikes locally.
 */
export async function detectHostLocally(host: string): Promise<DetectionVerdict> {
  const cleanHost = host.toLowerCase().trim();

  // 1. Genuine allowlist check
  if (await isOfficial(cleanHost)) {
    return {
      host: cleanHost,
      level: "SAFE",
      score: 0,
      reasons: ["matches_official_allowlist"],
    };
  }

  const skel = toSkeleton(cleanHost);
  const flatSkel = skel.replace(/[-_.]/g, "");
  const hasHomoglyphs = cleanHost !== skel;
  const hasSuspiciousTld = HIGH_RISK_TLDS.some((tld) => cleanHost.endsWith(tld));
  const hasDeceptiveKeyword = DECEPTIVE_KEYWORDS.some((kw) =>
    cleanHost.includes(kw) || skel.includes(kw)
  );

  for (const b of TOP_BRAND_RULES) {
    // If the host is already in official domains, it's safe
    if (b.official_domains.some((d) => cleanHost === d || cleanHost.endsWith("." + d))) {
      return {
        host: cleanHost,
        level: "SAFE",
        score: 0,
        reasons: ["matches_official_allowlist"],
      };
    }

    for (const t of b.tokens) {
      const tokenSkel = toSkeleton(t);
      const isImpersonating =
        cleanHost.includes(t) ||
        skel.includes(tokenSkel) ||
        flatSkel.includes(tokenSkel);

      if (isImpersonating) {
        const reasons: string[] = ["imitates_brand"];
        let riskScore = 91;

        if (hasDeceptiveKeyword) {
          reasons.push("combosquatting");
          riskScore = Math.min(riskScore + 3, 98);
        }
        if (hasHomoglyphs) {
          reasons.push("punycode_homoglyph");
          riskScore = Math.min(riskScore + 2, 99);
        }
        if (hasSuspiciousTld) {
          reasons.push("suspicious_tld");
          riskScore = Math.min(riskScore + 2, 99);
        }

        return {
          host: cleanHost,
          level: "DANGEROUS",
          score: riskScore,
          reasons,
          brand: {
            name: b.name,
            confidence: 0.94,
            official_url: b.canonical_url,
          },
        };
      }
    }
  }

  // Generic evaluation for other suspicious sites
  if (hasSuspiciousTld && hasDeceptiveKeyword) {
    return {
      host: cleanHost,
      level: "SUSPICIOUS",
      score: 65,
      reasons: ["suspicious_tld", "trust_word_abuse"],
    };
  }

  return {
    host: cleanHost,
    level: "SAFE",
    score: 0,
    reasons: ["safe_navigation"],
  };
}
