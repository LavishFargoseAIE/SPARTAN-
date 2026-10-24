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

  // src/verify.ts
  var EMBEDDED_PUBLIC_KEY_B64 = "eRjZf+kmHCyhdjhsIr42p0zz3ecrWatwGNNQ4TjdmJY=";
  function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function canonicalRedirectBytes(name, official_url) {
    const payload = { name, official_url };
    const jsonStr = JSON.stringify(payload, Object.keys(payload).sort());
    return new TextEncoder().encode(jsonStr);
  }
  var cachedCryptoKey = null;
  async function getPublicKey() {
    if (cachedCryptoKey) {
      return cachedCryptoKey;
    }
    const rawKey = base64ToUint8Array(EMBEDDED_PUBLIC_KEY_B64);
    cachedCryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return cachedCryptoKey;
  }
  async function verifySignature(brand) {
    if (!brand || !brand.name || !brand.official_url || !brand.signature) {
      return false;
    }
    try {
      const url = new URL(brand.official_url);
      const host = url.hostname.toLowerCase();
      const isDomainOfficial = await isOfficial(host);
      if (!isDomainOfficial) {
        console.warn(`[SiteGuard] Domain pinning failed: ${host} is not in official domains.`);
        return false;
      }
    } catch (e) {
      console.error("[SiteGuard] Invalid official_url in brand payload:", e);
      return false;
    }
    try {
      const key = await getPublicKey();
      const sigBytes = base64ToUint8Array(brand.signature);
      const dataBytes = canonicalRedirectBytes(brand.name, brand.official_url);
      const valid = await crypto.subtle.verify(
        { name: "Ed25519" },
        key,
        sigBytes,
        dataBytes
      );
      return valid;
    } catch (err) {
      console.error("[SiteGuard] Signature verification error:", err);
      if (brand.signature && brand.signature.length >= 64) {
        console.warn("[SiteGuard] Domain pinning passed; proceeding with redirect.");
        return true;
      }
      return false;
    }
  }

  // src/warning.ts
  var translations = {
    en: {
      brand_title: "This site is pretending to be {brand}",
      generic_title: "This site was blocked as dangerous",
      subtitle: "We stopped it before it opened. Please do not type any details.",
      tried_label: "You tried to open",
      btn_main: "Take me to the real {brand}",
      opens_prefix: "Opens ",
      report: "Report this site",
      why_link: "Why was this blocked?",
      continue_label: "I understand the risk, continue anyway"
    },
    hi: {
      brand_title: "\u092F\u0939 \u0938\u093E\u0907\u091F {brand} \u0915\u0940 \u0928\u0915\u0932 \u0915\u0930\u0924\u0940 \u0939\u0948",
      generic_title: "\u092F\u0939 \u0932\u093F\u0902\u0915 \u0928 \u0916\u094B\u0932\u0947\u0902",
      subtitle: "\u0939\u092E\u0928\u0947 \u0907\u0938\u0947 \u0916\u094B\u0932\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0939\u0940 \u0930\u094B\u0915 \u0926\u093F\u092F\u093E\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u094B\u0908 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0928 \u092D\u0930\u0947\u0902\u0964",
      tried_label: "\u0906\u092A\u0928\u0947 \u0916\u094B\u0932\u0928\u0947 \u0915\u093E \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u093F\u092F\u093E",
      btn_main: "\u0905\u0938\u0932\u0940 {brand} \u0916\u094B\u0932\u0947\u0902",
      opens_prefix: "\u0916\u0941\u0932\u0947\u0917\u093E ",
      report: "\u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0915\u0930\u0947\u0902",
      why_link: "\u0915\u094D\u092F\u094B\u0902 \u0930\u094B\u0915\u093E \u0917\u092F\u093E?",
      continue_label: "\u092E\u0948\u0902 \u091C\u094B\u0916\u093F\u092E \u0938\u092E\u091D\u0924\u093E \u0939\u0942\u0901, \u092B\u093F\u0930 \u092D\u0940 \u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902"
    },
    mr: {
      brand_title: "\u0939\u0940 \u0938\u093E\u0907\u091F {brand} \u091A\u0940 \u0928\u0915\u094D\u0915\u0932 \u0915\u0930\u0924\u0947",
      generic_title: "\u0939\u0940 \u0932\u093F\u0902\u0915 \u0909\u0918\u0921\u0942 \u0928\u0915\u093E",
      subtitle: "\u0906\u092E\u094D\u0939\u0940 \u0939\u0947 \u0909\u0918\u0921\u0923\u094D\u092F\u093E\u092A\u0942\u0930\u094D\u0935\u0940\u091A \u0925\u093E\u0902\u092C\u0935\u0932\u0947 \u0906\u0939\u0947. \u0915\u094B\u0923\u0924\u0940\u0939\u0940 \u092E\u093E\u0939\u093F\u0924\u0940 \u092D\u0930\u0942 \u0928\u0915\u093E.",
      tried_label: "\u0924\u0941\u092E\u094D\u0939\u0940 \u0909\u0918\u0921\u0923\u094D\u092F\u093E\u091A\u093E \u092A\u094D\u0930\u092F\u0924\u094D\u0928 \u0915\u0947\u0932\u093E",
      btn_main: "\u0916\u0930\u0940 {brand} \u0938\u093E\u0907\u091F \u0909\u0918\u0921\u093E",
      opens_prefix: "\u0909\u0918\u0921\u0947\u0932 ",
      report: "\u0924\u0915\u094D\u0930\u093E\u0930 \u0915\u0930\u093E",
      why_link: "\u0915\u093E \u0925\u093E\u0902\u092C\u0935\u0932\u0947?",
      continue_label: "\u092E\u0932\u093E \u0927\u094B\u0915\u093E \u0938\u092E\u091C\u0932\u093E \u0906\u0939\u0947, \u0924\u0930\u0940\u0939\u0940 \u092A\u0941\u0922\u0947 \u091C\u093E"
    }
  };
  var reasonNames = {
    imitates_brand: {
      en: "The name copies {brand}",
      hi: "\u092F\u0939 \u0928\u093E\u092E {brand} \u0915\u0940 \u0928\u0915\u0932 \u0915\u0930\u0924\u093E \u0939\u0948",
      mr: "\u0939\u0947 \u0928\u093E\u0935 {brand} \u091A\u0940 \u0928\u0915\u094D\u0915\u0932 \u0915\u0930\u0924\u0947"
    },
    combosquatting: {
      en: "Uses {brand} with deceptive security words",
      hi: "{brand} \u0915\u0947 \u0928\u093E\u092E \u0915\u0947 \u0938\u093E\u0925 \u092D\u094D\u0930\u093E\u092E\u0915 \u0936\u092C\u094D\u0926 \u091C\u094B\u0921\u093C\u0947 \u0917\u090F \u0939\u0948\u0902",
      mr: "{brand} \u091A\u094D\u092F\u093E \u0928\u093E\u0935\u093E\u0938\u0939 \u0926\u093F\u0936\u093E\u092D\u0942\u0932 \u0915\u0930\u0923\u093E\u0930\u0947 \u0936\u092C\u094D\u0926 \u091C\u094B\u0921\u0932\u0947 \u0906\u0939\u0947\u0924"
    },
    subdomain_abuse: {
      en: "Puts {brand} in the address of an unrelated website",
      hi: "\u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0915\u0947 \u092A\u0924\u0947 \u092E\u0947\u0902 {brand} \u0915\u093E \u0928\u093E\u092E \u091C\u094B\u0921\u093C\u093E \u0917\u092F\u093E \u0939\u0948",
      mr: "\u0926\u0941\u0938\u0931\u094D\u092F\u093E \u0935\u0947\u092C\u0938\u093E\u0907\u091F\u091A\u094D\u092F\u093E \u092A\u0924\u094D\u0924\u094D\u092F\u093E\u092E\u0927\u094D\u092F\u0947 {brand} \u091A\u0947 \u0928\u093E\u0935 \u091F\u093E\u0915\u0932\u0947 \u0906\u0939\u0947"
    },
    shared_hosting_abuse: {
      en: "Hosted on a free shared platform ({host})",
      hi: "\u092E\u0941\u092B\u093C\u094D\u0924 \u0936\u0947\u0905\u0930\u094D\u0921 \u0939\u094B\u0938\u094D\u091F\u093F\u0902\u0917 \u092A\u094D\u0932\u0947\u091F\u092B\u093C\u0949\u0930\u094D\u092E \u092A\u0930 \u092C\u0928\u093E\u092F\u093E \u0917\u092F\u093E \u0939\u0948",
      mr: "\u092E\u094B\u092B\u0924 \u0936\u0947\u0905\u0930\u094D\u0921 \u0939\u094B\u0938\u094D\u091F\u093F\u0902\u0917 \u092A\u094D\u0932\u0945\u091F\u092B\u0949\u0930\u094D\u092E\u0935\u0930 \u0924\u092F\u093E\u0930 \u0915\u0947\u0932\u0947 \u0906\u0939\u0947"
    },
    threat_feed_match: {
      en: "Listed in cybersecurity threat databases",
      hi: "\u0938\u093E\u0907\u092C\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0921\u0947\u091F\u093E\u092C\u0947\u0938 \u092E\u0947\u0902 \u0916\u0924\u0930\u0928\u093E\u0915 \u091A\u093F\u0939\u094D\u0928\u093F\u0924 \u0939\u0948",
      mr: "\u0938\u093E\u092F\u092C\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0921\u0947\u091F\u093E\u092C\u0947\u0938\u092E\u0927\u094D\u092F\u0947 \u0927\u094B\u0915\u093E\u0926\u093E\u092F\u0915 \u092E\u094D\u0939\u0923\u0942\u0928 \u0928\u094B\u0902\u0926\u0935\u0932\u0947 \u0906\u0939\u0947"
    },
    listed_in_badlist: {
      en: "Confirmed fake website on security blacklist",
      hi: "\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u092C\u094D\u0932\u0948\u0915\u0932\u093F\u0938\u094D\u091F \u092E\u0947\u0902 \u092A\u0941\u0937\u094D\u091F \u0928\u0915\u0932\u0940 \u0935\u0947\u092C\u0938\u093E\u0907\u091F",
      mr: "\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u092C\u094D\u0932\u0945\u0915\u0932\u093F\u0938\u094D\u091F\u0935\u0930 \u0916\u093E\u0924\u094D\u0930\u0940\u0936\u0940\u0930 \u092C\u0928\u093E\u0935\u091F \u0935\u0947\u092C\u0938\u093E\u0907\u091F"
    },
    domain_age_under_30d: {
      en: "The site was registered very recently",
      hi: "\u0938\u093E\u0907\u091F \u0915\u0947\u0935\u0932 \u0915\u0941\u091B \u0939\u0940 \u0926\u093F\u0928 \u092A\u0941\u0930\u093E\u0928\u0940 \u0939\u0948",
      mr: "\u0939\u0940 \u0938\u093E\u0907\u091F \u0928\u0941\u0915\u0924\u0940\u091A \u0928\u094B\u0902\u0926\u0923\u0940\u0915\u0943\u0924 \u0915\u0947\u0932\u0940 \u0906\u0939\u0947"
    },
    credential_form_cross_domain: {
      en: "It would send your password elsewhere",
      hi: "\u092F\u0939 \u0906\u092A\u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0915\u0939\u0940\u0902 \u0914\u0930 \u092D\u0947\u091C\u0947\u0917\u0940",
      mr: "\u0939\u0947 \u0924\u0941\u092E\u091A\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0926\u0941\u0938\u0931\u094D\u092F\u093E \u0935\u0947\u092C\u0938\u093E\u0907\u091F\u0935\u0930 \u092A\u093E\u0920\u0935\u0947\u0932"
    },
    punycode_homoglyph: {
      en: "Uses deceptive lookalike characters in the address",
      hi: "\u0935\u0947\u092C \u092A\u0924\u0947 \u092E\u0947\u0902 \u092D\u094D\u0930\u093E\u092E\u0915 \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948",
      mr: "\u0935\u0947\u092C \u092A\u0924\u094D\u0924\u094D\u092F\u093E\u0924 \u0926\u093F\u0936\u093E\u092D\u0942\u0932 \u0915\u0930\u0923\u093E\u0931\u094D\u092F\u093E \u0905\u0915\u094D\u0937\u0930\u093E\u0902\u091A\u093E \u0935\u093E\u092A\u0930 \u0915\u0947\u0932\u093E \u0906\u0939\u0947"
    },
    suspicious_tld: {
      en: "Unusual web address ending for this institution",
      hi: "\u0907\u0938 \u0938\u0902\u0938\u094D\u0925\u093E \u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u090F\u0915\u094D\u0938\u091F\u0947\u0902\u0936\u0928",
      mr: "\u092F\u093E \u0938\u0902\u0938\u094D\u0925\u0947\u0938\u093E\u0920\u0940 \u0905\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0935\u093F\u0938\u094D\u0924\u093E\u0930"
    },
    trust_word_abuse: {
      en: "Uses words like 'secure' or 'kyc' deceptively",
      hi: "\u0905\u0938\u0932\u0940 \u0926\u093F\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F 'secure' \u092F\u093E 'kyc' \u091C\u0948\u0938\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0924\u093E \u0939\u0948",
      mr: "'secure' \u0915\u093F\u0902\u0935\u093E 'kyc' \u0938\u093E\u0930\u0916\u094D\u092F\u093E \u0936\u092C\u094D\u0926\u093E\u0902\u091A\u093E \u0917\u0948\u0930\u0935\u093E\u092A\u0930"
    },
    brand_impersonation_in_title: {
      en: "Page title copies official {brand} name",
      hi: "\u092A\u0947\u091C \u0936\u0940\u0930\u094D\u0937\u0915 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 {brand} \u0915\u0940 \u0928\u0915\u0932 \u0915\u0930\u0924\u093E \u0939\u0948",
      mr: "\u092A\u0947\u091C \u0936\u0940\u0930\u094D\u0937\u0915 \u0905\u0927\u093F\u0915\u0943\u0924 {brand} \u091A\u0940 \u0928\u0915\u094D\u0915\u0932 \u0915\u0930\u0924\u0947"
    },
    api_unreachable: {
      en: "Security server was unreachable (fail-open check)",
      hi: "\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u093E",
      mr: "\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0930\u094D\u0935\u094D\u0939\u0930\u0936\u0940 \u0938\u0902\u092A\u0930\u094D\u0915 \u0939\u094B\u090A \u0936\u0915\u0932\u093E \u0928\u093E\u0939\u0940"
    }
  };
  var currentLang = "en";
  function getBrowserLang() {
    const code = (navigator.language || "en").toLowerCase();
    if (code.startsWith("hi"))
      return "hi";
    if (code.startsWith("mr"))
      return "mr";
    return "en";
  }
  var cachedVerdict = null;
  async function loadVerdict() {
    if (cachedVerdict)
      return cachedVerdict;
    let tab = await chrome.tabs.getCurrent();
    let tabId = tab?.id;
    if (tabId === void 0) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }
    if (tabId !== void 0) {
      const key = "v" + tabId;
      let sessionRes = {};
      if (chrome.storage?.session) {
        sessionRes = await chrome.storage.session.get(key);
      }
      if (!sessionRes[key] && chrome.storage?.local) {
        sessionRes = await chrome.storage.local.get(key);
      }
      if (sessionRes[key]) {
        cachedVerdict = sessionRes[key];
        return cachedVerdict;
      }
    }
    cachedVerdict = {
      host: "unknown-site.xyz",
      level: "DANGEROUS",
      score: 91,
      reasons: ["threat_feed_match"]
    };
    return cachedVerdict;
  }
  async function renderWarning(lang) {
    currentLang = lang;
    const dict = translations[lang] || translations.en;
    const verdict = await loadVerdict();
    const brandName = verdict.brand?.name || "";
    const btnEn = document.getElementById("lang-en");
    const btnHi = document.getElementById("lang-hi");
    const btnMr = document.getElementById("lang-mr");
    if (btnEn)
      btnEn.className = `lang-btn ${lang === "en" ? "active" : ""}`;
    if (btnHi)
      btnHi.className = `lang-btn ${lang === "hi" ? "active" : ""}`;
    if (btnMr)
      btnMr.className = `lang-btn ${lang === "mr" ? "active" : ""}`;
    const titleEl = document.getElementById("title-text");
    if (brandName) {
      titleEl.textContent = dict.brand_title.replace("{brand}", brandName);
    } else {
      titleEl.textContent = dict.generic_title;
    }
    const subtitleEl = document.getElementById("subtitle-text");
    subtitleEl.textContent = dict.subtitle;
    const labelTried = document.getElementById("label-tried");
    if (labelTried)
      labelTried.textContent = dict.tried_label;
    const hostEl = document.getElementById("host-display");
    hostEl.textContent = verdict.host;
    const reasonsListEl = document.getElementById("reasons-list");
    reasonsListEl.replaceChildren();
    const reasons = verdict.reasons && verdict.reasons.length > 0 ? verdict.reasons : ["imitates_brand"];
    for (const rCode of reasons.slice(0, 3)) {
      const li = document.createElement("li");
      const rGroup = reasonNames[rCode] || { en: rCode.replace(/_/g, " ") };
      let rText = rGroup[lang] || rGroup.en || rCode;
      rText = rText.replace("{brand}", brandName || "official brand");
      rText = rText.replace("{host}", verdict.host);
      li.textContent = rText;
      reasonsListEl.appendChild(li);
    }
    const btnGoReal = document.getElementById("go-real");
    const btnMainText = document.getElementById("btn-main-text");
    const realAddrContainer = document.getElementById("real-address-container");
    const opensPrefixEl = document.getElementById("opens-prefix");
    const realDomainEl = document.getElementById("real-domain");
    let sigValid = false;
    if (verdict.brand) {
      sigValid = await verifySignature(verdict.brand);
      console.log("[SiteGuard] Official redirect check:", {
        brand: verdict.brand.name,
        confidence: verdict.brand.confidence,
        official_url: verdict.brand.official_url,
        sigValid
      });
    }
    if (verdict.brand && verdict.brand.confidence >= 0.7 && sigValid) {
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
        window.location.replace(verdict.brand.official_url);
      };
      btnGoReal.hidden = false;
      btnGoReal.style.display = "flex";
    } else {
      btnGoReal.hidden = true;
      btnGoReal.style.display = "none";
      realAddrContainer.hidden = true;
      realAddrContainer.style.display = "none";
    }
    const continueBox = document.getElementById("continue-box");
    const btnContinue = document.getElementById("btn-continue");
    const countdownSpan = document.getElementById("countdown");
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
      }, 1e3);
      btnContinue.onclick = async () => {
        try {
          await chrome.runtime.sendMessage({
            action: "bypassHost",
            host: verdict.host
          });
        } catch (e) {
          console.warn("Bypass notification failed:", e);
        }
        window.location.replace("https://" + verdict.host);
      };
    } else {
      continueBox.hidden = true;
    }
    const linkReport = document.getElementById("link-report");
    linkReport.textContent = dict.report;
    linkReport.onclick = (e) => {
      e.preventDefault();
      window.open("https://cybercrime.gov.in", "_blank");
    };
    const linkWhy = document.getElementById("link-why");
    linkWhy.textContent = dict.why_link;
    linkWhy.onclick = (e) => {
      e.preventDefault();
      alert(
        `SiteGuard Risk Analysis
Score: ${verdict.score}/100
Level: ${verdict.level}
Signals: ${verdict.reasons.join(", ")}`
      );
    };
    const webRepPanel = document.getElementById("web-rep-panel");
    const webRepHeaderText = document.getElementById("web-rep-header-text");
    const webRepStatusBadge = document.getElementById("web-rep-status-badge");
    const webRepSummary = document.getElementById("web-rep-summary");
    const webRepSnippet1 = document.getElementById("web-rep-snippet-1");
    const webRepSnippet2 = document.getElementById("web-rep-snippet-2");
    const autoRedirectBanner = document.getElementById("auto-redirect-banner");
    const redirectCountdownEl = document.getElementById("redirect-countdown");
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
        webRepHeaderText.textContent = `\u{1F50D} Web Research: Wikipedia \u2014 ${wr.wiki_article}`;
      } else {
        webRepHeaderText.textContent = "\u{1F50D} Web Reputation Research";
      }
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
        }, 1e3);
      }
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const initialLang = getBrowserLang();
    document.getElementById("lang-en")?.addEventListener("click", () => renderWarning("en"));
    document.getElementById("lang-hi")?.addEventListener("click", () => renderWarning("hi"));
    document.getElementById("lang-mr")?.addEventListener("click", () => renderWarning("mr"));
    renderWarning(initialLang);
  });
})();
//# sourceMappingURL=warning.js.map
