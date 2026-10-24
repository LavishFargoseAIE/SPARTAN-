"use strict";
(() => {
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

  // src/dnr.ts
  var MAX_DNR_RULES = 5e3;
  var RULE_BASE_ID = 1e4;
  var hostToRuleId = /* @__PURE__ */ new Map();
  var nextRuleId = RULE_BASE_ID;
  function nextId() {
    const id = nextRuleId++;
    if (nextRuleId > RULE_BASE_ID + MAX_DNR_RULES)
      nextRuleId = RULE_BASE_ID;
    return id;
  }
  async function blockHost(host) {
    const clean = host.toLowerCase().trim();
    if (hostToRuleId.has(clean))
      return;
    const ruleId = nextId();
    hostToRuleId.set(clean, ruleId);
    const rule = {
      id: ruleId,
      priority: 100,
      action: { type: "block" },
      condition: {
        urlFilter: `||${clean}^`,
        resourceTypes: ["main_frame"]
      }
    };
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule],
        removeRuleIds: []
      });
    } catch (err) {
      console.warn("[SiteGuard] DNR blockHost failed:", err);
      hostToRuleId.delete(clean);
    }
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

  // src/background.ts
  var API_BASE = "http://127.0.0.1:8000";
  var CHECK_ENDPOINT = `${API_BASE}/v1/check`;
  var localCache = /* @__PURE__ */ new Map();
  var bypassedHosts = /* @__PURE__ */ new Set();
  var latestGlobalVerdict = null;
  function enforceExtensionIcon() {
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
  }
  enforceExtensionIcon();
  chrome.runtime.onInstalled.addListener(() => enforceExtensionIcon());
  chrome.runtime.onStartup.addListener(() => enforceExtensionIcon());
  chrome.tabs.onActivated.addListener(() => enforceExtensionIcon());
  if (chrome.storage?.session?.setAccessLevel) {
    chrome.storage.session.setAccessLevel({
      accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
    }).catch(() => {
    });
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === "bypassHost" && message.host) {
      bypassedHosts.add(String(message.host).toLowerCase());
      sendResponse({ success: true });
      return;
    }
    if (message?.action === "getVerdictForTab" || message?.action === "getLatestVerdict") {
      const tabId = message.tabId;
      const key = "v" + tabId;
      (async () => {
        let v = null;
        if (chrome.storage?.local) {
          try {
            const res = await chrome.storage.local.get([key, "active_warning_verdict", "latest_verdict"]);
            v = res[key] || res["active_warning_verdict"] || res["latest_verdict"];
          } catch {
          }
        }
        if (!v && chrome.storage?.session) {
          try {
            const res = await chrome.storage.session.get([key, "active_warning_verdict", "latest_verdict"]);
            v = res[key] || res["active_warning_verdict"] || res["latest_verdict"];
          } catch {
          }
        }
        if (!v && message.host) {
          v = await getCachedVerdict(message.host);
        }
        if (!v) {
          v = latestGlobalVerdict;
        }
        sendResponse({ verdict: v });
      })();
      return true;
    }
  });
  async function syncAllowlist() {
    try {
      const res = await fetch(`${API_BASE}/v1/registry/snapshot`, {
        signal: AbortSignal.timeout(3e3)
      });
      if (res.status === 200) {
        const data = await res.json();
        if (Array.isArray(data.official_domains)) {
          updateAllowlist(data.official_domains);
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ official_domains: data.official_domains }).catch(() => {
            });
          }
        }
      }
    } catch (e) {
    }
  }
  syncAllowlist();
  async function getCachedVerdict(host) {
    const item = localCache.get(host);
    if (item && Date.now() < item.expiresAt) {
      return item.verdict;
    }
    return null;
  }
  function setCachedVerdict(host, verdict, ttlSeconds = 3600) {
    localCache.set(host, {
      verdict,
      expiresAt: Date.now() + ttlSeconds * 1e3
    });
  }
  async function callCheckApi(host) {
    try {
      const response = await fetch(CHECK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          client: "ext-0.1.0",
          lang: navigator.language || "en"
        }),
        signal: AbortSignal.timeout(800)
        // Strict 800ms latency budget
      });
      if (response.ok) {
        const verdict = await response.json();
        setCachedVerdict(host, verdict, verdict.ttl || 3600);
        return verdict;
      }
    } catch (err) {
      console.warn(`[SiteGuard] API timeout or unreachable for ${host}. Falling back to local detector.`);
    }
    const localVerdict = await detectHostLocally(host);
    if (localVerdict.level !== "SAFE") {
      setCachedVerdict(host, localVerdict, 3600);
      return localVerdict;
    }
    return {
      host,
      level: "SAFE",
      score: 0,
      reasons: ["api_unreachable"]
    };
  }
  chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
      if (details.frameId !== 0)
        return;
      let host;
      try {
        const url = new URL(details.url);
        if (url.protocol !== "http:" && url.protocol !== "https:")
          return;
        host = url.hostname.toLowerCase();
      } catch {
        return;
      }
      if (host === chrome.runtime.id.toLowerCase() || details.url.startsWith(chrome.runtime.getURL(""))) {
        return;
      }
      if (bypassedHosts.has(host)) {
        return;
      }
      if (await isOfficial(host)) {
        return;
      }
      let verdict = await getCachedVerdict(host);
      if (!verdict) {
        verdict = await callCheckApi(host);
      }
      if (verdict.level === "SAFE") {
        return;
      }
      const sessionKey = "v" + details.tabId;
      const sessionPayload = {
        host,
        tabId: details.tabId,
        timestamp: Date.now(),
        ...verdict
      };
      latestGlobalVerdict = sessionPayload;
      if (chrome.storage?.session) {
        await chrome.storage.session.set({
          [sessionKey]: sessionPayload,
          latest_verdict: sessionPayload,
          active_warning_verdict: sessionPayload
        }).catch(() => {
        });
      }
      if (chrome.storage?.local) {
        await chrome.storage.local.set({
          [sessionKey]: sessionPayload,
          latest_verdict: sessionPayload,
          active_warning_verdict: sessionPayload
        }).catch(() => {
        });
      }
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("warning.html")
      });
      if (verdict.level === "DANGEROUS") {
        await blockHost(host);
      }
    },
    { url: [{ schemes: ["http", "https"] }] }
  );
  chrome.tabs.onRemoved.addListener((tabId) => {
    const key = "v" + tabId;
    if (chrome.storage?.session) {
      chrome.storage.session.remove(key);
    }
    if (chrome.storage?.local) {
      chrome.storage.local.remove(key);
    }
  });
})();
//# sourceMappingURL=background.js.map
