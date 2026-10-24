/**
 * SiteGuard Service Worker (Manifest V3)
 * Intercepts top-level navigation before rendering, queries detection API with 800ms timeout,
 * fails open on timeout, and redirects dangerous/suspicious sites to warning.html.
 */

import { isOfficial, updateAllowlist } from "./allowlist";
import { blockHost, seedDNRFromBadlist } from "./dnr";
import { detectHostLocally } from "./detector";

const API_BASE = process.env.SITEGUARD_API_URL || "http://127.0.0.1:8000";
const CHECK_ENDPOINT = `${API_BASE}/v1/check`;

// In-memory host verdict cache (survives worker lifetime, supplemented by session storage)
const localCache = new Map<string, { verdict: any; expiresAt: number }>();
// Hosts explicitly bypassed by the user during this session ("continue anyway")
const bypassedHosts = new Set<string>();
let latestGlobalVerdict: any = null;

// Programmatically enforce Spartan logo on Chrome toolbar
function enforceExtensionIcon(): void {
  if (chrome.action?.setIcon) {
    chrome.action.setIcon({
      path: {
        "16": "icons/icon-16.png",
        "19": "icons/icon-19.png",
        "24": "icons/icon-24.png",
        "32": "icons/icon-32.png",
        "38": "icons/icon-38.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png",
      },
    }).catch(() => {});
  }
}

enforceExtensionIcon();
chrome.runtime.onInstalled.addListener(() => enforceExtensionIcon());
chrome.runtime.onStartup.addListener(() => enforceExtensionIcon());
chrome.tabs.onActivated.addListener(() => enforceExtensionIcon());

// Allow popup and warning page to access session storage in Chromium MV3
if ((chrome.storage as any)?.session?.setAccessLevel) {
  (chrome.storage as any).session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "bypassHost" && message.host) {
    bypassedHosts.add(String(message.host).toLowerCase());
    sendResponse({ success: true });
    return;
  }
  if (message?.action === "getVerdictForTab" || message?.action === "getLatestVerdict") {
    const tabId = message.tabId;
    const key = "v" + tabId;
    (async () => {
      let v: any = null;
      if (chrome.storage?.local) {
        try {
          const res = await chrome.storage.local.get([key, "active_warning_verdict", "latest_verdict"]);
          v = res[key] || res["active_warning_verdict"] || res["latest_verdict"];
        } catch {}
      }
      if (!v && chrome.storage?.session) {
        try {
          const res = await chrome.storage.session.get([key, "active_warning_verdict", "latest_verdict"]);
          v = res[key] || res["active_warning_verdict"] || res["latest_verdict"];
        } catch {}
      }
      if (!v && message.host) {
        v = await getCachedVerdict(message.host);
      }
      if (!v) {
        v = latestGlobalVerdict;
      }
      sendResponse({ verdict: v });
    })();
    return true; // Keep message channel open for async response
  }
});

// Sync allowlist snapshot on worker startup
async function syncAllowlist(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/v1/registry/snapshot`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 200) {
      const data = await res.json();
      if (Array.isArray(data.official_domains)) {
        updateAllowlist(data.official_domains);
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ official_domains: data.official_domains }).catch(() => {});
        }
      }
    }
  } catch (e) {
    // Silent fail; embedded allowlist remains active
  }
}

syncAllowlist();

async function getCachedVerdict(host: string): Promise<any | null> {
  const item = localCache.get(host);
  if (item && Date.now() < item.expiresAt) {
    return item.verdict;
  }
  return null;
}

function setCachedVerdict(host: string, verdict: any, ttlSeconds: number = 3600): void {
  localCache.set(host, {
    verdict,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function callCheckApi(host: string): Promise<any> {
  try {
    const response = await fetch(CHECK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        client: "ext-0.1.0",
        lang: navigator.language || "en",
      }),
      signal: AbortSignal.timeout(800), // Strict 800ms latency budget
    });

    if (response.ok) {
      const verdict = await response.json();
      setCachedVerdict(host, verdict, verdict.ttl || 3600);
      return verdict;
    }
  } catch (err) {
    console.warn(`[SiteGuard] API timeout or unreachable for ${host}. Falling back to local detector.`);
  }

  // Fallback to local offline detector before failing open (ensures lookalikes are never missed)
  const localVerdict = await detectHostLocally(host);
  if (localVerdict.level !== "SAFE") {
    setCachedVerdict(host, localVerdict, 3600);
    return localVerdict;
  }

  // Fail open on timeout/error for benign unclassified hosts (Rule 4)
  return {
    host,
    level: "SAFE",
    score: 0,
    reasons: ["api_unreachable"],
  };
}

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    // Only intercept top-level navigations
    if (details.frameId !== 0) return;

    let host: string;
    try {
      const url = new URL(details.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      host = url.hostname.toLowerCase();
    } catch {
      return;
    }

    // Don't intercept extension pages themselves
    if (host === chrome.runtime.id.toLowerCase() || details.url.startsWith(chrome.runtime.getURL(""))) {
      return;
    }

    // Check if user explicitly clicked "continue anyway" for this host
    if (bypassedHosts.has(host)) {
      return;
    }

    // Step 1: Signed local allowlist (<5ms)
    if (await isOfficial(host)) {
      return;
    }

    // Step 2: Local cache check
    let verdict = await getCachedVerdict(host);
    if (!verdict) {
      // Step 3: API call with 800ms timeout
      verdict = await callCheckApi(host);
    }

    // Step 4: If SAFE, allow navigation to render
    if (verdict.level === "SAFE") {
      return;
    }

    // Step 5: Store verdict in session & local storage (NO DATA IN URL - Rule 6)
    const sessionKey = "v" + details.tabId;
    const sessionPayload = {
      host,
      tabId: details.tabId,
      timestamp: Date.now(),
      ...verdict,
    };
    latestGlobalVerdict = sessionPayload;
    if (chrome.storage?.session) {
      await chrome.storage.session.set({
        [sessionKey]: sessionPayload,
        latest_verdict: sessionPayload,
        active_warning_verdict: sessionPayload,
      }).catch(() => {});
    }
    if (chrome.storage?.local) {
      await chrome.storage.local.set({
        [sessionKey]: sessionPayload,
        latest_verdict: sessionPayload,
        active_warning_verdict: sessionPayload,
      }).catch(() => {});
    }

    // Step 6: Replace tab URL with warning.html
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL("warning.html"),
    });

    // Step 7: For DANGEROUS verdicts, add to DNR block list (Rule 4: cached bad hosts stay blocked)
    if (verdict.level === "DANGEROUS") {
      await blockHost(host);
    }
  },
  { url: [{ schemes: ["http", "https"] }] }
);

// Listen for tab closed to clean up session storage
chrome.tabs.onRemoved.addListener((tabId) => {
  const key = "v" + tabId;
  if (chrome.storage?.session) {
    chrome.storage.session.remove(key);
  }
  if (chrome.storage?.local) {
    chrome.storage.local.remove(key);
  }
});
