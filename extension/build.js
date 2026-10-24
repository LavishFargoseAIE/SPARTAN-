const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...rest] = trimmed.split("=");
        env[k.trim()] = rest.join("=").trim();
      }
    }
  }
  return env;
}

async function buildPlatform(target, outDir, manifestFile) {
  const env = getEnv();
  const publicKey =
    process.env.REGISTRY_SIGNING_PUBLIC_KEY ||
    env.REGISTRY_SIGNING_PUBLIC_KEY ||
    "eRjZf+kmHCyhdjhsIr42p0zz3ecrWatwGNNQ4TjdmJY=";
  const apiUrl =
    process.env.SITEGUARD_API_URL ||
    env.SITEGUARD_API_URL ||
    "http://127.0.0.1:8000";

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`[Build] Compiling SiteGuard extension for ${target.toUpperCase()} into ${path.basename(outDir)}/ ...`);

  // 1. Compile TypeScript entries
  // Firefox background scripts run reliably with iife format when bundled
  const format = target === "firefox" ? "iife" : "esm";

  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, "src/background.ts"),
      path.resolve(__dirname, "src/warning.ts"),
      path.resolve(__dirname, "src/popup.ts"),
    ],
    bundle: true,
    outdir: outDir,
    format: format,
    target: "es2022",
    define: {
      "process.env.REGISTRY_SIGNING_PUBLIC_KEY": JSON.stringify(publicKey),
      "process.env.SITEGUARD_API_URL": JSON.stringify(apiUrl),
    },
    sourcemap: true,
  });

  // 2. Copy static files & targeted manifest
  fs.copyFileSync(manifestFile, path.resolve(outDir, "manifest.json"));
  fs.copyFileSync(path.resolve(__dirname, "src/warning.html"), path.resolve(outDir, "warning.html"));
  fs.copyFileSync(path.resolve(__dirname, "src/popup.html"), path.resolve(outDir, "popup.html"));

  // Copy i18n
  const i18nDist = path.resolve(outDir, "i18n");
  if (!fs.existsSync(i18nDist)) {
    fs.mkdirSync(i18nDist, { recursive: true });
  }
  const i18nSrc = path.resolve(__dirname, "src/i18n");
  if (fs.existsSync(i18nSrc)) {
    for (const f of fs.readdirSync(i18nSrc)) {
      if (f.endsWith(".json")) {
        fs.copyFileSync(path.resolve(i18nSrc, f), path.resolve(i18nDist, f));
      }
    }
  }

  // Icons
  const iconsDist = path.resolve(outDir, "icons");
  if (!fs.existsSync(iconsDist)) {
    fs.mkdirSync(iconsDist, { recursive: true });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#1e293b"/><path d="M24 10 L34 16 L34 26 C34 32 24 38 24 38 C24 38 14 32 14 26 L14 16 Z" fill="#10b981"/><path d="M21 24 L24 27 L29 20" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  fs.writeFileSync(path.resolve(iconsDist, "icon.svg"), svg);

  // If Firefox, also package a ready-to-install zip/xpi bundle
  if (target === "firefox") {
    const zipPath = path.resolve(outDir, "siteguard-firefox.zip");
    const xpiPath = path.resolve(outDir, "siteguard-firefox.xpi");
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(xpiPath)) fs.unlinkSync(xpiPath);

      // Package zip excluding any existing zip/xpi
      execSync(`cd "${outDir}" && zip -r siteguard-firefox.zip . -x "*.zip" "*.xpi" "*.map"`, {
        stdio: "pipe",
      });
      // Copy to .xpi as Firefox recognizes .xpi natively
      fs.copyFileSync(zipPath, xpiPath);
      console.log(`[Build] Generated Firefox packages: siteguard-firefox.zip and siteguard-firefox.xpi`);
    } catch (e) {
      console.warn(`[Build] Zip packaging skipped or failed: ${e.message}`);
    }
  }

  console.log(`[Build] ${target.toUpperCase()} build completed successfully in ${path.basename(outDir)}/`);
}

async function main() {
  const arg = (process.argv[2] || "all").toLowerCase();

  const chromeDist = path.resolve(__dirname, "dist");
  const firefoxDist = path.resolve(__dirname, "dist-firefox");

  const chromeManifest = path.resolve(__dirname, "manifest.json");
  const firefoxManifest = path.resolve(__dirname, "manifest.firefox.json");

  if (arg === "chrome") {
    await buildPlatform("chrome", chromeDist, chromeManifest);
  } else if (arg === "firefox") {
    await buildPlatform("firefox", firefoxDist, firefoxManifest);
  } else {
    await buildPlatform("chrome", chromeDist, chromeManifest);
    await buildPlatform("firefox", firefoxDist, firefoxManifest);
  }
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
