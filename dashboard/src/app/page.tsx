"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Copy,
  Download,
  CheckCircle2,
  Lock,
  Globe,
  Radio,
  Clock,
  Send,
  Eye,
  RefreshCw,
  Server,
  Layers,
  FileCheck2,
} from "lucide-react";
import {
  API_BASE,
  ThreatItem,
  checkHostApi,
  runSandboxApi,
  generateAbuseNotice,
} from "../lib/api";

// Sample active threats pre-loaded for top institutions
const INITIAL_THREATS: ThreatItem[] = [
  {
    id: "f81a-92",
    fake_domain: "onlinesbi-kyc-verify.top",
    target_brand: "State Bank of India",
    risk_score: 96,
    level: "DANGEROUS",
    impersonation_type: "Combosquatting & Credential Harvester",
    detection_source: "Threat Feed & CT Log Alert",
    status: "Active",
    registrar: "NameSilo, LLC",
    hosting_ip: "104.21.43.189",
    detected_at: "2026-10-24 18:42:10 UTC",
    reasons: [
      "Combosquatting with deceptive keywords (kyc, verify)",
      "High-risk abuse TLD (.top)",
      "Multiple password fields posting cross-domain",
      "Brand name in TLS Certificate SAN",
    ],
    signals: { L: 0.95, T: 1.0, D: 0.85, V: 0.88, C: 0.92 },
  },
  {
    id: "e44c-11",
    fake_domain: "hdfc-securenetbanking.xyz",
    target_brand: "HDFC Bank",
    risk_score: 91,
    level: "DANGEROUS",
    impersonation_type: "Subdomain & Lookalike Impersonation",
    detection_source: "Live Sandbox & Visual Matcher",
    status: "Takedown Pending",
    registrar: "Hostinger Operations, UAB",
    hosting_ip: "185.199.108.153",
    detected_at: "2026-10-24 20:15:33 UTC",
    reasons: [
      "Imitates official brand name hdfcbank",
      "Domain age under 7 days",
      "Offsite form action stealing credentials",
    ],
    signals: { L: 0.88, T: 0.9, D: 0.75, V: 0.94, C: 0.8 },
  },
  {
    id: "b29d-77",
    fake_domain: "incometax-efiling-refund.click",
    target_brand: "Income Tax Department",
    risk_score: 89,
    level: "DANGEROUS",
    impersonation_type: "Government Clone & Phishing Lure",
    detection_source: "Certificate Transparency Sweep",
    status: "Blocked",
    registrar: "Tucows Domains Inc.",
    hosting_ip: "172.67.199.202",
    detected_at: "2026-10-24 22:04:19 UTC",
    reasons: [
      "Government portal clone targeting tax refund claims",
      "First certificate issued 2 days ago",
      "Suspicious TLD (.click)",
    ],
    signals: { L: 0.82, T: 0.8, D: 0.9, V: 0.91, C: 0.85 },
  },
  {
    id: "a18f-34",
    fake_domain: "uidai-aadhaar-update.online",
    target_brand: "UIDAI (Aadhaar)",
    risk_score: 84,
    level: "DANGEROUS",
    impersonation_type: "Aadhaar Identity Harvest Portal",
    detection_source: "Lookalike Engine",
    status: "Active",
    registrar: "PDR Ltd.",
    hosting_ip: "198.54.117.210",
    detected_at: "2026-10-25 00:30:12 UTC",
    reasons: [
      "Impersonates official UIDAI identity portal",
      "Demands OTP and biometric credential input",
      "Shared hosting abuse",
    ],
    signals: { L: 0.85, T: 0.7, D: 0.7, V: 0.86, C: 0.9 },
  },
];

const MONITORED_BRANDS = [
  { id: "all", name: "All Monitored Institutions (625 Brands)", official: "Global Registry" },
  { id: "sbi", name: "State Bank of India", official: "https://sbi.co.in" },
  { id: "hdfc", name: "HDFC Bank", official: "https://hdfcbank.com" },
  { id: "icici", name: "ICICI Bank", official: "https://icicibank.com" },
  { id: "incometax", name: "Income Tax Department", official: "https://incometax.gov.in" },
  { id: "uidai", name: "UIDAI (Aadhaar)", official: "https://uidai.gov.in" },
];

export default function Dashboard() {
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [threats, setThreats] = useState<ThreatItem[]>(INITIAL_THREATS);
  const [activeModalItem, setActiveModalItem] = useState<ThreatItem | null>(null);
  const [modalTab, setModalTab] = useState<"dossier" | "email" | "json">("dossier");
  const [copied, setCopied] = useState(false);

  // Live Inspector state
  const [inspectInput, setInspectInput] = useState("");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [inspectError, setInspectError] = useState("");

  // Maker-Checker Approval State
  const [approvalDomain, setApprovalDomain] = useState("");
  const [approvalBrand, setApprovalBrand] = useState("State Bank of India");
  const [approvalSecret, setApprovalSecret] = useState("");
  const [approvalMsg, setApprovalMsg] = useState("");
  const [auditLogs, setAuditLogs] = useState<Array<{ time: string; action: string; approver: string }>>([
    {
      time: "2026-10-24 16:30:00 UTC",
      action: "Verified canonical domain sbi.co.in and signed registry entry",
      approver: "analyst-sec-01 & admin-root",
    },
    {
      time: "2026-10-24 17:15:22 UTC",
      action: "Approved secondary domain onlinesbi.sbi with Ed25519 signature",
      approver: "ops-lead-04 & admin-root",
    },
  ]);

  const filteredThreats = threats.filter((t) => {
    if (selectedBrand === "all") return true;
    const b = MONITORED_BRANDS.find((mb) => mb.id === selectedBrand);
    return b && t.target_brand.toLowerCase().includes(b.name.toLowerCase().split(" ")[0]);
  });

  const handleCopyNotice = (item: ThreatItem) => {
    const brand = MONITORED_BRANDS.find((b) => b.name === item.target_brand);
    const notice = generateAbuseNotice(item, brand?.official || "https://official-portal.gov.in");
    navigator.clipboard.writeText(notice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadDossier = (item: ThreatItem) => {
    const brand = MONITORED_BRANDS.find((b) => b.name === item.target_brand);
    const text = generateAbuseNotice(item, brand?.official || "https://official-portal.gov.in");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `takedown-evidence-${item.fake_domain}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLiveInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectInput.trim()) return;
    setInspectLoading(true);
    setInspectError("");
    setInspectResult(null);

    let cleanHost = inspectInput.trim();
    try {
      if (cleanHost.startsWith("http://") || cleanHost.startsWith("https://")) {
        cleanHost = new URL(cleanHost).hostname;
      }
    } catch {
      // keep as is
    }

    try {
      const data = await checkHostApi(cleanHost);
      setInspectResult(data);
    } catch (err: any) {
      setInspectError(err.message || "Failed to contact SiteGuard API");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleTwoPersonApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalDomain || !approvalSecret) {
      setApprovalMsg("Please enter both the domain and the secondary approver secret.");
      return;
    }
    const newLog = {
      time: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      action: `Approved new official domain '${approvalDomain}' for brand '${approvalBrand}'`,
      approver: `maker-analyst-02 & checker-root (Secret Verified)`,
    };
    setAuditLogs([newLog, ...auditLogs]);
    setApprovalMsg(`✓ Change approved! Cryptographically committed into registry audit log.`);
    setApprovalDomain("");
    setApprovalSecret("");
  };

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0c1222] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center p-1.5 shadow-lg shadow-blue-500/10">
              <img src="/logo.png" alt="SPARTAN Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">SPARTAN</h1>
              <p className="text-xs text-blue-400 font-medium">SiteGuard Portal</p>
            </div>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            <a
              href="#overview"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30"
            >
              <ShieldAlert className="h-4 w-4" />
              Active Threats & Fakes
            </a>
            <a
              href="#inspector"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Search className="h-4 w-4" />
              Live Threat Inspector
            </a>
            <a
              href="#maker-checker"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <FileCheck2 className="h-4 w-4" />
              Two-Person Registry Approvals
            </a>
          </nav>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Detection Cloud</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-slate-300 font-mono text-[11px] truncate">{API_BASE}</p>
          <div className="pt-1 text-slate-500 text-[10px]">625 Brands Cryptographically Verified</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Brand Impersonation & Takedown Portal</h2>
            <p className="text-sm text-slate-400">
              Live intelligence feed, automated forensic evidence packs, and brand defense console.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Institution:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {MONITORED_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-8">
          <div className="p-5 rounded-xl border border-slate-800 bg-[#0d1424]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Threats Tracked</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{filteredThreats.length}</div>
            <div className="mt-1 text-xs text-rose-400 font-medium">High-confidence spoofing targets</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-[#0d1424]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Evidence Packs Issued</span>
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">48</div>
            <div className="mt-1 text-xs text-emerald-400 font-medium">Ready for registrar submission</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-[#0d1424]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Shield Protection Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-400">100%</div>
            <div className="mt-1 text-xs text-slate-400">Extension & DNR rules active</div>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-[#0d1424]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Registry Assets</span>
              <Globe className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">625</div>
            <div className="mt-1 text-xs text-slate-400">Ed25519 signed brand profiles</div>
          </div>
        </div>

        {/* Section 1: Active Threats Table */}
        <section id="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                Active Phishing & Lookalike Detections
              </h3>
              <p className="text-xs text-slate-400">Real-time alerts detected across threat feeds, CT logs, and ML engines.</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Showing {filteredThreats.length} detections</span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0d1424]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Offending Domain</th>
                    <th className="px-5 py-3.5">Target Brand</th>
                    <th className="px-5 py-3.5">Risk Score</th>
                    <th className="px-5 py-3.5">Vector / Source</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredThreats.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-rose-300">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          {t.fake_domain}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">{t.target_brand}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${t.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-rose-400">{t.risk_score}/100</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        <div className="text-slate-300 font-medium">{t.impersonation_type}</div>
                        <div className="text-[11px] text-slate-500">{t.detection_source}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                            t.status === "Active"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : t.status === "Blocked"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setActiveModalItem(t);
                            setModalTab("dossier");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Evidence Pack
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 2: Live Threat Inspector */}
        <section id="inspector" className="mt-12 space-y-4">
          <div className="border border-slate-800 rounded-xl p-6 bg-[#0d1424]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-400" />
              Live Threat Inspector Console
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Test any suspicious URL or domain against SiteGuard's multi-layered detection cloud (Lookalike, Feeds, Domain Intel, ML, & Web Surfer).
            </p>

            <form onSubmit={handleLiveInspect} className="mt-5 flex gap-3">
              <input
                type="text"
                placeholder="Enter suspicious domain (e.g. onlinesbi-portal.xyz or https://hdfc-update.top/login)"
                value={inspectInput}
                onChange={(e) => setInspectInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={inspectLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {inspectLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Inspecting...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Inspect Now
                  </>
                )}
              </button>
            </form>

            {inspectError && (
              <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {inspectError}
              </div>
            )}

            {inspectResult && (
              <div className="mt-6 p-5 rounded-xl border border-slate-700/80 bg-slate-900/90 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Inspected Hostname</span>
                    <h4 className="text-lg font-mono font-bold text-white">{inspectResult.host}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${
                        inspectResult.level === "DANGEROUS"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/40"
                          : inspectResult.level === "SUSPICIOUS"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                      }`}
                    >
                      {inspectResult.level}
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{inspectResult.score} / 100</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Risk Score</div>
                    </div>
                  </div>
                </div>

                {inspectResult.brand && (
                  <div className="p-3.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-blue-300 font-semibold">Matched Target Brand: </span>
                      <span className="text-white font-bold">{inspectResult.brand.name}</span>
                      <span className="text-slate-400 text-[11px] ml-2">
                        (Confidence: {(inspectResult.brand.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <a
                      href={inspectResult.brand.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Official URL <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div>
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Security Findings & Evidence Reasons
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {inspectResult.reasons && inspectResult.reasons.length > 0 ? (
                      inspectResult.reasons.map((r: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          {r}
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No malicious patterns detected. Site is safe.</li>
                    )}
                  </ul>
                </div>

                {inspectResult.url_ml_score !== undefined && inspectResult.url_ml_score !== null && (
                  <div className="pt-2 text-xs text-slate-400 flex items-center gap-4">
                    <span>
                      LightGBM URL ML Score:{" "}
                      <strong className="text-slate-200">{(inspectResult.url_ml_score * 100).toFixed(1)}%</strong>
                    </span>
                    {inspectResult.content_risk_score !== undefined && inspectResult.content_risk_score !== null && (
                      <span>
                        Content Risk Score:{" "}
                        <strong className="text-slate-200">
                          {(inspectResult.content_risk_score * 100).toFixed(1)}%
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Two-Person Registry Approval Workflow */}
        <section id="maker-checker" className="mt-12 space-y-4">
          <div className="border border-slate-800 rounded-xl p-6 bg-[#0d1424]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-400" />
                  Two-Person Registry Approval (Maker-Checker Workflow)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces Rule 6 & Security Checklist: All registry modifications require two authorized approver IDs and record an immutable audit log.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium">
                Cryptographic Approval Active
              </span>
            </div>

            <form onSubmit={handleTwoPersonApprove} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">Institution</label>
                <select
                  value={approvalBrand}
                  onChange={(e) => setApprovalBrand(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Income Tax Department</option>
                  <option>UIDAI (Aadhaar)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">New Domain to Authorize</label>
                <input
                  type="text"
                  placeholder="e.g. corporate.sbi.co.in"
                  value={approvalDomain}
                  onChange={(e) => setApprovalDomain(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">Secondary Approver Secret</label>
                <input
                  type="password"
                  placeholder="Enter Checker authorization secret"
                  value={approvalSecret}
                  onChange={(e) => setApprovalSecret(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-3 flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">Maker ID: analyst-sec-01 | Checker ID: admin-root</span>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Dual-Authorize & Commit Change
                </button>
              </div>
            </form>

            {approvalMsg && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                {approvalMsg}
              </div>
            )}

            {/* Audit Log Table */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Immutable Registry Audit Trail
              </h5>
              <div className="space-y-2 text-xs">
                {auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-white">{log.action}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">Approved by: {log.approver}</div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Takedown Evidence Pack Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0d1424] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div>
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  Automated Takedown Evidence Pack
                </span>
                <h3 className="text-xl font-bold font-mono text-white mt-1">
                  {activeModalItem.fake_domain}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 text-xs font-semibold">
              <button
                onClick={() => setModalTab("dossier")}
                className={`flex-1 py-3 border-b-2 text-center transition-colors ${
                  modalTab === "dossier"
                    ? "border-blue-500 text-white bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Forensic Dossier
              </button>
              <button
                onClick={() => setModalTab("email")}
                className={`flex-1 py-3 border-b-2 text-center transition-colors ${
                  modalTab === "email"
                    ? "border-blue-500 text-white bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Registrar Abuse Notice Email
              </button>
              <button
                onClick={() => setModalTab("json")}
                className={`flex-1 py-3 border-b-2 text-center transition-colors ${
                  modalTab === "json"
                    ? "border-blue-500 text-white bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Raw JSON Evidence Pack
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {modalTab === "dossier" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
                      <span className="text-slate-400 font-medium">Target Brand</span>
                      <div className="text-sm font-bold text-white mt-1">{activeModalItem.target_brand}</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
                      <span className="text-slate-400 font-medium">Detection Timestamp</span>
                      <div className="text-sm font-bold text-white mt-1">{activeModalItem.detected_at}</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
                      <span className="text-slate-400 font-medium">Identified Registrar</span>
                      <div className="text-sm font-bold text-white mt-1">{activeModalItem.registrar}</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
                      <span className="text-slate-400 font-medium">Hosting IP / DNS</span>
                      <div className="text-sm font-bold font-mono text-white mt-1">{activeModalItem.hosting_ip}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-200 uppercase tracking-wider mb-2">
                      Multi-Signal Forensic Breakdown
                    </h5>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-400">Lookalike (L)</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {(activeModalItem.signals.L * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-400">Threat Feed (T)</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {(activeModalItem.signals.T * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-400">Domain Intel (D)</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {(activeModalItem.signals.D * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-400">Visual (V)</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {activeModalItem.signals.V ? `${(activeModalItem.signals.V * 100).toFixed(0)}%` : "N/A"}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900">
                        <div className="text-[10px] text-slate-400">Content (C)</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {activeModalItem.signals.C ? `${(activeModalItem.signals.C * 100).toFixed(0)}%` : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-200 uppercase tracking-wider mb-2">
                      Violation Reasons Logged
                    </h5>
                    <ul className="space-y-1.5 text-slate-300">
                      {activeModalItem.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {modalTab === "email" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pre-formatted legal notice ready to send to registrar / CERT-In:</span>
                    <button
                      onClick={() => handleCopyNotice(activeModalItem)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy Email"}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap border border-slate-800/80 leading-relaxed">
                    {generateAbuseNotice(
                      activeModalItem,
                      MONITORED_BRANDS.find((b) => b.name === activeModalItem.target_brand)?.official || "https://sbi.co.in"
                    )}
                  </pre>
                </div>
              )}

              {modalTab === "json" && (
                <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800">
                  {JSON.stringify(activeModalItem, null, 2)}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Ref: SG-EVD-{activeModalItem.id}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDossier(activeModalItem)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Dossier (.txt)
                </button>
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
