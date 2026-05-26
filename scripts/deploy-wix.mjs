#!/usr/bin/env node
// Deploys production/jys_quan_ly_nhan_su.html to the live Wix Custom Embed that
// powers the canonical HR page https://www.jysenglish.com/quan-ly-nhan-su
// (legacy inbound https://www.jysenglish.com/?app=jys-hr redirects to it).
//
// Steps:
//   1. Inject API_URL + APP_BUILD into the HTML (in place of __API_URL__ / __APP_BUILD__).
//   2. Refuse to deploy a broken bundle (missing placeholders, bad API_URL, leftover markers).
//   3. Upload the result to Wix Media Manager (a new file each deploy).
//   4. Poll until the file is READY.
//   5. PATCH the Custom Embed to swap BUNDLE_URL to the new file URL.
//   6. Re-fetch the embed and confirm BUNDLE_URL now equals the uploaded URL.
//   7. Write artifacts/deploy-manifest.json.
//
// Required env vars:
//   WIX_API_KEY   - Wix API key: Manage Media Manager + Manage Custom Embeds (Editor).
//   API_URL       - Apps Script Web App /exec URL.
//   WIX_SITE_ID   - default JYS English Academy site.
//   WIX_EMBED_ID  - default "JYS HR app launcher" embed.
//   BUILD_ID/APP_BUILD - optional; the build stamp injected as APP_BUILD. Generated if absent.
//
// Never prints API_URL. Exits non-zero on any failure.

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const SITE_ID  = process.env.WIX_SITE_ID  || "a3bfa336-e918-48e6-831b-82ed7ff178f5";
const EMBED_ID = process.env.WIX_EMBED_ID || "516cefe5-e0bb-4b1c-9d06-5bb16dd6482f";
const API_KEY  = required("WIX_API_KEY");
const API_URL  = required("API_URL");

const HTML_PATH        = path.resolve("production/jys_quan_ly_nhan_su.html");
const MANIFEST_PATH    = path.resolve("artifacts/deploy-manifest.json");
const API_PLACEHOLDER  = "__API_URL__";
const BUILD_PLACEHOLDER = "__APP_BUILD__";
const CANONICAL_URL = "https://www.jysenglish.com/quan-ly-nhan-su";
const LEGACY_URL    = "https://www.jysenglish.com/?app=jys-hr";

function required(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing required env var: ${name}`); process.exit(2); }
  return v;
}

function sh(cmd) { try { return execSync(cmd).toString().trim(); } catch { return ""; } }
function shortSha() { return sh("git rev-parse --short HEAD") || "local"; }
function fullSha()  { return sh("git rev-parse HEAD") || "local"; }

function buildId() {
  if (process.env.BUILD_ID)  return process.env.BUILD_ID;
  if (process.env.APP_BUILD) return process.env.APP_BUILD;
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-` +
                `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  return `${stamp}-${shortSha()}`;
}

function authHeaders(extra = {}) {
  return { "Authorization": API_KEY, "wix-site-id": SITE_ID, ...extra };
}

async function wixJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchEmbedBundleUrl() {
  const cur = await wixJson("GET", `https://www.wixapis.com/embeds/v1/custom-embeds/${EMBED_ID}`);
  const embed = cur.customEmbed || cur;
  const html = embed.embedData?.html || "";
  const m = html.match(/var BUNDLE_URL = "([^"]+)";/);
  return { embed, bundleUrl: m ? m[1] : null };
}

async function main() {
  const BUILD_ID = buildId();

  // 1 + 2. Inject and validate.
  const raw = await fs.readFile(HTML_PATH, "utf8");
  if (!raw.includes(API_PLACEHOLDER))   throw new Error(`Source missing ${API_PLACEHOLDER}. Refusing to deploy.`);
  if (!raw.includes(BUILD_PLACEHOLDER)) throw new Error(`Source missing ${BUILD_PLACEHOLDER}. Refusing to deploy.`);
  if (API_URL === API_PLACEHOLDER || !API_URL.startsWith("http")) {
    throw new Error(`API_URL secret looks invalid (starts with: ${API_URL.slice(0, 8)}...).`);
  }

  const injected = raw
    .split(API_PLACEHOLDER).join(API_URL)
    .split(BUILD_PLACEHOLDER).join(BUILD_ID);
  if (injected.includes(API_PLACEHOLDER))   throw new Error("Injection failed: __API_URL__ still present.");
  if (injected.includes(BUILD_PLACEHOLDER)) throw new Error("Injection failed: __APP_BUILD__ still present.");

  const sha      = shortSha();
  const stamp    = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `jys_hr_${stamp}_${sha}.txt`;

  console.log(`Build ID : ${BUILD_ID}`);
  console.log(`Bundle   : ${injected.length} bytes  |  fileName: ${fileName}`);

  // 3a. Generate upload URL. Wix Media rejects text/html, so upload as text/plain .txt;
  // the Velo launcher blob-URLs the body as text/html inside an iframe.
  console.log("→ generate-upload-url");
  const gen = await wixJson(
    "POST",
    "https://www.wixapis.com/site-media/v1/files/generate-upload-url",
    { mimeType: "text/plain", fileName, parentFolderId: "media-root" },
  );
  const uploadUrl = gen.uploadUrl;
  if (!uploadUrl) throw new Error(`No uploadUrl in response: ${JSON.stringify(gen)}`);

  // 3b. PUT the bundle.
  console.log("→ PUT bundle");
  const putUrl = `${uploadUrl}?filename=${encodeURIComponent(fileName)}`;
  const putRes = await fetch(putUrl, {
    method: "PUT", headers: { "Content-Type": "text/plain" }, body: injected,
  });
  const putText = await putRes.text();
  if (!putRes.ok) throw new Error(`PUT failed ${putRes.status}: ${putText}`);
  const putJson = JSON.parse(putText);
  const file    = putJson.file || putJson;
  const fileId  = file.id;
  let   bundleUrl = file.url;
  if (!fileId) throw new Error(`No file.id in upload response: ${putText}`);
  console.log(`  fileId=${fileId}`);

  // 4. Poll until READY (~90s budget).
  console.log("→ wait for file to be ready");
  const deadline = Date.now() + 90_000;
  let ready = false;
  while (Date.now() < deadline) {
    await sleep(2000);
    try {
      const got = await wixJson(
        "GET",
        `https://www.wixapis.com/site-media/v1/files/get-file-by-id?fileId=${encodeURIComponent(fileId)}`,
      );
      const f = got.file || got;
      if (f && f.url) bundleUrl = f.url;
      const state = f && (f.state || f.operationStatus);
      if (state === "OK" || state === "READY") { ready = true; break; }
      if (f && f.url && f.sizeInBytes) { ready = true; break; }
    } catch (e) {
      if (!/404|NOT_FOUND/i.test(String(e))) console.warn(`  poll warn: ${e.message}`);
    }
  }
  if (!ready) throw new Error(`File ${fileId} did not become ready within timeout.`);
  console.log(`  ready. bundleUrl=${bundleUrl}`);

  if (!/^https:\/\/[\w-]+\.usrfiles\.com\/|^https:\/\/static\.wixstatic\.com\//.test(bundleUrl)) {
    console.warn(`Unexpected bundle URL host: ${bundleUrl}`);
  }

  // 5. PATCH the custom embed.
  console.log("→ fetch current embed (for revision)");
  const { embed } = await fetchEmbedBundleUrl();
  const oldHtml = embed.embedData?.html;
  if (!oldHtml) throw new Error("Custom embed has no html.");
  const newHtml = oldHtml.replace(/var BUNDLE_URL = "[^"]+";/, `var BUNDLE_URL = "${bundleUrl}";`);
  if (newHtml === oldHtml) throw new Error("Could not find BUNDLE_URL line in embed html to replace.");

  console.log(`→ PATCH custom-embed ${EMBED_ID}  (revision ${embed.revision})`);
  await wixJson(
    "PATCH",
    `https://www.wixapis.com/embeds/v1/custom-embeds/${EMBED_ID}`,
    {
      customEmbed: {
        id: EMBED_ID, revision: embed.revision, name: embed.name,
        enabled: embed.enabled, position: embed.position, loadOnce: embed.loadOnce,
        embedData: { ...embed.embedData, html: newHtml },
      },
    },
  );

  // 6. Re-fetch and confirm the embed now points at the uploaded bundle.
  console.log("→ verify embed BUNDLE_URL");
  const after = await fetchEmbedBundleUrl();
  if (after.bundleUrl !== bundleUrl) {
    throw new Error(`Embed BUNDLE_URL mismatch after patch.\n  expected: ${bundleUrl}\n  got:      ${after.bundleUrl}`);
  }
  console.log("  embed confirmed.");

  // 7. Write the deploy manifest.
  const manifest = {
    service: "jys-hr",
    buildId: BUILD_ID,
    commitSha: fullSha(),
    shortSha: sha,
    generatedAt: new Date().toISOString(),
    canonicalUrl: CANONICAL_URL,
    legacyUrl: LEGACY_URL,
    wixSiteId: SITE_ID,
    wixEmbedId: EMBED_ID,
    bundleUrl,
    wixFileId: fileId,
  };
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log("\nDeploy OK.");
  console.log(`  Canonical URL : ${CANONICAL_URL}`);
  console.log(`  Legacy URL    : ${LEGACY_URL}`);
  console.log(`  Build ID      : ${BUILD_ID}`);
  console.log(`  Bundle URL    : ${bundleUrl}`);
  console.log(`  Wix File ID   : ${fileId}`);
  console.log(`  Manifest      : ${MANIFEST_PATH}`);
  // Note: API_URL is intentionally never printed.
}

main().catch((err) => { console.error("Deploy failed:", err.message); process.exit(1); });
