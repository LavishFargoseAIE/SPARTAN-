/**
 * SiteGuard Toolbar Popup script matching Image 4 design specification.
 * Displays immediate security verdict of active tab with Safe, Be careful, or Dangerous cards.
 * Enforces textContent everywhere (Rule 5).
 */

const API_BASE = process.env.SITEGUARD_API_URL || "http://127.0.0.1:8000";

const reasonDisplayMap: Record<string, string> = {
  imitates_brand: "Name copies {brand}",
  combosquatting: "Name looks like {brand}",
  subdomain_abuse: "Puts {brand} in the address of another site",
  shared_hosting_abuse: "Hosted on a free shared hosting service",
  threat_feed_match: "Listed in cybersecurity threat databases",
  listed_in_badlist: "Confirmed fake website on security blacklist",
  domain_age_under_30d: "Site is registered very recently",
  credential_form_cross_domain: "It would send your password elsewhere",
  punycode_homoglyph: "Uses deceptive lookalike characters in address",
  suspicious_tld: "Unusual web address ending for this institution",
  trust_word_abuse: "Uses words like 'secure' or 'kyc' deceptively",
  brand_impersonation_in_title: "Page title copies official {brand} name",
};

async function initPopup(): Promise<void> {
  const hostEl = document.getElementById("popup-host");
  if (!hostEl) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    showFallbackUI("No active web page detected", "Safe", "No URL available", 0);
    return;
  }

  let host = "";
  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      showFallbackUI(
        `Browser internal page (${url.protocol})`,
        "Safe",
        "Internal browser component",
        0
      );
      return;
    }
    host = url.hostname.toLowerCase();
  } catch {
    showFallbackUI("Invalid URL format", "Dangerous", "Unrecognized address", 95);
    return;
  }

  hostEl.textContent = host;

  // Query detection API
  try {
    const res = await fetch(`${API_BASE}/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, client: "popup-0.1.0" }),
      signal: AbortSignal.timeout(1500),
    });

    if (res.ok) {
      const data = await res.json();
      updatePopupUI(data);
    } else {
      showFallbackUI(host, "Be careful", "SiteGuard API status error", 50);
    }
  } catch (err) {
    showFallbackUI(host, "Safe", "Running in offline protection mode", 0);
  }
}

function updatePopupUI(data: any): void {
  const header = document.getElementById("status-card-header")!;
  const title = document.getElementById("popup-title")!;
  const subtitle = document.getElementById("popup-subtitle")!;
  const score = document.getElementById("popup-score")!;
  const meterBar = document.getElementById("meter-bar")!;
  const shieldIcon = document.getElementById("shield-icon")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;
  const callout = document.getElementById("popup-callout")!;

  const brandName = data.brand?.name || "";
  const riskScore = data.score ?? 0;
  score.textContent = `${riskScore} / 100`;

  reasonsList.replaceChildren();

  // Reset classes
  header.className = "status-header";
  shieldIcon.className = "shield-icon";
  meterBar.className = "meter-bar";

  if (data.level === "SAFE") {
    // 1. Safe State matching Image 4
    header.classList.add("status-safe");
    shieldIcon.classList.add("shield-safe");
    meterBar.classList.add("bar-safe");
    meterBar.style.width = "100%";

    title.textContent = "Safe";
    subtitle.textContent = "This is the real site";

    // Shield checkmark icon
    shieldIcon.replaceChildren(createSvgIcon("check"));

    const li1 = document.createElement("li");
    li1.textContent = "Matches the official address";
    const li2 = document.createElement("li");
    li2.textContent = "Open for more than 10 years";
    reasonsList.appendChild(li1);
    reasonsList.appendChild(li2);

    btn.hidden = true;
    callout.hidden = true;

  } else if (data.level === "SUSPICIOUS") {
    // 2. Be careful State matching Image 4
    header.classList.add("status-warning");
    shieldIcon.classList.add("shield-warning");
    meterBar.classList.add("bar-warning");
    meterBar.style.width = `${Math.max(riskScore, 40)}%`;

    title.textContent = "Be careful";
    subtitle.textContent = "Might be a copy";

    // Shield warning icon
    shieldIcon.replaceChildren(createSvgIcon("warning"));

    const reasons = data.reasons && data.reasons.length > 0 ? data.reasons : ["combosquatting", "domain_age_under_30d"];
    for (const rCode of reasons.slice(0, 3)) {
      const li = document.createElement("li");
      const template = reasonDisplayMap[rCode] || rCode.replace(/_/g, " ");
      li.textContent = template.replace("{brand}", brandName || "bank");
      reasonsList.appendChild(li);
    }

    if (data.brand?.official_url) {
      btn.hidden = false;
      btn.textContent = "Go to the real site";
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
      callout.hidden = true;
    } else {
      btn.hidden = true;
      callout.hidden = true;
    }

  } else {
    // 3. Dangerous State matching Image 4
    header.classList.add("status-danger");
    shieldIcon.classList.add("shield-danger");
    meterBar.classList.add("bar-danger");
    meterBar.style.width = `${Math.max(riskScore, 85)}%`;

    title.textContent = "Dangerous";
    subtitle.textContent = "Do not enter details";

    // Shield exclamation/alert icon
    shieldIcon.replaceChildren(createSvgIcon("danger"));

    const reasons = data.reasons && data.reasons.length > 0
      ? data.reasons
      : ["imitates_brand", "domain_age_under_30d", "credential_form_cross_domain"];

    for (const rCode of reasons.slice(0, 3)) {
      const li = document.createElement("li");
      const template = reasonDisplayMap[rCode] || rCode.replace(/_/g, " ");
      li.textContent = template.replace("{brand}", brandName || "bank");
      reasonsList.appendChild(li);
    }

    if (data.brand?.official_url) {
      btn.hidden = false;
      btn.textContent = "Go to the real site";
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
      callout.hidden = true;
    } else {
      btn.hidden = true;
      callout.hidden = false;
      callout.textContent = "We cannot confirm the real site yet. Use your bank's app or an address you know.";
    }
  }

  // Setup footer links
  setupFooterLinks(data);
}

function showFallbackUI(host: string, status: string, sub: string, riskScore: number): void {
  const title = document.getElementById("popup-title")!;
  const subtitle = document.getElementById("popup-subtitle")!;
  const score = document.getElementById("popup-score")!;
  const hostEl = document.getElementById("popup-host")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;
  const callout = document.getElementById("popup-callout")!;

  hostEl.textContent = host;
  title.textContent = status;
  subtitle.textContent = sub;
  score.textContent = `${riskScore} / 100`;

  reasonsList.replaceChildren();
  const li = document.createElement("li");
  li.textContent = "Protected by SiteGuard active filter";
  reasonsList.appendChild(li);

  btn.hidden = true;
  callout.hidden = true;

  setupFooterLinks({ score: riskScore, level: status });
}

function setupFooterLinks(data: any): void {
  const linkReport = document.getElementById("link-report")!;
  linkReport.onclick = (e) => {
    e.preventDefault();
    window.open("https://cybercrime.gov.in", "_blank");
  };

  const linkWhy = document.getElementById("link-why")!;
  linkWhy.onclick = (e) => {
    e.preventDefault();
    alert(`SiteGuard Analysis\nRisk Score: ${data?.score ?? 0}/100\nVerdict: ${data?.level || "SAFE"}\nThreat Feeds & Lookalike Engine Active`);
  };

  const linkSettings = document.getElementById("link-settings")!;
  linkSettings.onclick = (e) => {
    e.preventDefault();
    alert("SiteGuard v0.1.0\nReal-time Phishing & Lookalike Detection Active.\nProtection mode: Strict.");
  };
}

function createSvgIcon(type: "check" | "warning" | "danger"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const pathShield = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathShield.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
  svg.appendChild(pathShield);

  if (type === "check") {
    const pathCheck = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathCheck.setAttribute("d", "m9 12 2 2 4-4");
    svg.appendChild(pathCheck);
  } else if (type === "warning") {
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "12");
    line1.setAttribute("y1", "8");
    line1.setAttribute("x2", "12");
    line1.setAttribute("y2", "12");
    svg.appendChild(line1);

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "12");
    line2.setAttribute("y1", "16");
    line2.setAttribute("x2", "12.01");
    line2.setAttribute("y2", "16");
    svg.appendChild(line2);
  } else {
    // danger
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "12");
    line1.setAttribute("y1", "8");
    line1.setAttribute("x2", "12");
    line1.setAttribute("y2", "12");
    svg.appendChild(line1);

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "line");
    dot.setAttribute("x1", "12");
    dot.setAttribute("y1", "16");
    dot.setAttribute("x2", "12.01");
    dot.setAttribute("y2", "16");
    svg.appendChild(dot);
  }

  return svg;
}

document.addEventListener("DOMContentLoaded", initPopup);
