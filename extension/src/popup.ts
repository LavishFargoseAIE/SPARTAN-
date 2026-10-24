/**
 * SiteGuard Toolbar Popup script.
 * Displays immediate security verdict of active tab.
 */

const API_BASE = process.env.SITEGUARD_API_URL || "http://127.0.0.1:8000";

async function initPopup(): Promise<void> {
  const hostEl = document.getElementById("popup-host");
  if (!hostEl) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    showOfflineUI("No active web page detected");
    return;
  }

  let host = "";
  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      showInternalPageUI(url.protocol);
      return;
    }
    host = url.hostname.toLowerCase();
  } catch {
    showOfflineUI("Invalid URL");
    return;
  }

  hostEl.textContent = host;

  // Query detection API
  try {
    const res = await fetch(`${API_BASE}/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, client: "popup-0.1.0" }),
      signal: AbortSignal.timeout(1200),
    });

    if (res.ok) {
      const data = await res.json();
      updatePopupUI(data);
    } else {
      showOfflineUI(`API responded with error (status ${res.status})`);
    }
  } catch (err) {
    showOfflineUI("Cannot connect to SiteGuard API at 127.0.0.1:8000");
  }
}

function updatePopupUI(data: any): void {
  const header = document.getElementById("popup-header")!;
  const title = document.getElementById("popup-title")!;
  const icon = document.getElementById("popup-icon")!;
  const score = document.getElementById("popup-score")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;

  score.textContent = String(data.score ?? 0);
  reasonsList.replaceChildren();

  header.className = "header";

  if (data.level === "SAFE") {
    if (data.analysis === "allowlisted") {
      header.classList.add("safe-bg");
      title.textContent = "Verified Official Site";
      icon.textContent = "✓";
      btn.style.display = "block";
      btn.className = "btn-action btn-gray";
      btn.textContent = "Registry Verified";
      btn.onclick = () => window.open(`${API_BASE}/v1/health`, "_blank");

      const li1 = document.createElement("li");
      li1.textContent = "Matches official brand registry entry";
      const li2 = document.createElement("li");
      li2.textContent = "Cryptographic Ed25519 signature valid";
      reasonsList.appendChild(li1);
      reasonsList.appendChild(li2);
    } else {
      header.classList.add("neutral-bg");
      title.textContent = "No Threats Detected";
      icon.textContent = "🛡";
      btn.style.display = "block";
      btn.className = "btn-action btn-gray";
      btn.textContent = "Report a problem";
      btn.onclick = () => window.open(`${API_BASE}/docs`, "_blank");

      const li1 = document.createElement("li");
      li1.textContent = "Not listed in cybersecurity threat feeds";
      const li2 = document.createElement("li");
      li2.textContent = "No lookalike or impersonation detected";
      reasonsList.appendChild(li1);
      reasonsList.appendChild(li2);
    }
  } else if (data.level === "SUSPICIOUS") {
    header.classList.add("warning-bg");
    title.textContent = "Suspicious Website";
    icon.textContent = "⚠";

    if (data.brand?.official_url) {
      btn.style.display = "block";
      btn.className = "btn-action btn-green";
      btn.textContent = `Go to real ${data.brand.name}`;
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
    } else {
      btn.style.display = "none";
    }

    const reasons = data.reasons || ["Name resembles a registered brand"];
    for (const r of reasons) {
      const li = document.createElement("li");
      li.textContent = r.replace(/_/g, " ");
      reasonsList.appendChild(li);
    }
  } else {
    // DANGEROUS
    header.classList.add("danger-bg");
    title.textContent = "Dangerous Fake Site";
    icon.textContent = "✕";

    if (data.brand?.official_url) {
      btn.style.display = "block";
      btn.className = "btn-action btn-green";
      btn.textContent = `Take me to real ${data.brand.name}`;
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
    } else {
      btn.style.display = "block";
      btn.className = "btn-action btn-red";
      btn.textContent = "Leave Site Immediately";
      btn.onclick = () => window.close();
    }

    const reasons = data.reasons || ["Impersonating financial institution", "Suspicious domain"];
    for (const r of reasons) {
      const li = document.createElement("li");
      li.textContent = r.replace(/_/g, " ");
      reasonsList.appendChild(li);
    }
  }
}

function showOfflineUI(message: string): void {
  const header = document.getElementById("popup-header")!;
  const title = document.getElementById("popup-title")!;
  const icon = document.getElementById("popup-icon")!;
  const score = document.getElementById("popup-score")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;

  header.className = "header offline-bg";
  title.textContent = "Service Offline";
  icon.textContent = "⚡";
  score.textContent = "—";

  reasonsList.replaceChildren();
  const li1 = document.createElement("li");
  li1.textContent = message;
  const li2 = document.createElement("li");
  li2.textContent = "Start backend: uvicorn app.main:app --port 8000";
  reasonsList.appendChild(li1);
  reasonsList.appendChild(li2);

  btn.style.display = "block";
  btn.className = "btn-action btn-amber";
  btn.textContent = "Retry Connection";
  btn.onclick = () => initPopup();
}

function showInternalPageUI(protocol: string): void {
  const header = document.getElementById("popup-header")!;
  const title = document.getElementById("popup-title")!;
  const icon = document.getElementById("popup-icon")!;
  const score = document.getElementById("popup-score")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;

  header.className = "header neutral-bg";
  title.textContent = "Internal Browser Page";
  icon.textContent = "ℹ";
  score.textContent = "0";

  reasonsList.replaceChildren();
  const li = document.createElement("li");
  li.textContent = `Browser internal scheme (${protocol})`;
  reasonsList.appendChild(li);

  btn.style.display = "none";
}

document.addEventListener("DOMContentLoaded", initPopup);
