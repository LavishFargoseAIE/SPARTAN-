const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

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

async function build() {
  const env = getEnv();
  const publicKey = env.REGISTRY_SIGNING_PUBLIC_KEY || "eRjZf+kmHCyhdjhsIr42p0zz3ecrWatwGNNQ4TjdmJY=";
  const apiUrl = env.SITEGUARD_API_URL || "http://127.0.0.1:8000";

  const distDir = path.resolve(__dirname, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Compile TypeScript entries
  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, "src/background.ts"),
      path.resolve(__dirname, "src/warning.ts"),
      path.resolve(__dirname, "src/popup.ts"),
    ],
    bundle: true,
    outdir: distDir,
    format: "esm",
    target: "es2022",
    define: {
      "process.env.REGISTRY_SIGNING_PUBLIC_KEY": JSON.stringify(publicKey),
      "process.env.SITEGUARD_API_URL": JSON.stringify(apiUrl),
    },
    sourcemap: true,
  });

  // 2. Copy static files
  fs.copyFileSync(path.resolve(__dirname, "manifest.json"), path.resolve(distDir, "manifest.json"));
  fs.copyFileSync(path.resolve(__dirname, "src/warning.html"), path.resolve(distDir, "warning.html"));
  fs.copyFileSync(path.resolve(__dirname, "src/popup.html"), path.resolve(distDir, "popup.html"));

  // Copy i18n
  const i18nDist = path.resolve(distDir, "i18n");
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

  // Generate simple svg icon if needed
  const iconsDist = path.resolve(distDir, "icons");
  if (!fs.existsSync(iconsDist)) {
    fs.mkdirSync(iconsDist, { recursive: true });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#1e293b"/><path d="M24 10 L34 16 L34 26 C34 32 24 38 24 38 C24 38 14 32 14 26 L14 16 Z" fill="#10b981"/><path d="M21 24 L24 27 L29 20" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  fs.writeFileSync(path.resolve(iconsDist, "icon.svg"), svg);

  console.log("Extension build completed successfully in dist/");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
