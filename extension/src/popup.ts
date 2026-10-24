/**
 * SiteGuard Toolbar Popup script.
 * Displays immediate security verdict of active tab.
 */

const API_BASE = process.env.SITEGUARD_API_URL || "http://127.0.0.1:8000";

async function initPopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  let host = "";
  try {
    const url = new URL(tab.url);
    host = url.hostname.toLowerCase();
  } catch {
    return;
  }

  const hostEl = document.getElementById("popup-host")!;
  hostEl.textContent = host;

  // Check API or session for current host
  try {
    const res = await fetch(`${API_BASE}/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, client: "popup-0.1.0" }),
      signal: AbortSignal.timeout(1000),
    });

    if (res.ok) {
      const data = await res.json();
      updatePopupUI(data);
    }
  } catch (err) {
    console.warn("Popup API check failed:", err);
  }
}

function updatePopupUI(data: any) {
  const header = document.getElementById("popup-header")!;
  const title = document.getElementById("popup-title")!;
  const icon = document.getElementById("popup-icon")!;
  const score = document.getElementById("popup-score")!;
  const reasonsList = document.getElementById("popup-reasons")!;
  const btn = document.getElementById("popup-btn") as HTMLButtonElement;

  score.textContent = String(data.score || 0);
  reasonsList.replaceChildren();

  header.classList.remove("safe-bg", "warning-bg", "danger-bg");

  if (data.level === "SAFE") {
    header.classList.add("safe-bg");
    title.textContent = "Official site";
    icon.textContent = "✓";
    btn.className = "btn-action btn-gray";
    btn.textContent = "Report a problem";
    btn.onclick = () => window.open(`${API_BASE}/docs`, "_blank");

    const li1 = document.createElement("li");
    li1.textContent = "Matches the official registry entry";
    const li2 = document.createElement("li");
    li2.textContent = "Security signatures verified";
    reasonsList.appendChild(li1);
    reasonsList.appendChild(li2);
  } else if (data.level === "SUSPICIOUS") {
    header.classList.add("warning-bg");
    title.textContent = "Suspicious website";
    icon.textContent = "⚠";
    btn.className = "btn-action btn-green";
    btn.textContent = "Go to the real site";
    if (data.brand?.official_url) {
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
    }

    const reasons = data.reasons || ["Name close to brand"];
    for (const r of reasons) {
      const li = document.createElement("li");
      li.textContent = r.replace(/_/g, " ");
      reasonsList.appendChild(li);
    }
  } else {
    header.classList.add("danger-bg");
    title.textContent = "Dangerous website";
    icon.textContent = "✕";
    btn.className = "btn-action btn-green";
    btn.textContent = "Take me to the real site";
    if (data.brand?.official_url) {
      btn.onclick = () => chrome.tabs.create({ url: data.brand.official_url });
    }

    const reasons = data.reasons || ["Imitates brand", "Listed in threat feeds"];
    for (const r of reasons) {
      const li = document.createElement("li");
      li.textContent = r.replace(/_/g, " ");
      reasonsList.appendChild(li);
    }
  }
}

document.addEventListener("DOMContentLoaded", initPopup);
