"""
Reason catalogue and translations (English, Hindi, Marathi).
"""

from typing import Dict, List, Optional

REASON_TEMPLATES: Dict[str, Dict[str, str]] = {
    "imitates_brand": {
        "en": "The name imitates {brand}",
        "hi": "यह नाम {brand} की नकल करता है",
        "mr": "हे नाव {brand} ची नक्कल करते",
    },
    "combosquatting": {
        "en": "Combines {brand} with extra trust words",
        "hi": "{brand} के नाम के साथ भ्रामक शब्द जोड़े गए हैं",
        "mr": "{brand} च्या नावासह दिशाभूल करणारे शब्द जोडले आहेत",
    },
    "subdomain_abuse": {
        "en": "Puts {brand} in the address of an unrelated site",
        "hi": "किसी अन्य वेबसाइट के पते में {brand} का नाम जोड़ा गया है",
        "mr": "दुसऱ्या वेबसाइटच्या पत्त्यामध्ये {brand} चे नाव टाकले आहे",
    },
    "domain_age_under_30d": {
        "en": "The website was registered recently",
        "hi": "यह वेबसाइट हाल ही में बनाई गई है",
        "mr": "ही वेबसाइट नुकतीच नोंदणीकृत केली आहे",
    },
    "credential_form_cross_domain": {
        "en": "The login form sends your password to another website",
        "hi": "लॉगिन फॉर्म आपका पासवर्ड दूसरी वेबसाइट पर भेजता है",
        "mr": "लॉगिन फॉर्म तुमचा पासवर्ड दुसऱ्या वेबसाइटवर पाठवतो",
    },
    "threat_feed_match": {
        "en": "Listed in a trusted cybersecurity threat feed",
        "hi": "साइबर सुरक्षा डेटाबेस में खतरनाक चिह्नित है",
        "mr": "सायबर सुरक्षा डेटाबेसमध्ये धोकादायक म्हणून नोंदवले आहे",
    },
    "listed_in_badlist": {
        "en": "Confirmed fake website on the security blacklist",
        "hi": "सुरक्षा ब्लैकलिस्ट में पुष्ट नकली वेबसाइट",
        "mr": "सुरक्षा ब्लॅकलिस्टवर खात्रीशीर बनावट वेबसाइट",
    },
    "punycode_homoglyph": {
        "en": "Uses deceptive lookalike characters in the address",
        "hi": "वेब पते में भ्रामक अक्षरों का उपयोग किया गया है",
        "mr": "वेब पत्त्यात दिशाभूल करणाऱ्या अक्षरांचा वापर केला आहे",
    },
    "suspicious_tld": {
        "en": "Unusual web address ending for this institution",
        "hi": "इस संस्था के लिए असामान्य वेबसाइट एक्सटेंशन",
        "mr": "या संस्थेसाठी असामान्य वेबसाइट विस्तार",
    },
    "trust_word_abuse": {
        "en": "Uses keywords like 'secure' or 'kyc' to look genuine",
        "hi": "असली दिखने के लिए 'secure' या 'kyc' जैसे शब्दों का उपयोग करता है",
        "mr": "अधिकृत दिसण्यासाठी 'secure' किंवा 'kyc' सारख्या शब्दांचा वापर करतो",
    },
    "shared_hosting_abuse": {
        "en": "Financial or government brand hosted on a public free site",
        "hi": "वित्तीय या सरकारी ब्रांड एक मुफ्त सार्वजनिक साइट पर होस्ट किया गया है",
        "mr": "वित्तीय किंवा सरकारी ब्रँड एका विनामूल्य सार्वजनिक साइटवर होस्ट केला आहे",
    },
    "brand_impersonation_in_title": {
        "en": "The website content or title claims to be {brand}",
        "hi": "वेबसाइट का शीर्षक या सामग्री {brand} होने का दावा करती है",
        "mr": "वेबसाइटचे शीर्षक किंवा मजकूर {brand} असल्याचा दावा करतो",
    },
    "api_unreachable": {
        "en": "Security server was unreachable (fail-open check)",
        "hi": "सुरक्षा सर्वर से संपर्क नहीं हो सका",
        "mr": "सुरक्षा सर्व्हरशी संपर्क होऊ शकला नाही",
    },
}


def format_reason(reason_code: str, lang: str = "en", brand_name: Optional[str] = None) -> str:
    """Format human-readable reason string based on language and brand."""
    template_group = REASON_TEMPLATES.get(reason_code, {
        "en": reason_code.replace("_", " ").capitalize(),
        "hi": reason_code,
        "mr": reason_code,
    })
    text = template_group.get(lang, template_group.get("en", reason_code))
    brand_str = brand_name or "official brand"
    return text.replace("{brand}", brand_str)


def select_top_reasons(reasons: List[str], max_count: int = 3) -> List[str]:
    """Select up to max_count unique reasons sorted by priority."""
    # Priority ordering (most critical to user first)
    priority = [
        "threat_feed_match",
        "listed_in_badlist",
        "credential_form_cross_domain",
        "brand_impersonation_in_title",
        "shared_hosting_abuse",
        "imitates_brand",
        "subdomain_abuse",
        "combosquatting",
        "punycode_homoglyph",
        "domain_age_under_30d",
        "trust_word_abuse",
        "suspicious_tld",
    ]
    reason_set = set(reasons)
    selected = [r for r in priority if r in reason_set]
    # Add any remaining reasons
    for r in reasons:
        if r not in selected:
            selected.append(r)
    return selected[:max_count]
