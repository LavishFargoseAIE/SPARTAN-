"""
Reason catalogue and translations (English, Hindi, Marathi).
"""

from typing import Dict, List, Optional

REASON_CATALOGUE: Dict[str, Dict[str, str]] = {
    "typosquat_domain": {
        "en": "This website's address closely mimics a well-known official domain.",
        "hi": "यह वेबसाइट एक जानी-मानी आधिकारिक वेबसाइट के नाम की नकल कर रही है।",
        "mr": "ही वेबसाइट एका नामांकित अधिकृत संकेतस्थळाच्या नावाशी हुबेहूब साधर्म्य राखणारी आहे.",
    },
    "combosquat_with_security_keyword": {
        "en": "The brand name is combined with deceptive words like 'login', 'kyc', or 'verify'.",
        "hi": "ब्रांड नाम के साथ 'लॉगिन', 'केवाईसी' या 'सत्यापन' जैसे भ्रामक शब्द जोड़े गए हैं।",
        "mr": "ब्रँड नावामध्ये 'लॉगिन', 'केवायसी' किंवा 'पडताळणी' यांसारखे दिशाभूल करणारे शब्द जोडलेले आहेत.",
    },
    "combosquat_domain": {
        "en": "A trusted brand name is embedded within an unauthorized website domain.",
        "hi": "एक विश्वसनीय ब्रांड का नाम किसी अनधिकृत डोमेन में मिलाया गया है।",
        "mr": "एका विश्वासार्ह ब्रँडचे नाव अनधिकृत डोमेनमध्ये वापरले गेले आहे.",
    },
    "brand_token_in_hostname": {
        "en": "A recognized brand identifier is present in an unauthorized host address.",
        "hi": "अनधिकृत वेबसाइट पते में एक आधिकारिक ब्रांड का नाम पाया गया है।",
        "mr": "अनधिकृत संकेतस्थळाच्या पत्त्यामध्ये अधिकृत ब्रँडचे नाव आढळले आहे.",
    },
    "subdomain_brand_impersonation": {
        "en": "The genuine brand address is placed in a subdomain to trick you into trusting it.",
        "hi": "असली ब्रांड नाम को सबडोमेन में रखकर आपको धोखा देने का प्रयास किया गया है।",
        "mr": "विश्वास निर्माण करण्यासाठी मूळ ब्रँडचे नाव सबडोमेनमध्ये टाकून फसवणूक केली आहे.",
    },
    "unauthorized_tld_brand_impersonation": {
        "en": "This brand does not operate on this domain extension.",
        "hi": "यह ब्रांड इस डोमेन एक्सटेंशन पर कार्य नहीं करता है।",
        "mr": "हा ब्रँड या डोमेन एक्स्टेंशनवर कार्यरत नाही.",
    },
    "punycode_or_homoglyph_detected": {
        "en": "Deceptive lookalike characters (homoglyphs) were used to spoof the address.",
        "hi": "नकली दिखने वाले अक्षरों (होमोग्लिफ) का उपयोग करके वेबसाइट का रूप बदला गया है।",
        "mr": "वेबसाइटचा पत्ता बनावट करण्यासाठी फसव्या अक्षरांचा (होमोग्लिफ) वापर करण्यात आला आहे.",
    },
    "suspicious_tld_for_financial_brand": {
        "en": "High-risk domain extension commonly associated with financial scams.",
        "hi": "वित्तीय घोटालों में इस्तेमाल होने वाला उच्च जोखिम वाला डोमेन एक्सटेंशन।",
        "mr": "आर्थिक फसवणुकीसाठी वारंवार वापरले जाणारे उच्च-जोखीम डोमेन एक्स्टेंशन.",
    },
    "known_threat_badlist_match": {
        "en": "This address has been confirmed as a malicious or phishing website.",
        "hi": "इस वेबसाइट पते की दुर्भावनापूर्ण या फ़िशिंग साइट के रूप में पुष्टि हो चुकी है।",
        "mr": "हे संकेतस्थळ धोकादायक किंवा फिशिंग असल्याचे निश्चित झाले आहे.",
    },
    "google_safe_browsing_match": {
        "en": "Identified as a dangerous social engineering or phishing page by threat intelligence.",
        "hi": "सुरक्षा तंत्रज्ञान द्वारा इस पृष्ठ को फ़िशिंग अथवा खतरनाक चिह्नित किया गया है।",
        "mr": "सुरक्षा यंत्रणेद्वारे हे पेज धोकादायक फिशिंग म्हणून ओळखले गेले आहे.",
    },
    "openphish_feed_match": {
        "en": "Actively reported in global phishing attack feeds.",
        "hi": "वैश्विक फ़िशिंग हमलों की सूची में सक्रिय रूप से दर्ज।",
        "mr": "जागतिक फिशिंग हल्ल्यांच्या यादीत सक्रियपणे नोंदवलेले.",
    },
    "domain_age_under_30d": {
        "en": "This domain was registered recently (less than 30 days ago).",
        "hi": "यह डोमेन हाल ही में पंजीकृत किया गया है (30 दिन से कम)।",
        "mr": "हे डोमेन नुकतेच नोंदणीकृत करण्यात आले आहे (३० दिवसांपेक्षा कमी).",
    },
    "credential_form_cross_domain": {
        "en": "This page attempts to send your sensitive login data to an untrusted external site.",
        "hi": "यह पृष्ठ आपके संवेदनशील लॉगिन डेटा को किसी बाहरी अविश्वसनीय साइट पर भेजने का प्रयास करता है।",
        "mr": "हे पेज तुमचा गोपनीय लॉगिन डेटा बाहेरील अविश्वासू संकेतस्थळावर पाठवण्याचा प्रयत्न करत आहे.",
    },
}


def get_reason_text(code: str, lang: str = "en") -> str:
    catalogue = REASON_CATALOGUE.get(code)
    if not catalogue:
        return code
    return catalogue.get(lang) or catalogue.get("en") or code


def format_reasons(codes: List[str], lang: str = "en", max_items: int = 3) -> List[Dict[str, str]]:
    formatted = []
    for code in codes[:max_items]:
        formatted.append({
            "code": code,
            "text": get_reason_text(code, lang=lang),
        })
    return formatted
