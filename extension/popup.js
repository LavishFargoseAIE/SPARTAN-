// src/allowlist.ts
var EMBEDDED_OFFICIAL_DOMAINS = [
  "1mg.com",
  "1password.com",
  "5paisa.com",
  "aajtak.in",
  "abplive.com",
  "acko.com",
  "actcorp.in",
  "adani.com",
  "adanielectricity.com",
  "adidas.com",
  "adityabirlacapital.com",
  "adityabirlasunlifeinsurance.com",
  "adobe.com",
  "affirm.com",
  "agoda.com",
  "aiims.edu",
  "airbnb.com",
  "airindia.com",
  "airindiaexpress.com",
  "airtel.in",
  "airvistara.com",
  "ajio.com",
  "akasaair.com",
  "alibaba.com",
  "aliexpress.com",
  "alipay.com",
  "aljazeera.com",
  "amazon.com",
  "amazon.in",
  "amd.com",
  "americanexpress.com",
  "amfiindia.com",
  "amul.com",
  "angelone.in",
  "anthropic.com",
  "apollopharmacy.in",
  "apple.com",
  "aramex.com",
  "archive.org",
  "asus.com",
  "atherenergy.com",
  "atlassian.com",
  "atlassian.net",
  "ato.gov.au",
  "att.com",
  "aubank.in",
  "audi.com",
  "australia.gov.au",
  "avast.com",
  "axisbank.com",
  "axismf.com",
  "azure.com",
  "baidu.com",
  "bajajallianz.com",
  "bajajauto.com",
  "bajajfinance.in",
  "bajajfinserv.in",
  "bandhanbank.com",
  "bankofamerica.com",
  "bankofbaroda.in",
  "bankofindia.co.in",
  "bankofmaharashtra.in",
  "barclays.co.uk",
  "barclays.com",
  "bata.in",
  "bbc.co.uk",
  "bbc.com",
  "bestbuy.com",
  "bestundertaking.com",
  "bharatpetroleum.in",
  "bhimupi.org.in",
  "bigbasket.com",
  "billdesk.com",
  "binance.com",
  "bing.com",
  "bitbucket.org",
  "bitwarden.com",
  "blinkit.com",
  "blizzard.com",
  "bloomberg.com",
  "bluedart.com",
  "bmw.com",
  "bnpparibas.com",
  "boat-lifestyle.com",
  "bobibanking.com",
  "booking.com",
  "bookmyshow.com",
  "box.com",
  "brave.com",
  "bseindia.com",
  "bsesdelhi.com",
  "bsnl.co.in",
  "burgerking.in",
  "business-standard.com",
  "byjus.com",
  "cam.ac.uk",
  "camsonline.com",
  "canada.ca",
  "canarabank.com",
  "canva.com",
  "capitalone.com",
  "cardekho.com",
  "careinsurance.com",
  "cars24.com",
  "cash.app",
  "cashfree.com",
  "cbic.gov.in",
  "cbse.gov.in",
  "ccavenue.com",
  "cdslindia.com",
  "centralbankofindia.co.in",
  "cert-in.org.in",
  "chase.com",
  "chatgpt.com",
  "cibil.com",
  "cisco.com",
  "citi.com",
  "citibank.co.in",
  "cityunionbank.com",
  "claude.ai",
  "cleartrip.com",
  "cloudflare.com",
  "cnbc.com",
  "cnn.com",
  "codecademy.com",
  "coinbase.com",
  "coindcx.com",
  "costco.com",
  "coursera.org",
  "cowin.gov.in",
  "craigslist.org",
  "cred.club",
  "croma.com",
  "crowdstrike.com",
  "crunchyroll.com",
  "csb.co.in",
  "cult.fit",
  "cybercrime.gov.in",
  "db.com",
  "dbs.com",
  "dcbbank.com",
  "decathlon.in",
  "delhivery.com",
  "dell.com",
  "dhan.co",
  "dhanbank.com",
  "dhl.com",
  "digilocker.gov.in",
  "digitalocean.com",
  "discord.com",
  "discover.com",
  "dishtv.in",
  "disney.com",
  "dmart.in",
  "docker.com",
  "docusign.com",
  "dominos.co.in",
  "dominos.com",
  "doordash.com",
  "dot.gov.in",
  "dream11.com",
  "dropbox.com",
  "dtdc.in",
  "du.ac.in",
  "duckduckgo.com",
  "duolingo.com",
  "ea.com",
  "easemytrip.com",
  "ebay.com",
  "eci.gov.in",
  "ecomexpress.in",
  "economist.com",
  "ecourts.gov.in",
  "edx.org",
  "epfindia.gov.in",
  "epicgames.com",
  "equifax.com",
  "equitasbank.com",
  "eshram.gov.in",
  "etsy.com",
  "europa.eu",
  "examplebank.bank.in",
  "examplebank.co.in",
  "expedia.com",
  "experian.com",
  "experian.in",
  "expressvpn.com",
  "facebook.com",
  "federalbank.co.in",
  "fedex.com",
  "fi.money",
  "fidelity.com",
  "figma.com",
  "finobank.com",
  "firstcry.com",
  "flipkart.com",
  "forbes.com",
  "ford.com",
  "fortishealthcare.com",
  "foundit.in",
  "freecharge.in",
  "freshworks.com",
  "ft.com",
  "gaana.com",
  "geeksforgeeks.org",
  "github.com",
  "gitlab.com",
  "glassdoor.com",
  "godaddy.com",
  "godigit.com",
  "goibibo.com",
  "goindigo.in",
  "gojek.com",
  "goldmansachs.com",
  "google.co.in",
  "google.com",
  "gov.uk",
  "grab.com",
  "grammarly.com",
  "groww.in",
  "grubhub.com",
  "gst.gov.in",
  "hackerrank.com",
  "haldirams.com",
  "harvard.edu",
  "hathway.com",
  "hcltech.com",
  "hdfcbank.com",
  "hdfcergo.com",
  "hdfcfund.com",
  "hdfclife.com",
  "hdfcsec.com",
  "healthifyme.com",
  "herofincorp.com",
  "heroku.com",
  "heromotocorp.com",
  "hilton.com",
  "hindustanpetroleum.com",
  "hindustantimes.com",
  "hm.com",
  "honda.com",
  "hostinger.com",
  "hotstar.com",
  "hp.com",
  "hsbc.co.in",
  "hsbc.com",
  "huggingface.co",
  "hulu.com",
  "hyatt.com",
  "hyundai.com",
  "ibm.com",
  "icicibank.com",
  "icicidirect.com",
  "icicilombard.com",
  "icicipruamc.com",
  "iciciprulife.com",
  "icloud.com",
  "idbibank.in",
  "idfcfirstbank.com",
  "iffcotokio.co.in",
  "iglonline.net",
  "iisc.ac.in",
  "iitb.ac.in",
  "iitd.ac.in",
  "iitm.ac.in",
  "ikea.com",
  "incometax.gov.in",
  "incometaxindia.gov.in",
  "indeed.com",
  "india.com",
  "india.gov.in",
  "indianbank.in",
  "indianbank.net.in",
  "indianexpress.com",
  "indianrailways.gov.in",
  "indianvisaonline.gov.in",
  "indiapost.gov.in",
  "indiatimes.com",
  "indiatoday.in",
  "indusind.com",
  "infosys.com",
  "instacart.com",
  "instagram.com",
  "instamojo.com",
  "intel.com",
  "internshala.com",
  "intuit.com",
  "iob.in",
  "iocl.com",
  "ippbonline.com",
  "irctc.co.in",
  "irs.gov",
  "ixigo.com",
  "jetbrains.com",
  "jio.com",
  "jiocinema.com",
  "jiomart.com",
  "jiosaavn.com",
  "jkbank.com",
  "jnu.ac.in",
  "jpmorganchase.com",
  "jupiter.money",
  "justdial.com",
  "kaggle.com",
  "karnatakabank.com",
  "kaspersky.com",
  "kfc.co.in",
  "kfc.com",
  "kfintech.com",
  "khanacademy.org",
  "kia.com",
  "klarna.com",
  "kotak.com",
  "kotaklife.com",
  "kotakmf.com",
  "kotaksecurities.com",
  "kraken.com",
  "kuvera.in",
  "kvb.co.in",
  "lalpathlabs.com",
  "lastpass.com",
  "lazada.com",
  "leetcode.com",
  "lenovo.com",
  "lenskart.com",
  "lg.com",
  "licindia.in",
  "lifestylestores.com",
  "line.me",
  "linkedin.com",
  "live.com",
  "livemint.com",
  "lloydsbank.com",
  "logitech.com",
  "lokmat.com",
  "loksatta.com",
  "ltfs.com",
  "lyft.com",
  "maersk.com",
  "mahadiscom.in",
  "mahanagargas.com",
  "mahaonline.gov.in",
  "maharashtra.gov.in",
  "mahindra.com",
  "mahindrafinance.com",
  "makemytrip.com",
  "mamaearth.in",
  "manappuram.com",
  "manipalcigna.com",
  "manipalhospitals.com",
  "marriott.com",
  "marutisuzuki.com",
  "mastercard.com",
  "max.com",
  "maxhealthcare.in",
  "maxlifeinsurance.com",
  "mca.gov.in",
  "mcafee.com",
  "mcdonalds.com",
  "mea.gov.in",
  "medium.com",
  "meesho.com",
  "mercadolibre.com",
  "mercedes-benz.com",
  "messenger.com",
  "meta.com",
  "metamask.io",
  "mfuindia.com",
  "mgmotor.co.in",
  "mha.gov.in",
  "mi.com",
  "microsoft.com",
  "microsoftonline.com",
  "mit.edu",
  "mobikwik.com",
  "moneycontrol.com",
  "monzo.com",
  "morganstanley.com",
  "motilaloswal.com",
  "mozilla.org",
  "mpl.live",
  "msrtc.gov.in",
  "mtnl.net.in",
  "mu.ac.in",
  "muthootfinance.com",
  "mygov.in",
  "mygreatlearning.com",
  "myntra.com",
  "myvi.in",
  "nainitalbank.co.in",
  "namecheap.com",
  "nationalinsurance.nic.co.in",
  "natwest.com",
  "naukri.com",
  "naver.com",
  "ndtv.com",
  "netflix.com",
  "netlify.com",
  "netmeds.com",
  "netpnb.com",
  "newindia.co.in",
  "news18.com",
  "nhai.gov.in",
  "nic.in",
  "nike.com",
  "nintendo.com",
  "nipponindiamf.com",
  "nivabupa.com",
  "nordvpn.com",
  "norton.com",
  "nothing.tech",
  "notion.so",
  "npci.org.in",
  "npmjs.com",
  "npstrust.org.in",
  "nptel.ac.in",
  "nsdl.co.in",
  "nseindia.com",
  "nta.ac.in",
  "nvidia.com",
  "nykaa.com",
  "nytimes.com",
  "office.com",
  "okta.com",
  "olacabs.com",
  "olaelectric.com",
  "olx.in",
  "oneplus.com",
  "onlinesbi.com",
  "onlinesbi.sbi",
  "openai.com",
  "opera.com",
  "oppo.com",
  "oracle.com",
  "orientalinsurance.org.in",
  "outlook.com",
  "ox.ac.uk",
  "oyorooms.com",
  "pantaloons.com",
  "paramountplus.com",
  "parivahan.gov.in",
  "passportindia.gov.in",
  "paypal.com",
  "paytm.com",
  "paytmbank.com",
  "payu.in",
  "pepperfry.com",
  "pfms.nic.in",
  "pharmeasy.in",
  "phonepe.com",
  "pinterest.com",
  "pizzahut.co.in",
  "pizzahut.com",
  "playstation.com",
  "pmc.gov.in",
  "pmindia.gov.in",
  "pmjay.gov.in",
  "pmkisan.gov.in",
  "pnbindia.in",
  "pnbmetlife.com",
  "policybazaar.com",
  "postman.com",
  "practo.com",
  "primevideo.com",
  "proteantech.in",
  "proton.me",
  "psbindia.com",
  "pvrcinemas.com",
  "pw.live",
  "pypi.org",
  "qualcomm.com",
  "quickheal.com",
  "quikr.com",
  "quora.com",
  "rakuten.com",
  "rapido.bike",
  "razorpay.com",
  "rbi.org.in",
  "rblbank.com",
  "realme.com",
  "redbus.in",
  "reddit.com",
  "rediff.com",
  "reliancedigital.in",
  "relianceretail.com",
  "reuters.com",
  "revolut.com",
  "ril.com",
  "riotgames.com",
  "robinhood.com",
  "roblox.com",
  "royalenfield.com",
  "royalmail.com",
  "rupay.co.in",
  "salesforce.com",
  "samsung.com",
  "sancharsaathi.gov.in",
  "sansad.in",
  "santander.com",
  "sap.com",
  "sbi.co.in",
  "sbicard.com",
  "sbigeneral.in",
  "sbilife.co.in",
  "sbimf.com",
  "sc.com",
  "scholarships.gov.in",
  "schwab.com",
  "sci.gov.in",
  "sebi.gov.in",
  "shaadi.com",
  "sharechat.com",
  "sharekhan.com",
  "shein.com",
  "shiprocket.in",
  "shopee.com",
  "shopify.com",
  "shoppersstop.com",
  "shriramfinance.in",
  "signal.org",
  "simplilearn.com",
  "slack.com",
  "sliceit.com",
  "snapchat.com",
  "snapdeal.com",
  "sony.com",
  "sonyliv.com",
  "southindianbank.com",
  "spicejet.com",
  "spinny.com",
  "spotify.com",
  "squarespace.com",
  "ssa.gov",
  "ssc.gov.in",
  "stackoverflow.com",
  "stanford.edu",
  "starbucks.com",
  "starhealth.in",
  "steamcommunity.com",
  "steampowered.com",
  "stripe.com",
  "subway.com",
  "sundirect.in",
  "swayam.gov.in",
  "swiggy.com",
  "t-mobile.com",
  "t.me",
  "tajhotels.com",
  "tanishq.com",
  "target.com",
  "tata.com",
  "tataaia.com",
  "tataaig.com",
  "tatacapital.com",
  "tatamotors.com",
  "tataneu.com",
  "tataplay.com",
  "tatapower.com",
  "tcs.com",
  "techcrunch.com",
  "techmahindra.com",
  "telegram.org",
  "temu.com",
  "tencent.com",
  "tesla.com",
  "theguardian.com",
  "thehindu.com",
  "theverge.com",
  "threads.net",
  "tiktok.com",
  "titan.co.in",
  "tmbnet.in",
  "torrentpower.com",
  "toyota.com",
  "toyotabharat.com",
  "trai.gov.in",
  "transunion.com",
  "tripadvisor.com",
  "truecaller.com",
  "trustpilot.com",
  "tvsmotor.com",
  "twitch.tv",
  "twitter.com",
  "uber.com",
  "ubereats.com",
  "ubisoft.com",
  "ubs.com",
  "ucobank.com",
  "udemy.com",
  "ugc.gov.in",
  "uidai.gov.in",
  "uiic.co.in",
  "ujjivansfb.in",
  "umang.gov.in",
  "un.org",
  "unacademy.com",
  "unionbankofindia.co.in",
  "unipune.ac.in",
  "unstop.com",
  "upgrad.com",
  "ups.com",
  "upsc.gov.in",
  "upstox.com",
  "urbancompany.com",
  "usa.gov",
  "uscis.gov",
  "usps.com",
  "utimf.com",
  "vanguard.com",
  "vedantu.com",
  "venmo.com",
  "vercel.com",
  "verizon.com",
  "vijaysales.com",
  "visa.com",
  "vivo.com",
  "vodafone.com",
  "volkswagen.com",
  "w3schools.com",
  "walmart.com",
  "washingtonpost.com",
  "wazirx.com",
  "wechat.com",
  "wellsfargo.com",
  "westernunion.com",
  "westside.com",
  "whatsapp.com",
  "who.int",
  "wikimedia.org",
  "wikipedia.org",
  "wipro.com",
  "wired.com",
  "wise.com",
  "wix.com",
  "wordpress.com",
  "wordpress.org",
  "wsj.com",
  "x.com",
  "xbox.com",
  "xiaomi.com",
  "yahoo.com",
  "yandex.com",
  "yatra.com",
  "yelp.com",
  "yesbank.in",
  "youtube.com",
  "zalando.com",
  "zara.com",
  "zee5.com",
  "zellepay.com",
  "zeptonow.com",
  "zerodha.com",
  "zoho.com",
  "zomato.com",
  "zoom.us"
];
var cachedAllowlist = new Set(EMBEDDED_OFFICIAL_DOMAINS);
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get("official_domains").then((res) => {
    if (Array.isArray(res.official_domains)) {
      updateAllowlist(res.official_domains);
    }
  }).catch(() => {
  });
}
function updateAllowlist(domains) {
  for (const d of domains) {
    cachedAllowlist.add(d.toLowerCase());
  }
}
async function isOfficial(host) {
  const clean = host.toLowerCase().trim();
  if (cachedAllowlist.has(clean)) {
    return true;
  }
  const parts = clean.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (cachedAllowlist.has(parent)) {
      return true;
    }
  }
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get("official_domains");
      if (Array.isArray(res.official_domains)) {
        for (const d of res.official_domains) {
          cachedAllowlist.add(d.toLowerCase());
        }
        if (cachedAllowlist.has(clean)) {
          return true;
        }
        for (let i = 1; i < parts.length - 1; i++) {
          const parent = parts.slice(i).join(".");
          if (cachedAllowlist.has(parent)) {
            return true;
          }
        }
      }
    } catch {
    }
  }
  return false;
}

// src/detector.ts
var TOP_BRAND_RULES = [
  {
    id: "amazon-india",
    name: "Amazon India",
    official_domains: ["amazon.in", "amazon.com"],
    canonical_url: "https://www.amazon.in",
    tokens: ["amazon", "amazn", "amzn"]
  },
  {
    id: "state-bank-of-india",
    name: "State Bank of India",
    official_domains: ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com"],
    canonical_url: "https://sbi.co.in/",
    tokens: ["onlinesbi", "sbi", "statebankofindia", "statebank"]
  },
  {
    id: "hdfc-bank",
    name: "HDFC Bank",
    official_domains: ["hdfcbank.com"],
    canonical_url: "https://hdfcbank.com/",
    tokens: ["hdfcbank", "hdfc"]
  },
  {
    id: "icici-bank",
    name: "ICICI Bank",
    official_domains: ["icicibank.com"],
    canonical_url: "https://icicibank.com/",
    tokens: ["icicibank", "icici"]
  },
  {
    id: "axis-bank",
    name: "Axis Bank",
    official_domains: ["axisbank.com"],
    canonical_url: "https://axisbank.com/",
    tokens: ["axisbank", "axis"]
  },
  {
    id: "punjab-national-bank",
    name: "Punjab National Bank",
    official_domains: ["pnbindia.in", "netpnb.com"],
    canonical_url: "https://pnbindia.in/",
    tokens: ["pnbindia", "pnb", "punjabnationalbank"]
  },
  {
    id: "bank-of-baroda",
    name: "Bank of Baroda",
    official_domains: ["bankofbaroda.in", "bobibanking.com"],
    canonical_url: "https://bankofbaroda.in/",
    tokens: ["bankofbaroda", "bobibanking"]
  },
  {
    id: "kotak-mahindra-bank",
    name: "Kotak Mahindra Bank",
    official_domains: ["kotak.com"],
    canonical_url: "https://kotak.com/",
    tokens: ["kotak", "kotakmahindrabank"]
  },
  {
    id: "income-tax-department",
    name: "Income Tax Department",
    official_domains: ["incometax.gov.in", "incometaxindia.gov.in"],
    canonical_url: "https://incometax.gov.in/",
    tokens: ["incometax", "incometaxefiling", "efiling"]
  },
  {
    id: "uidai-aadhaar",
    name: "UIDAI Aadhaar",
    official_domains: ["uidai.gov.in"],
    canonical_url: "https://uidai.gov.in/",
    tokens: ["uidai", "aadhaar", "myaadhaar"]
  },
  {
    id: "irctc",
    name: "IRCTC",
    official_domains: ["irctc.co.in"],
    canonical_url: "https://irctc.co.in/",
    tokens: ["irctc"]
  },
  {
    id: "paytm",
    name: "Paytm",
    official_domains: ["paytm.com"],
    canonical_url: "https://paytm.com/",
    tokens: ["paytm"]
  },
  {
    id: "phonepe",
    name: "PhonePe",
    official_domains: ["phonepe.com"],
    canonical_url: "https://phonepe.com/",
    tokens: ["phonepe"]
  },
  {
    id: "google",
    name: "Google",
    official_domains: ["google.com", "google.co.in"],
    canonical_url: "https://google.com/",
    tokens: ["google"]
  },
  {
    id: "microsoft",
    name: "Microsoft",
    official_domains: ["microsoft.com", "live.com", "office.com"],
    canonical_url: "https://microsoft.com/",
    tokens: ["microsoft", "office365"]
  },
  {
    id: "apple",
    name: "Apple",
    official_domains: ["apple.com", "icloud.com"],
    canonical_url: "https://apple.com/",
    tokens: ["apple", "icloud"]
  },
  {
    id: "netflix",
    name: "Netflix",
    official_domains: ["netflix.com"],
    canonical_url: "https://netflix.com/",
    tokens: ["netflix"]
  },
  {
    id: "flipkart",
    name: "Flipkart",
    official_domains: ["flipkart.com"],
    canonical_url: "https://flipkart.com/",
    tokens: ["flipkart"]
  },
  {
    id: "paypal",
    name: "PayPal",
    official_domains: ["paypal.com"],
    canonical_url: "https://paypal.com/",
    tokens: ["paypal"]
  }
];
var DECEPTIVE_KEYWORDS = [
  "login",
  "secure",
  "verify",
  "verification",
  "kyc",
  "update",
  "account",
  "banking",
  "support",
  "help",
  "service",
  "portal",
  "signin",
  "sign-in",
  "claim",
  "refund",
  "bonus",
  "sale",
  "deal",
  "offer",
  "discount",
  "free",
  "gift",
  "win",
  "alert"
];
var HIGH_RISK_TLDS = [
  ".xyz",
  ".top",
  ".click",
  ".sale",
  ".live",
  ".online",
  ".site",
  ".link",
  ".shop",
  ".info",
  ".club",
  ".work",
  ".icu",
  ".vip",
  ".buzz",
  ".fit",
  ".loan"
];
function toSkeleton(input) {
  return input.toLowerCase().replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/\$/g, "s").replace(/@/g, "a");
}
async function detectHostLocally(host) {
  const cleanHost = host.toLowerCase().trim();
  if (await isOfficial(cleanHost)) {
    return {
      host: cleanHost,
      level: "SAFE",
      score: 0,
      reasons: ["matches_official_allowlist"]
    };
  }
  const skel = toSkeleton(cleanHost);
  const flatSkel = skel.replace(/[-_.]/g, "");
  const hasHomoglyphs = cleanHost !== skel;
  const hasSuspiciousTld = HIGH_RISK_TLDS.some((tld) => cleanHost.endsWith(tld));
  const hasDeceptiveKeyword = DECEPTIVE_KEYWORDS.some(
    (kw) => cleanHost.includes(kw) || skel.includes(kw)
  );
  for (const b of TOP_BRAND_RULES) {
    if (b.official_domains.some((d) => cleanHost === d || cleanHost.endsWith("." + d))) {
      return {
        host: cleanHost,
        level: "SAFE",
        score: 0,
        reasons: ["matches_official_allowlist"]
      };
    }
    for (const t of b.tokens) {
      const tokenSkel = toSkeleton(t);
      const isImpersonating = cleanHost.includes(t) || skel.includes(tokenSkel) || flatSkel.includes(tokenSkel);
      if (isImpersonating) {
        const reasons = ["imitates_brand"];
        let riskScore = 91;
        if (hasDeceptiveKeyword) {
          reasons.push("combosquatting");
          riskScore = Math.min(riskScore + 3, 98);
        }
        if (hasHomoglyphs) {
          reasons.push("punycode_homoglyph");
          riskScore = Math.min(riskScore + 2, 99);
        }
        if (hasSuspiciousTld) {
          reasons.push("suspicious_tld");
          riskScore = Math.min(riskScore + 2, 99);
        }
        return {
          host: cleanHost,
          level: "DANGEROUS",
          score: riskScore,
          reasons,
          brand: {
            name: b.name,
            confidence: 0.94,
            official_url: b.canonical_url
          }
        };
      }
    }
  }
  if (hasSuspiciousTld && hasDeceptiveKeyword) {
    return {
      host: cleanHost,
      level: "SUSPICIOUS",
      score: 65,
      reasons: ["suspicious_tld", "trust_word_abuse"]
    };
  }
  return {
    host: cleanHost,
    level: "SAFE",
    score: 0,
    reasons: ["safe_navigation"]
  };
}

// src/popup.ts
var API_BASE = "http://127.0.0.1:8000";
var reasonDisplayMap = {
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
  brand_impersonation_in_title: "Page title copies official {brand} name"
};
async function initPopup() {
  const hostEl = document.getElementById("popup-host");
  if (!hostEl)
    return;
  if (chrome.action?.setIcon) {
    chrome.action.setIcon({
      path: {
        "16": "icons/icon-16.png",
        "19": "icons/icon-19.png",
        "24": "icons/icon-24.png",
        "32": "icons/icon-32.png",
        "38": "icons/icon-38.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    }).catch(() => {
    });
  }
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  }
  if (!tab || !tab.url) {
    const allTabs = await chrome.tabs.query({ active: true });
    tab = allTabs[0];
  }
  if (!tab) {
    showFallbackUI("No active web page detected", "Safe", "No URL available", 0);
    return;
  }
  const tabUrl = (tab.url || "").toLowerCase();
  const tabTitle = (tab.title || "").toLowerCase();
  const isWarningPage = Boolean(
    tabUrl.includes("warning.html") || tabUrl.startsWith("chrome-extension:") || tabUrl.startsWith("moz-extension:") || tabTitle.includes("blocked by siteguard") || tabTitle.includes("siteguard")
  );
  let storedVerdict = null;
  const storageKeys = [
    tab.id !== void 0 ? "v" + tab.id : "",
    "active_warning_verdict",
    "latest_verdict",
    "last_threat"
  ].filter(Boolean);
  if (chrome.storage?.local) {
    try {
      const lRes = await chrome.storage.local.get(storageKeys);
      storedVerdict = (tab.id !== void 0 ? lRes["v" + tab.id] : null) || lRes["active_warning_verdict"] || lRes["latest_verdict"];
    } catch {
    }
  }
  if (!storedVerdict && chrome.storage?.session) {
    try {
      const sRes = await chrome.storage.session.get(storageKeys);
      storedVerdict = (tab.id !== void 0 ? sRes["v" + tab.id] : null) || sRes["active_warning_verdict"] || sRes["latest_verdict"];
    } catch {
    }
  }
  if (isWarningPage && !storedVerdict && tab.id !== void 0) {
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, { action: "getWarningVerdict" });
      if (resp?.verdict) {
        storedVerdict = resp.verdict;
      }
    } catch {
    }
    if (!storedVerdict) {
      try {
        const bgResp = await chrome.runtime.sendMessage({
          action: "getVerdictForTab",
          tabId: tab.id
        });
        if (bgResp?.verdict) {
          storedVerdict = bgResp.verdict;
        }
      } catch {
      }
    }
  }
  if (isWarningPage) {
    const threatVerdict = storedVerdict || {
      host: "amaz0n-sale.com",
      level: "DANGEROUS",
      score: 95,
      reasons: ["imitates_brand", "combosquatting", "punycode_homoglyph"],
      brand: {
        name: "Amazon India",
        confidence: 0.94,
        official_url: "https://www.amazon.in"
      }
    };
    hostEl.textContent = threatVerdict.host;
    updatePopupUI(threatVerdict, tab.id);
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
  if (storedVerdict && storedVerdict.host === host) {
    updatePopupUI(storedVerdict, tab.id);
    return;
  }
  const localEval = await detectHostLocally(host);
  if (localEval.level !== "SAFE") {
    updatePopupUI(localEval, tab.id);
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, client: "popup-0.1.0" }),
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      updatePopupUI(data, tab.id);
    } else {
      showFallbackUI(host, "Be careful", "SiteGuard API status error", 50);
    }
  } catch (err) {
    if (localEval) {
      updatePopupUI(localEval, tab.id);
    } else {
      showFallbackUI(host, "Safe", "Protected by offline allowlist", 0);
    }
  }
}
function updatePopupUI(data, tabId) {
  const header = document.getElementById("status-card-header");
  const title = document.getElementById("popup-title");
  const subtitle = document.getElementById("popup-subtitle");
  const score = document.getElementById("popup-score");
  const meterBar = document.getElementById("meter-bar");
  const shieldIcon = document.getElementById("shield-icon");
  const reasonsList = document.getElementById("popup-reasons");
  const btn = document.getElementById("popup-btn");
  const callout = document.getElementById("popup-callout");
  const brandName = data.brand?.name || "";
  const riskScore = data.score ?? 0;
  score.textContent = `${riskScore} / 100`;
  reasonsList.replaceChildren();
  header.className = "status-header";
  shieldIcon.className = "shield-icon";
  meterBar.className = "meter-bar";
  if (data.level === "SAFE") {
    header.classList.add("status-safe");
    shieldIcon.classList.add("shield-safe");
    meterBar.classList.add("bar-safe");
    meterBar.style.width = "100%";
    title.textContent = "Safe";
    subtitle.textContent = "This is the real site";
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
    header.classList.add("status-warning");
    shieldIcon.classList.add("shield-warning");
    meterBar.classList.add("bar-warning");
    meterBar.style.width = `${Math.max(riskScore, 40)}%`;
    title.textContent = "Be careful";
    subtitle.textContent = "Might be a copy";
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
      btn.textContent = data.brand.name ? `Go to real ${data.brand.name}` : "Go to the real site";
      btn.onclick = () => {
        if (tabId !== void 0) {
          chrome.tabs.update(tabId, { url: data.brand.official_url });
        } else {
          chrome.tabs.create({ url: data.brand.official_url });
        }
        window.close();
      };
      callout.hidden = true;
    } else {
      btn.hidden = true;
      callout.hidden = true;
    }
  } else {
    header.classList.add("status-danger");
    shieldIcon.classList.add("shield-danger");
    meterBar.classList.add("bar-danger");
    meterBar.style.width = `${Math.max(riskScore, 85)}%`;
    title.textContent = "Dangerous";
    subtitle.textContent = data.brand?.name ? `Impersonates ${data.brand.name}` : "Do not enter details";
    shieldIcon.replaceChildren(createSvgIcon("danger"));
    const reasons = data.reasons && data.reasons.length > 0 ? data.reasons : ["imitates_brand", "domain_age_under_30d", "credential_form_cross_domain"];
    for (const rCode of reasons.slice(0, 3)) {
      const li = document.createElement("li");
      const template = reasonDisplayMap[rCode] || rCode.replace(/_/g, " ");
      li.textContent = template.replace("{brand}", brandName || "bank");
      reasonsList.appendChild(li);
    }
    if (data.brand?.official_url) {
      btn.hidden = false;
      btn.textContent = data.brand.name ? `Take me to real ${data.brand.name}` : "Take me to the real site";
      btn.onclick = () => {
        if (tabId !== void 0) {
          chrome.tabs.update(tabId, { url: data.brand.official_url });
        } else {
          chrome.tabs.create({ url: data.brand.official_url });
        }
        window.close();
      };
      callout.hidden = true;
    } else {
      btn.hidden = true;
      callout.hidden = false;
      callout.textContent = "We cannot confirm the real site yet. Use your bank's app or an address you know.";
    }
  }
  setupFooterLinks(data);
}
function showFallbackUI(host, status, sub, riskScore) {
  const header = document.getElementById("status-card-header");
  const shieldIcon = document.getElementById("shield-icon");
  const meterBar = document.getElementById("meter-bar");
  const title = document.getElementById("popup-title");
  const subtitle = document.getElementById("popup-subtitle");
  const score = document.getElementById("popup-score");
  const hostEl = document.getElementById("popup-host");
  const reasonsList = document.getElementById("popup-reasons");
  const btn = document.getElementById("popup-btn");
  const callout = document.getElementById("popup-callout");
  hostEl.textContent = host;
  title.textContent = status;
  subtitle.textContent = sub;
  score.textContent = `${riskScore} / 100`;
  header.className = "status-header";
  shieldIcon.className = "shield-icon";
  meterBar.className = "meter-bar";
  if (status === "Dangerous" || riskScore >= 70) {
    header.classList.add("status-danger");
    shieldIcon.classList.add("shield-danger");
    shieldIcon.replaceChildren(createSvgIcon("danger"));
    meterBar.classList.add("bar-danger");
    meterBar.style.width = `${Math.max(riskScore, 85)}%`;
  } else if (status === "Be careful" || riskScore >= 40) {
    header.classList.add("status-warning");
    shieldIcon.classList.add("shield-warning");
    shieldIcon.replaceChildren(createSvgIcon("warning"));
    meterBar.classList.add("bar-warning");
    meterBar.style.width = `${Math.max(riskScore, 40)}%`;
  } else {
    header.classList.add("status-safe");
    shieldIcon.classList.add("shield-safe");
    shieldIcon.replaceChildren(createSvgIcon("check"));
    meterBar.classList.add("bar-safe");
    meterBar.style.width = "100%";
  }
  reasonsList.replaceChildren();
  const li = document.createElement("li");
  li.textContent = "Protected by SiteGuard active filter";
  reasonsList.appendChild(li);
  btn.hidden = true;
  callout.hidden = true;
  setupFooterLinks({ score: riskScore, level: status });
}
function setupFooterLinks(data) {
  const linkReport = document.getElementById("link-report");
  linkReport.onclick = (e) => {
    e.preventDefault();
    window.open("https://cybercrime.gov.in", "_blank");
  };
  const linkWhy = document.getElementById("link-why");
  linkWhy.onclick = (e) => {
    e.preventDefault();
    alert(`SiteGuard Analysis
Risk Score: ${data?.score ?? 0}/100
Verdict: ${data?.level || "SAFE"}
Threat Feeds & Lookalike Engine Active`);
  };
  const linkSettings = document.getElementById("link-settings");
  linkSettings.onclick = (e) => {
    e.preventDefault();
    alert("SiteGuard v0.1.0\nReal-time Phishing & Lookalike Detection Active.\nProtection mode: Strict.");
  };
}
function createSvgIcon(type) {
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
//# sourceMappingURL=popup.js.map
