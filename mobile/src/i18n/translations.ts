export type Language = "en" | "hi" | "mr";

export interface Translations {
  app_name: string;
  tagline: string;
  tab_scan: string;
  tab_inspect: string;
  tab_history: string;
  tab_settings: string;
  input_placeholder: string;
  paste_btn: string;
  check_btn: string;
  checking: string;
  safe_title: string;
  safe_subtitle: string;
  suspicious_title: string;
  suspicious_subtitle: string;
  dangerous_title: string;
  dangerous_subtitle: string;
  brand_impersonation_title: string;
  take_to_real_brand: string;
  continue_anyway: string;
  risk_score: string;
  reasons_heading: string;
  qr_scanner_title: string;
  qr_scanner_sub: string;
  qr_permission_needed: string;
  grant_permission: string;
  qr_result_heading: string;
  open_verified_link: string;
  history_title: string;
  history_empty: string;
  clear_history: string;
  settings_title: string;
  api_endpoint: string;
  language: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    app_name: "SiteGuard",
    tagline: "Protects against fake bank and government sites",
    tab_scan: "QR Scanner",
    tab_inspect: "Link Checker",
    tab_history: "History",
    tab_settings: "Settings",
    input_placeholder: "Paste or type a web address (e.g. sbi-kyc.com)...",
    paste_btn: "Paste Link",
    check_btn: "Verify Link Safety",
    checking: "Inspecting threat signals...",
    safe_title: "Verified Safe Site",
    safe_subtitle: "Official or verified benign web destination.",
    suspicious_title: "Be Careful",
    suspicious_subtitle: "Suspicious characteristics detected. Do not enter passwords or bank details.",
    dangerous_title: "Fake Site Blocked",
    dangerous_subtitle: "We intercepted this malicious link before it opened.",
    brand_impersonation_title: "This site is pretending to be {brand}",
    take_to_real_brand: "Take me to the real {brand}",
    continue_anyway: "I understand the risk, continue anyway",
    risk_score: "Risk Score",
    reasons_heading: "Security Signals Detected",
    qr_scanner_title: "QR Code Safety Scanner",
    qr_scanner_sub: "Point camera at any QR code to inspect it before opening in your browser.",
    qr_permission_needed: "Camera access is needed to scan QR codes.",
    grant_permission: "Grant Camera Permission",
    qr_result_heading: "Target Verification",
    open_verified_link: "Open Verified Link",
    history_title: "Scan History",
    history_empty: "No inspected links yet. Scans are saved only on your device.",
    clear_history: "Clear Scan History",
    settings_title: "Preferences",
    api_endpoint: "SiteGuard API Server",
    language: "Display Language",
  },
  hi: {
    app_name: "साइटगार्ड (SiteGuard)",
    tagline: "नकली बैंक और सरकारी वेबसाइटों से आपकी सुरक्षा",
    tab_scan: "QR स्कैनर",
    tab_inspect: "लिंक चेकर",
    tab_history: "इतिहास",
    tab_settings: "सेटिंग्स",
    input_placeholder: "यहाँ लिंक पेस्ट या टाइप करें (उदा. sbi-kyc.com)...",
    paste_btn: "लिंक पेस्ट करें",
    check_btn: "सुरक्षा जांचें",
    checking: "जांच जारी है...",
    safe_title: "सुरक्षित वेबसाइट",
    safe_subtitle: "आधिकारिक अथवा सत्यापित सुरक्षित वेबसाइट।",
    suspicious_title: "सावधान रहें",
    suspicious_subtitle: "संदेहास्पद संकेत मिले हैं। पासवर्ड या बैंक विवरण न भरें।",
    dangerous_title: "यह लिंक न खोलें (खतरनाक)",
    dangerous_subtitle: "हमने इसे खोलने से पहले ही रोक दिया है।",
    brand_impersonation_title: "यह वेबसाइट {brand} की नकल करती है",
    take_to_real_brand: "असली {brand} वेबसाइट खोलें",
    continue_anyway: "मैं जोखिम समझता हूँ, फिर भी आगे बढ़ें",
    risk_score: "जोखिम स्कोर",
    reasons_heading: "खतरे के मुख्य कारण",
    qr_scanner_title: "QR कोड सुरक्षा स्कैनर",
    qr_scanner_sub: "ब्राउज़र में खुलने से पहले जांचने के लिए कैमरे को QR कोड पर लाएं।",
    qr_permission_needed: "QR कोड स्कैन करने के लिए कैमरे की अनुमति आवश्यक है।",
    grant_permission: "कैमरा अनुमति दें",
    qr_result_heading: "सत्यापन परिणाम",
    open_verified_link: "सत्यापित लिंक खोलें",
    history_title: "स्कैन इतिहास",
    history_empty: "अभी कोई इतिहास नहीं है। डेटा केवल आपके फ़ोन पर रहता है।",
    clear_history: "इतिहास मिटाएं",
    settings_title: "प्राथमिकताएं",
    api_endpoint: "सुरक्षा सर्वर",
    language: "भाषा (Language)",
  },
  mr: {
    app_name: "साइटगार्ड (SiteGuard)",
    tagline: "बनावट बँक आणि सरकारी संकेतस्थळांपासून संरक्षण",
    tab_scan: "QR स्कॅनर",
    tab_inspect: "लिंक तपासणी",
    tab_history: "इतिहास",
    tab_settings: "सेटिंग्ज",
    input_placeholder: "येथे लिंक पेस्ट किंवा टाइप करा...",
    paste_btn: "लिंक पेस्ट करा",
    check_btn: "सुरक्षा तपासा",
    checking: "तपासत आहे...",
    safe_title: "सुरक्षित संकेतस्थळ",
    safe_subtitle: "अधिकृत आणि सुरक्षित संकेतस्थळ.",
    suspicious_title: "काळजी घ्या",
    suspicious_subtitle: "संशयास्पद संकेत आढळले आहेत. पासवर्ड किंवा बँक माहिती भरू नका.",
    dangerous_title: "ही लिंक उघडू नका (धोकादायक)",
    dangerous_subtitle: "आम्ही हे उघडण्यापूर्वीच थांबवले आहे.",
    brand_impersonation_title: "ही साइट {brand} ची नक्कल करते",
    take_to_real_brand: "खरी {brand} साइट उघडा",
    continue_anyway: "मला धोका समजला आहे, तरीही पुढे जा",
    risk_score: "धोका स्कोर",
    reasons_heading: "सुरक्षा कारणे",
    qr_scanner_title: "QR कोड सुरक्षा स्कॅनर",
    qr_scanner_sub: "ब्राउझरमध्ये उघडण्यापूर्वी तपासण्यासाठी कॅमेरा QR कोडवर धरा.",
    qr_permission_needed: "QR कोड स्कॅन करण्यासाठी कॅमेरा परवानगी आवश्यक आहे.",
    grant_permission: "कॅमेरा परवानगी द्या",
    qr_result_heading: "तपासणी निकाल",
    open_verified_link: "सत्यापित लिंक उघडा",
    history_title: "स्कॅन इतिहास",
    history_empty: "अद्याप कोणताही इतिहास नाही. डेटा फक्त आपल्या फोनवर सुरक्षित राहतो.",
    clear_history: "इतिहास पुसा",
    settings_title: "प्राधान्ये",
    api_endpoint: "सुरक्षा सर्व्हर",
    language: "भाषा (Language)",
  },
};
