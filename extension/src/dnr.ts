/**
 * DeclarativeNetRequest dynamic rules manager.
 * Maintains a set of blocking rules for locally-cached known-bad hosts.
 * These rules survive API timeouts and enforce Rule 4 (cached bad hosts stay blocked).
 */

const MAX_DNR_RULES = 5000; // Chrome's per-extension limit
const RULE_BASE_ID = 10000; // offset to avoid conflicts with static rules

/** In-memory map: host -> ruleId */
const hostToRuleId = new Map<string, number>();
let nextRuleId = RULE_BASE_ID;

function nextId(): number {
  const id = nextRuleId++;
  if (nextRuleId > RULE_BASE_ID + MAX_DNR_RULES) nextRuleId = RULE_BASE_ID;
  return id;
}

/**
 * Add a host to the declarativeNetRequest block list.
 * Does nothing if the host is already blocked.
 */
export async function blockHost(host: string): Promise<void> {
  const clean = host.toLowerCase().trim();
  if (hostToRuleId.has(clean)) return;

  const ruleId = nextId();
  hostToRuleId.set(clean, ruleId);

  const rule: chrome.declarativeNetRequest.Rule = {
    id: ruleId,
    priority: 100,
    action: { type: "block" as chrome.declarativeNetRequest.RuleActionType },
    condition: {
      urlFilter: `||${clean}^`,
      resourceTypes: ["main_frame"] as chrome.declarativeNetRequest.ResourceType[],
    },
  };

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [rule],
      removeRuleIds: [],
    });
  } catch (err) {
    // DNR not available in older Chrome or in testing environments
    console.warn("[SiteGuard] DNR blockHost failed:", err);
    hostToRuleId.delete(clean);
  }
}

/**
 * Remove a host from the declarativeNetRequest block list.
 */
export async function unblockHost(host: string): Promise<void> {
  const clean = host.toLowerCase().trim();
  const ruleId = hostToRuleId.get(clean);
  if (ruleId === undefined) return;

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [],
      removeRuleIds: [ruleId],
    });
  } catch (err) {
    console.warn("[SiteGuard] DNR unblockHost failed:", err);
  }
  hostToRuleId.delete(clean);
}

/**
 * Seed the DNR block list from a pre-cached list of known-bad hosts.
 * Called on service worker startup after loading local cache.
 */
export async function seedDNRFromBadlist(hosts: string[]): Promise<void> {
  const addRules: chrome.declarativeNetRequest.Rule[] = [];
  for (const host of hosts) {
    const clean = host.toLowerCase().trim();
    if (hostToRuleId.has(clean)) continue;
    const ruleId = nextId();
    hostToRuleId.set(clean, ruleId);
    addRules.push({
      id: ruleId,
      priority: 100,
      action: { type: "block" as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        urlFilter: `||${clean}^`,
        resourceTypes: ["main_frame"] as chrome.declarativeNetRequest.ResourceType[],
      },
    });
    if (addRules.length >= 100) break; // batch limit
  }

  if (addRules.length === 0) return;

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules,
      removeRuleIds: [],
    });
  } catch (err) {
    console.warn("[SiteGuard] DNR seedDNRFromBadlist failed:", err);
  }
}
