/**
 * SiteGuard Service Worker (Manifest V3)
 * Intercepts top-level navigation before rendering, performs instant (<5ms) local
 * lookalike and threat detection, redirects dangerous/suspicious sites to warning.html,
 * and maintains DNR blocks and session state.
 */

import { isOfficialSync, updateAllowlist } from "./allowlist";
import { blockHost } from "./dnr";
import { detectHostLocallySync, DetectionVerdict } from "./detector";

const API_BASE = process.env.SITEGUARD_API_URL || "http://127.0.0.1:8000";
const CHECK_ENDPOINT = `${API_BASE}/v1/check`;

// In-memory host verdict cache (survives worker lifetime, supplemented by session storage)
const localCache = new Map<string, { verdict: any; expiresAt: number }>();
// Hosts explicitly bypassed by the user during this session ("continue anyway")
const bypassedHosts = new Set<string>();
let latestGlobalVerdict: any = null;

// Programmatically enforce Spartan logo on Chrome toolbar
function enforceExtensionIcon(): void {
  if (typeof chrome !== "undefined" && chrome.action?.setIcon) {
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

if (typeof chrome !== "undefined") {
  enforceExtensionIcon();
  if (chrome.runtime?.onInstalled) chrome.runtime.onInstalled.addListener(() => enforceExtensionIcon());
  if (chrome.runtime?.onStartup) chrome.runtime.onStartup.addListener(() => enforceExtensionIcon());
  if (chrome.tabs?.onActivated) chrome.tabs.onActivated.addListener(() => enforceExtensionIcon());

  // Allow popup and warning page to access session storage in Chromium MV3
  if ((chrome.storage as any)?.session?.setAccessLevel) {
    (chrome.storage as any).session.setAccessLevel({
      accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
    }).catch(() => {});
  }
}

async function handleThreatDetection(tabId: number, host: string, verdict: DetectionVerdict): Promise<void> {
  const sessionKey = "v" + tabId;
  const sessionPayload = {
    host,
    tabId,
    timestamp: Date.now(),
    ...verdict,
  };
  latestGlobalVerdict = sessionPayload;
  setCachedVerdict(host, sessionPayload, 3600);

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

  // Redirect tab to warning.html immediately
  try {
    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL("warning.html"),
    });
  } catch (err) {
    console.warn("[SiteGuard] Redirect to warning.html failed:", err);
  }

  // Add to DNR block list
  if (verdict.level === "DANGEROUS") {
    await blockHost(host).catch(() => {});
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
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
}

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
  // First evaluate locally before any remote network call
  const localVerdict = detectHostLocallySync(host);
  if (localVerdict.level !== "SAFE") {
    setCachedVerdict(host, localVerdict, 3600);
    return localVerdict;
  }

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
    // Backend offline / unreachable
  }

  return localVerdict;
}

if (typeof chrome !== "undefined") {
  // 1. Primary navigation interceptor
  if (chrome.webNavigation?.onBeforeNavigate) {
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

        // Step 1: Signed local allowlist (<0.1ms)
        if (isOfficialSync(host)) {
          return;
        }

        // Step 2: Instant local offline lookalike & threat detector (<5ms)
        const localVerdict = detectHostLocallySync(host);
        if (localVerdict.level !== "SAFE") {
          await handleThreatDetection(details.tabId, host, localVerdict);
          return;
        }

        // Step 3: Cache or API check for remaining unclassified domains
        let verdict = await getCachedVerdict(host);
        if (!verdict) {
          verdict = await callCheckApi(host);
        }

        if (verdict.level !== "SAFE") {
          await handleThreatDetection(details.tabId, host, verdict);
        }
      },
      { url: [{ schemes: ["http", "https"] }] }
    );
  }

  // 2. Navigation error fallback: if Chrome hit NXDOMAIN or connection error on a fake domain
  if (chrome.webNavigation?.onErrorOccurred) {
    chrome.webNavigation.onErrorOccurred.addListener(
      async (details) => {
        if (details.frameId !== 0) return;

        let host: string;
        try {
          const url = new URL(details.url);
          if (url.protocol !== "http:" && url.protocol !== "https:") return;
          host = url.hostname.toLowerCase();
        } catch {
          return;
        }

        if (host === chrome.runtime.id.toLowerCase() || details.url.startsWith(chrome.runtime.getURL(""))) {
          return;
        }

        if (bypassedHosts.has(host) || isOfficialSync(host)) {
          return;
        }

        const localVerdict = detectHostLocallySync(host);
        if (localVerdict.level !== "SAFE") {
          await handleThreatDetection(details.tabId, host, localVerdict);
        }
      },
      { url: [{ schemes: ["http", "https"] }] }
    );
  }

  // 3. Tab update watcher
  if (chrome.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      const currentUrl = changeInfo.url || tab.url;
      if (!currentUrl) return;

      try {
        const url = new URL(currentUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        const host = url.hostname.toLowerCase();

        if (host === chrome.runtime.id.toLowerCase() || currentUrl.startsWith(chrome.runtime.getURL(""))) {
          return;
        }

        if (bypassedHosts.has(host) || isOfficialSync(host)) {
          return;
        }

        const localVerdict = detectHostLocallySync(host);
        if (localVerdict.level !== "SAFE") {
          await handleThreatDetection(tabId, host, localVerdict);
        }
      } catch {}
    });
  }

  // Clean up session storage when tab is closed
  if (chrome.tabs?.onRemoved) {
    chrome.tabs.onRemoved.addListener((tabId) => {
      const key = "v" + tabId;
      if (chrome.storage?.session) {
        chrome.storage.session.remove(key);
      }
      if (chrome.storage?.local) {
        chrome.storage.local.remove(key);
      }
    });
  }
}
