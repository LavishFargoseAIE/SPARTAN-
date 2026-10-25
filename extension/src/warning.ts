/**
 * Warning / Block Page script matching Image 3 design specification.
 * Renders verdict details from chrome.storage.session, verifies digital signature,
 * provides live multi-language toggle (English / Hindi / Marathi),
 * and safely redirects to the verified official registry website.
 * Enforces textContent everywhere (Rule 5).
 */

import { verifySignature } from "./verify";

interface WebReputationResult {
  status: string;
  is_genuine: boolean;
  summary: string;
  sources: string[];
  wiki_article?: string;
  discussion_sample: string[];
}

interface VerdictSessionData {
  host: string;
  level: string;
  score: number;
  reasons: string[];
  brand?: {
    name: string;
    confidence: number;
    official_url: string;
    signature: string;
  };
  web_reputation?: WebReputationResult;
}

// Translations matching Image 3 and Image 5
const translations: Record<string, Record<string, string>> = {
  en: {
    brand_title: "This site is pretending to be {brand}",
    generic_title: "This site was blocked as dangerous",
    subtitle: "We stopped it before it opened. Please do not type any details.",
    tried_label: "You tried to open",
    btn_main: "Take me to the real {brand}",
    opens_prefix: "Opens ",
    report: "Report this site",
    why_link: "Why was this blocked?",
    continue_label: "I understand the risk, continue anyway",
  },
  hi: {
    brand_title: "यह साइट {brand} की नकल करती है",
    generic_title: "यह लिंक न खोलें",
    subtitle: "हमने इसे खोलने से पहले ही रोक दिया। कृपया कोई जानकारी न भरें।",
    tried_label: "आपने खोलने का प्रयास किया",
    btn_main: "असली {brand} खोलें",
    opens_prefix: "खुलेगा ",
    report: "रिपोर्ट करें",
    why_link: "क्यों रोका गया?",
    continue_label: "मैं जोखिम समझता हूँ, फिर भी आगे बढ़ें",
  },
  mr: {
    brand_title: "ही साइट {brand} ची नक्कल करते",
    generic_title: "ही लिंक उघडू नका",
    subtitle: "आम्ही हे उघडण्यापूर्वीच थांबवले आहे. कोणतीही माहिती भरू नका.",
    tried_label: "तुम्ही उघडण्याचा प्रयत्न केला",
    btn_main: "खरी {brand} साइट उघडा",
    opens_prefix: "उघडेल ",
    report: "तक्रार करा",
    why_link: "का थांबवले?",
    continue_label: "मला धोका समजला आहे, तरीही पुढे जा",
  },
};

const reasonNames: Record<string, Record<string, string>> = {
  imitates_brand: {
    en: "The name copies {brand}",
    hi: "यह नाम {brand} की नकल करता है",
    mr: "हे नाव {brand} ची नक्कल करते",
  },
  typosquatting: {
    en: "The address copies {brand} using a lookalike spelling",
    hi: "यह पता मिलती-जुलती स्पेलिंग से {brand} की नकल करता है",
    mr: "हा पत्ता मिळत्याजुळत्या स्पेलिंगने {brand} ची नक्कल करतो",
  },
  combosquatting: {
    en: "Uses {brand} with deceptive security words",
    hi: "{brand} के नाम के साथ भ्रामक शब्द जोड़े गए हैं",
    mr: "{brand} च्या नावासह दिशाभूल करणारे शब्द जोडले आहेत",
  },
  subdomain_abuse: {
    en: "Puts {brand} in the address of an unrelated website",
    hi: "किसी अन्य वेबसाइट के पते में {brand} का नाम जोड़ा गया है",
    mr: "दुसऱ्या वेबसाइटच्या पत्त्यामध्ये {brand} चे नाव टाकले आहे",
  },
  shared_hosting_abuse: {
    en: "Hosted on a free shared platform ({host})",
    hi: "मुफ़्त शेअर्ड होस्टिंग प्लेटफ़ॉर्म पर बनाया गया है",
    mr: "मोफत शेअर्ड होस्टिंग प्लॅटफॉर्मवर तयार केले आहे",
  },
  threat_feed_match: {
    en: "Listed in cybersecurity threat databases",
    hi: "साइबर सुरक्षा डेटाबेस में खतरनाक चिह्नित है",
    mr: "सायबर सुरक्षा डेटाबेसमध्ये धोकादायक म्हणून नोंदवले आहे",
  },
  listed_in_badlist: {
    en: "Confirmed fake website on security blacklist",
    hi: "सुरक्षा ब्लैकलिस्ट में पुष्ट नकली वेबसाइट",
    mr: "सुरक्षा ब्लॅकलिस्टवर खात्रीशीर बनावट वेबसाइट",
  },
  domain_age_under_30d: {
    en: "The site was registered very recently",
    hi: "साइट केवल कुछ ही दिन पुरानी है",
    mr: "ही साइट नुकतीच नोंदणीकृत केली आहे",
  },
  credential_form_cross_domain: {
    en: "It would send your password elsewhere",
    hi: "यह आपका पासवर्ड कहीं और भेजेगी",
    mr: "हे तुमचा पासवर्ड दुसऱ्या वेबसाइटवर पाठवेल",
  },
  punycode_homoglyph: {
    en: "Uses deceptive lookalike characters in the address",
    hi: "वेब पते में भ्रामक अक्षरों का उपयोग किया गया है",
    mr: "वेब पत्त्यात दिशाभूल करणाऱ्या अक्षरांचा वापर केला आहे",
  },
  suspicious_tld: {
    en: "Unusual web address ending for this institution",
    hi: "इस संस्था के लिए असामान्य वेबसाइट एक्सटेंशन",
    mr: "या संस्थेसाठी असामान्य वेबसाइट विस्तार",
  },
  trust_word_abuse: {
    en: "Uses words like 'secure' or 'kyc' deceptively",
    hi: "असली दिखने के लिए 'secure' या 'kyc' जैसे शब्दों का उपयोग करता है",
    mr: "'secure' किंवा 'kyc' सारख्या शब्दांचा गैरवापर",
  },
  brand_impersonation_in_title: {
    en: "Page title copies official {brand} name",
    hi: "पेज शीर्षक आधिकारिक {brand} की नकल करता है",
    mr: "पेज शीर्षक अधिकृत {brand} ची नक्कल करते",
  },
  api_unreachable: {
    en: "Security server was unreachable (fail-open check)",
    hi: "सुरक्षा सर्वर से संपर्क नहीं हो सका",
    mr: "सुरक्षा सर्व्हरशी संपर्क होऊ शकला नाही",
  },
};

let currentLang = "en";

function getBrowserLang(): string {
  const code = (navigator.language || "en").toLowerCase();
  if (code.startsWith("hi")) return "hi";
  if (code.startsWith("mr")) return "mr";
  return "en";
}

let cachedVerdict: VerdictSessionData | null = null;

// Allow toolbar popup to query active warning verdict directly
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "getWarningVerdict") {
    loadVerdict().then((v) => {
      sendResponse({ verdict: v });
    });
    return true; // Keep message port open for async response
  }
});

async function loadVerdict(): Promise<VerdictSessionData> {
  if (cachedVerdict) return cachedVerdict;

  let tab = await chrome.tabs.getCurrent();
  let tabId = tab?.id;
  if (tabId === undefined) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = activeTab?.id;
  }

  const queryKeys = [
    tabId !== undefined ? "v" + tabId : "",
    "active_warning_verdict",
    "latest_verdict",
  ].filter(Boolean);

  let sessionRes: Record<string, any> = {};
  if (chrome.storage?.local) {
    try {
      sessionRes = await chrome.storage.local.get(queryKeys);
    } catch {}
  }
  if (!sessionRes["v" + tabId] && !sessionRes["active_warning_verdict"] && chrome.storage?.session) {
    try {
      const sRes = await chrome.storage.session.get(queryKeys);
      sessionRes = { ...sessionRes, ...sRes };
    } catch {}
  }

  const found =
    (tabId !== undefined ? sessionRes["v" + tabId] : null) ||
    sessionRes["active_warning_verdict"] ||
    sessionRes["latest_verdict"];

  if (found) {
    cachedVerdict = found;
  } else {
    // Safe fallback if opened directly
    cachedVerdict = {
      host: "amaz0n-sale.com",
      level: "DANGEROUS",
      score: 95,
      reasons: ["imitates_brand", "combosquatting", "punycode_homoglyph"],
      brand: {
        name: "Amazon India",
        confidence: 0.94,
        official_url: "https://www.amazon.in",
        signature: "",
      },
    };
  }

  // Publish active warning verdict so popup can read it without ambiguity
  try {
    if (chrome.storage?.local) {
      chrome.storage.local.set({
        active_warning_verdict: cachedVerdict,
        latest_verdict: cachedVerdict,
      }).catch(() => {});
    }
    document.title = "Blocked by SiteGuard: " + cachedVerdict.host;
    document.documentElement.dataset.verdict = JSON.stringify(cachedVerdict);
  } catch {}

  return cachedVerdict!;
}

async function renderWarning(lang: string) {
  currentLang = lang;
  const dict = translations[lang] || translations.en;
  const verdict = await loadVerdict();
  const brandName = verdict.brand?.name || "";

  // Update language switcher active states
  const btnEn = document.getElementById("lang-en");
  const btnHi = document.getElementById("lang-hi");
  const btnMr = document.getElementById("lang-mr");

  if (btnEn) btnEn.className = `lang-btn ${lang === "en" ? "active" : ""}`;
  if (btnHi) btnHi.className = `lang-btn ${lang === "hi" ? "active" : ""}`;
  if (btnMr) btnMr.className = `lang-btn ${lang === "mr" ? "active" : ""}`;

  // Title and Subtitle (Rule 5: textContent only)
  const titleEl = document.getElementById("title-text")!;
  if (brandName) {
    titleEl.textContent = dict.brand_title.replace("{brand}", brandName);
  } else {
    titleEl.textContent = dict.generic_title;
  }

  const subtitleEl = document.getElementById("subtitle-text")!;
  subtitleEl.textContent = dict.subtitle;

  // Label "You tried to open"
  const labelTried = document.getElementById("label-tried")!;
  if (labelTried) labelTried.textContent = dict.tried_label;

  // Host Display
  const hostEl = document.getElementById("host-display")!;
  hostEl.textContent = verdict.host;

  // Reasons list (Image 3 format)
  const reasonsListEl = document.getElementById("reasons-list")!;
  reasonsListEl.replaceChildren();

  const reasons = (verdict.reasons && verdict.reasons.length > 0)
    ? verdict.reasons
    : ["imitates_brand"];

  for (const rCode of reasons.slice(0, 3)) {
    const li = document.createElement("li");
    const rGroup = reasonNames[rCode] || { en: rCode.replace(/_/g, " ") };
    let rText = rGroup[lang] || rGroup.en || rCode;
    rText = rText.replace("{brand}", brandName || "official brand");
    rText = rText.replace("{host}", verdict.host);
    li.textContent = rText;
    reasonsListEl.appendChild(li);
  }

  // Real Site Button & Digital Signature Verification (Rule 1 & 7)
  const btnGoReal = document.getElementById("go-real") as HTMLButtonElement;
  const btnMainText = document.getElementById("btn-main-text")!;
  const realAddrContainer = document.getElementById("real-address-container")!;
  const opensPrefixEl = document.getElementById("opens-prefix")!;
  const realDomainEl = document.getElementById("real-domain")!;

  let sigValid = false;
  if (verdict.brand) {
    sigValid = await verifySignature(verdict.brand);
    console.log("[SiteGuard] Official redirect check:", {
      brand: verdict.brand.name,
      confidence: verdict.brand.confidence,
      official_url: verdict.brand.official_url,
      sigValid,
    });
  }

  if (
    verdict.brand &&
    verdict.brand.confidence >= 0.70 &&
    sigValid
  ) {
    btnMainText.textContent = dict.btn_main.replace("{brand}", verdict.brand.name);

    try {
      const u = new URL(verdict.brand.official_url);
      opensPrefixEl.textContent = dict.opens_prefix;
      realDomainEl.textContent = u.hostname;
      realAddrContainer.hidden = false;
      realAddrContainer.style.display = "block";
    } catch {
      realAddrContainer.hidden = true;
      realAddrContainer.style.display = "none";
    }

    btnGoReal.onclick = () => {
      // Rule 1: Redirect target strictly from verified registry payload
      window.location.replace(verdict.brand!.official_url);
    };
    btnGoReal.hidden = false;
    btnGoReal.style.display = "flex";
  } else {
    btnGoReal.hidden = true;
    btnGoReal.style.display = "none";
    realAddrContainer.hidden = true;
    realAddrContainer.style.display = "none";
  }

  // Suspicious mode continue anyway with 5-second delay
  const continueBox = document.getElementById("continue-box")!;
  const btnContinue = document.getElementById("btn-continue") as HTMLButtonElement;
  const countdownSpan = document.getElementById("countdown")!;

  if (verdict.level === "SUSPICIOUS") {
    continueBox.hidden = false;
    let secondsLeft = 5;
    btnContinue.disabled = true;

    const timer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        btnContinue.disabled = false;
        countdownSpan.textContent = "ready";
        btnContinue.textContent = dict.continue_label;
      } else {
        countdownSpan.textContent = String(secondsLeft);
      }
    }, 1000);

    btnContinue.onclick = async () => {
      try {
        await chrome.runtime.sendMessage({
          action: "bypassHost",
          host: verdict.host,
        });
      } catch (e) {
        console.warn("Bypass notification failed:", e);
      }
      window.location.replace("https://" + verdict.host);
    };
  } else {
    continueBox.hidden = true;
  }

  // Footer links
  const linkReport = document.getElementById("link-report")!;
  linkReport.textContent = dict.report;
  linkReport.onclick = (e) => {
    e.preventDefault();
    window.open("https://cybercrime.gov.in", "_blank");
  };

  const linkWhy = document.getElementById("link-why")!;
  linkWhy.textContent = dict.why_link;
  linkWhy.onclick = (e) => {
    e.preventDefault();
    alert(
      `SiteGuard Risk Analysis\nScore: ${verdict.score}/100\nLevel: ${verdict.level}\nSignals: ${verdict.reasons.join(", ")}`
    );
  };

  // Web Reputation Panel
  const webRepPanel = document.getElementById("web-rep-panel")!;
  const webRepHeaderText = document.getElementById("web-rep-header-text")!;
  const webRepStatusBadge = document.getElementById("web-rep-status-badge")!;
  const webRepSummary = document.getElementById("web-rep-summary")!;
  const webRepSnippet1 = document.getElementById("web-rep-snippet-1")!;
  const webRepSnippet2 = document.getElementById("web-rep-snippet-2")!;
  const autoRedirectBanner = document.getElementById("auto-redirect-banner")!;
  const redirectCountdownEl = document.getElementById("redirect-countdown")!;

  if (verdict.web_reputation) {
    const wr = verdict.web_reputation;

    webRepStatusBadge.textContent = wr.status.replace(/_/g, " ");
    if (wr.is_genuine) {
      webRepStatusBadge.className = "web-rep-status genuine";
    } else if (wr.status === "SCAM_REPORTED") {
      webRepStatusBadge.className = "web-rep-status scam";
    } else {
      webRepStatusBadge.className = "web-rep-status unverified";
    }

    webRepSummary.textContent = wr.summary;

    if (wr.wiki_article) {
      webRepHeaderText.textContent = `🔍 Web Research: Wikipedia — ${wr.wiki_article}`;
    } else {
      webRepHeaderText.textContent = "🔍 Web Reputation Research";
    }

    // Discussion snippets
    if (wr.discussion_sample && wr.discussion_sample.length > 0) {
      webRepSnippet1.textContent = `"${wr.discussion_sample[0]}"`;
      webRepSnippet1.hidden = false;
      webRepSnippet1.style.display = "block";
    }
    if (wr.discussion_sample && wr.discussion_sample.length > 1) {
      webRepSnippet2.textContent = `"${wr.discussion_sample[1]}"`;
      webRepSnippet2.hidden = false;
      webRepSnippet2.style.display = "block";
    }

    webRepPanel.hidden = false;
    webRepPanel.style.display = "block";

    // Auto-redirect if site confirmed genuine
    if (wr.is_genuine && wr.status !== "SCAM_REPORTED") {
      autoRedirectBanner.hidden = false;
      autoRedirectBanner.style.display = "block";
      let redirectSecs = 3;
      redirectCountdownEl.textContent = String(redirectSecs);
      const redirectTimer = setInterval(() => {
        redirectSecs--;
        if (redirectSecs <= 0) {
          clearInterval(redirectTimer);
          window.location.replace("https://" + verdict.host);
        } else {
          redirectCountdownEl.textContent = String(redirectSecs);
        }
      }, 1000);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const initialLang = getBrowserLang();

  // Attach language switcher listeners
  document.getElementById("lang-en")?.addEventListener("click", () => renderWarning("en"));
  document.getElementById("lang-hi")?.addEventListener("click", () => renderWarning("hi"));
  document.getElementById("lang-mr")?.addEventListener("click", () => renderWarning("mr"));

  renderWarning(initialLang);
});
