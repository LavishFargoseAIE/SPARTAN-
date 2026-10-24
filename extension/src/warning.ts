/**
 * Warning / Block Page script.
 * Safely renders verdict details from chrome.storage.session, verifies digital signature,
 * and attaches redirect to the official registry website.
 * Enforces textContent everywhere (Rule 5).
 */

import { verifySignature } from "./verify";

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
}

// Translations dictionary
const translations: Record<string, Record<string, string>> = {
  en: {
    brand_title: "This website is pretending to be {brand}",
    generic_title: "This website was blocked as dangerous",
    subtitle: "SiteGuard stopped it before the page could load. Do not enter any details.",
    tried_label: "You tried to open",
    real_label: "The real address is",
    why_title: "Why it was blocked",
    btn_main: "Take me to the real {brand} website",
    btn_sub: "{url} | verified in the official registry",
    report: "Report this site",
    why_link: "Why was this blocked?",
    continue_label: "I understand the risk, continue anyway",
    out_of: "out of 100",
  },
  hi: {
    brand_title: "यह वेबसाइट {brand} होने का ढोंग कर रही है",
    generic_title: "यह वेबसाइट खतरनाक के रूप में ब्लॉक की गई है",
    subtitle: "SiteGuard ने इसे पेज लोड होने से पहले ही रोक दिया। कोई भी जानकारी दर्ज न करें।",
    tried_label: "आपने खोलने का प्रयास किया",
    real_label: "असली पता यह है",
    why_title: "इसे क्यों ब्लॉक किया गया",
    btn_main: "मुझे असली {brand} वेबसाइट पर ले जाएं",
    btn_sub: "{url} | आधिकारिक रजिस्ट्री में सत्यापित",
    report: "इस साइट की रिपोर्ट करें",
    why_link: "इसे क्यों रोका गया?",
    continue_label: "मैं जोखिम समझता हूँ, फिर भी आगे बढ़ें",
    out_of: "100 में से",
  },
  mr: {
    brand_title: "ही वेबसाइट {brand} ची नक्कल करत आहे",
    generic_title: "ही वेबसाइट धोकादायक म्हणून ब्लॉक केली आहे",
    subtitle: "SiteGuard ने हे पेज उघडण्यापूर्वीच थांबवले आहे. कोणतीही माहिती भरू नका.",
    tried_label: "तुम्ही उघडण्याचा प्रयत्न केला",
    real_label: "खरा पत्ता हा आहे",
    why_title: "हे का ब्लॉक केले गेले",
    btn_main: "मला खऱ्या {brand} वेबसाइटवर घेऊन जा",
    btn_sub: "{url} | अधिकृत नोंदणीमध्ये पडताळलेले",
    report: "या साइटची तक्रार करा",
    why_link: "हे का थांबवले गेले?",
    continue_label: "मला धोका समजला आहे, तरीही पुढे जा",
    out_of: "१०० पैकी",
  },
};

const reasonNames: Record<string, Record<string, string>> = {
  imitates_brand: {
    en: "The name imitates {brand}",
    hi: "यह नाम {brand} की नकल करता है",
    mr: "हे नाव {brand} ची नक्कल करते",
  },
  combosquatting: {
    en: "Uses {brand} with suspicious words",
    hi: "{brand} के नाम के साथ भ्रामक शब्द जोड़े गए हैं",
    mr: "{brand} च्या नावासह दिशाभूल करणारे शब्द जोडले आहेत",
  },
  subdomain_abuse: {
    en: "Puts {brand} in the address of an unrelated website",
    hi: "किसी अन्य वेबसाइट के पते में {brand} का नाम जोड़ा गया है",
    mr: "दुसऱ्या वेबसाइटच्या पत्त्यामध्ये {brand} चे नाव टाकले आहे",
  },
  threat_feed_match: {
    en: "Listed in a trusted cybersecurity threat feed",
    hi: "साइबर सुरक्षा डेटाबेस में खतरनाक चिह्नित है",
    mr: "सायबर सुरक्षा डेटाबेसमध्ये धोकादायक म्हणून नोंदवले आहे",
  },
  listed_in_badlist: {
    en: "Confirmed fake website on security blacklist",
    hi: "सुरक्षा ब्लैकलिस्ट में पुष्ट नकली वेबसाइट",
    mr: "सुरक्षा ब्लॅकलिस्टवर खात्रीशीर बनावट वेबसाइट",
  },
  domain_age_under_30d: {
    en: "The website was registered recently",
    hi: "यह वेबसाइट हाल ही में बनाई गई है",
    mr: "ही वेबसाइट नुकतीच नोंदणीकृत केली आहे",
  },
  credential_form_cross_domain: {
    en: "The login form sends your password to another website",
    hi: "लॉगिन फॉर्म आपका पासवर्ड दूसरी वेबसाइट पर भेजता है",
    mr: "लॉगिन फॉर्म तुमचा पासवर्ड दुसऱ्या वेबसाइटवर पाठवतो",
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
    en: "Uses keywords like 'secure' or 'kyc' deceptively",
    hi: "असली दिखने के लिए 'secure' या 'kyc' जैसे शब्दों का उपयोग करता है",
    mr: "'secure' किंवा 'kyc' सारख्या शब्दांचा गैरवापर",
  },
  api_unreachable: {
    en: "Security server was unreachable (fail-open check)",
    hi: "सुरक्षा सर्वर से संपर्क नहीं हो सका",
    mr: "सुरक्षा सर्व्हरशी संपर्क होऊ शकला नाही",
  },
};

function getLang(): string {
  const code = (navigator.language || "en").toLowerCase();
  if (code.startsWith("hi")) return "hi";
  if (code.startsWith("mr")) return "mr";
  return "en";
}

async function renderWarning() {
  const lang = getLang();
  const dict = translations[lang] || translations.en;

  let tab = await chrome.tabs.getCurrent();
  let tabId = tab?.id;
  if (tabId === undefined) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = activeTab?.id;
  }
  let verdict: VerdictSessionData | null = null;

  if (tabId !== undefined) {
    const key = "v" + tabId;
    const sessionRes = await chrome.storage.session.get(key);
    verdict = sessionRes[key] || null;
  }

  // Safe fallback if opened directly
  if (!verdict) {
    verdict = {
      host: "unknown-site.xyz",
      level: "DANGEROUS",
      score: 91,
      reasons: ["threat_feed_match"],
    };
  }

  const brandName = verdict.brand?.name || "";

  // Title and Subtitle (Rule 5: textContent only)
  const titleEl = document.getElementById("title-text")!;
  if (brandName) {
    titleEl.textContent = dict.brand_title.replace("{brand}", brandName);
  } else {
    titleEl.textContent = dict.generic_title;
  }

  const subtitleEl = document.getElementById("subtitle-text")!;
  subtitleEl.textContent = dict.subtitle;

  // Host Display
  const hostEl = document.getElementById("host-display")!;
  hostEl.textContent = verdict.host;

  // Real Address line
  const realAddrContainer = document.getElementById("real-address-container")!;
  const realDomainEl = document.getElementById("real-domain")!;
  const labelRealEl = document.getElementById("label-real")!;
  labelRealEl.textContent = dict.real_label;

  if (verdict.brand?.official_url) {
    try {
      const u = new URL(verdict.brand.official_url);
      realDomainEl.textContent = u.hostname;
      realAddrContainer.hidden = false;
      realAddrContainer.style.display = "block";
    } catch {
      realAddrContainer.hidden = true;
      realAddrContainer.style.display = "none";
    }
  } else {
    realAddrContainer.hidden = true;
    realAddrContainer.style.display = "none";
  }

  // Score Dial & Badge
  const scoreEl = document.getElementById("score-text")!;
  scoreEl.textContent = String(verdict.score);

  const badgeEl = document.getElementById("level-badge")!;
  badgeEl.textContent = verdict.level.toLowerCase();

  const headerBar = document.getElementById("header-bar")!;
  const circleDial = document.getElementById("circle-dial")!;

  if (verdict.level === "SUSPICIOUS") {
    headerBar.classList.add("warning-mode");
    circleDial.style.borderColor = "var(--warning)";
    badgeEl.classList.add("warning-pill");
    badgeEl.textContent = "Suspicious";
  } else {
    circleDial.style.borderColor = "var(--danger)";
    badgeEl.textContent = "Dangerous";
  }

  // Reasons list
  const reasonsListEl = document.getElementById("reasons-list")!;
  reasonsListEl.replaceChildren();

  const reasons = (verdict.reasons && verdict.reasons.length > 0)
    ? verdict.reasons
    : ["imitates_brand"];

  for (const rCode of reasons.slice(0, 3)) {
    const li = document.createElement("li");
    const rGroup = reasonNames[rCode] || { en: rCode.replace(/_/g, " ") };
    const rText = rGroup[lang] || rGroup.en || rCode;
    li.textContent = rText.replace("{brand}", brandName || "official brand");
    reasonsListEl.appendChild(li);
  }

  // Real Site Button & Digital Signature Verification (Rule 1 & 7)
  const btnGoReal = document.getElementById("go-real") as HTMLButtonElement;
  const btnMainText = document.getElementById("btn-main-text")!;
  const btnSubText = document.getElementById("btn-sub-text")!;

  if (
    verdict.brand &&
    verdict.brand.confidence >= 0.80 &&
    (await verifySignature(verdict.brand))
  ) {
    btnMainText.textContent = dict.btn_main.replace("{brand}", verdict.brand.name);
    btnSubText.textContent = dict.btn_sub.replace("{url}", verdict.brand.official_url);

    btnGoReal.onclick = () => {
      // Rule 1: Redirect target strictly from verified registry payload
      window.location.replace(verdict!.brand!.official_url);
    };
    btnGoReal.hidden = false;
    btnGoReal.style.display = "flex";
  } else {
    btnGoReal.hidden = true;
    btnGoReal.style.display = "none";
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

    btnContinue.onclick = () => {
      window.location.replace("https://" + verdict!.host);
    };
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
      `SiteGuard Risk Analysis\nScore: ${verdict!.score}/100\nLevel: ${verdict!.level}\nSignals: ${verdict!.reasons.join(", ")}`
    );
  };
}

document.addEventListener("DOMContentLoaded", renderWarning);
