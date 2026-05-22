#!/usr/bin/env node
// Deploys production/jys_quan_ly_nhan_su.html to the live Wix iframe used at
// https://www.jysenglish.com/?app=jys-hr
//
// Steps:
//   1. Inject API_URL secret into the HTML in place of __API_URL__ placeholder.
//   2. Upload the resulting file to Wix Media Manager (new file each deploy).
//   3. Poll until the file is READY.
//   4. PATCH the "JYS HR app launcher" Custom Embed to swap BUNDLE_URL to the new file URL.
//
// Required env vars:
//   WIX_API_KEY     - Wix API key with scopes: Manage Media Manager + Manage Custom Embeds (Editor).
//                     Generate at https://manage.wix.com/account/api-keys.
//   API_URL         - Apps Script Web App /exec URL, e.g. https://script.google.com/macros/s/AKfy.../exec
//   WIX_SITE_ID     - Default a3bfa336-e918-48e6-831b-82ed7ff178f5 (JYS English Academy).
//   WIX_EMBED_ID    - Default 516cefe5-e0bb-4b1c-9d06-5bb16dd6482f (JYS HR app launcher).
//
// Exits non-zero on any failure; the workflow step then fails the run.

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const SITE_ID    = process.env.WIX_SITE_ID  || "a3bfa336-e918-48e6-831b-82ed7ff178f5";
const EMBED_ID   = process.env.WIX_EMBED_ID || "516cefe5-e0bb-4b1c-9d06-5bb16dd6482f";
const API_KEY    = required("WIX_API_KEY");
const API_URL    = required("API_URL");

const HTML_PATH  = path.resolve("production/jys_quan_ly_nhan_su.html");
const PLACEHOLDER = "__API_URL__";

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

function authHeaders(extra = {}) {
  return {
    "Authorization": API_KEY,
    "wix-site-id":   SITE_ID,
    ...extra,
  };
}

async function wixJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function shortSha() {
  try { return execSync("git rev-parse --short HEAD").toString().trim(); }
  catch { return "local"; }
}

async function main() {
  // 1. Inject API_URL into the bundle.
  const raw = await fs.readFile(HTML_PATH, "utf8");
  if (!raw.includes(PLACEHOLDER)) {
    throw new Error(`Bundle does not contain placeholder ${PLACEHOLDER}. Refusing to deploy a broken bundle.`);
  }
  const injected = raw.split(PLACEHOLDER).join(API_URL);
  if (injected.includes(PLACEHOLDER)) throw new Error("Injection failed: placeholder still present.");
  // Defensive: do not deploy if injected URL is itself the placeholder string.
  if (API_URL === PLACEHOLDER || !API_URL.startsWith("http")) {
    throw new Error(`API_URL secret looks invalid: ${API_URL.slice(0, 30)}...`);
  }

  const sha       = shortSha();
  const stamp     = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName  = `jys_hr_${stamp}_${sha}.txt`;

  console.log(`Bundle: ${injected.length} bytes  |  fileName: ${fileName}`);

  // 2a. Generate upload URL.
  //
  // Wix Media's gateway rejects `text/html` uploads (security policy: prevents
  // using Media Manager as an HTML host). Upload as text/plain with a .txt
  // file name; the Velo launcher fetches the body and blob-URLs it as
  // text/html inside an iframe, so the MIME on Wix's side does not matter.
  console.log("→ generate-upload-url");
  const gen = await wixJson(
    "POST",
    "https://www.wixapis.com/site-media/v1/files/generate-upload-url",
    { mimeType: "text/plain", fileName, parentFolderId: "media-root" },
  );
  const uploadUrl = gen.uploadUrl;
  if (!uploadUrl) throw new Error(`No uploadUrl in response: ${JSON.stringify(gen)}`);

  // 2b. PUT the bundle.
  console.log("→ PUT bundle");
  const putUrl = `${uploadUrl}?filename=${encodeURIComponent(fileName)}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: injected,
  });
  const putText = await putRes.text();
  if (!putRes.ok) throw new Error(`PUT failed ${putRes.status}: ${putText}`);
  const putJson = JSON.parse(putText);
  const file    = putJson.file || putJson;
  const fileId  = file.id;
  let   bundleUrl = file.url;
  if (!fileId) throw new Error(`No file.id in upload response: ${putText}`);
  console.log(`  fileId=${fileId}  url=${bundleUrl}`);

  // 3. Poll get-file-by-id until READY (~60s budget).
  console.log("→ wait for file to be ready");
  const deadline = Date.now() + 90_000;
  let   ready    = false;
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
      // If no explicit state field, treat presence of a CDN URL as ready.
      if (f && f.url && f.sizeInBytes) { ready = true; break; }
    } catch (e) {
      // 404 just after upload is normal; keep polling.
      if (!/404|NOT_FOUND/i.test(String(e))) console.warn(`  poll warn: ${e.message}`);
    }
  }
  if (!ready) throw new Error(`File ${fileId} did not become ready within timeout.`);
  console.log(`  ready. bundleUrl=${bundleUrl}`);

  // Sanity: ensure URL matches expected Wix host.
  if (!/^https:\/\/[\w-]+\.usrfiles\.com\/|^https:\/\/static\.wixstatic\.com\//.test(bundleUrl)) {
    console.warn(`Unexpected bundle URL host: ${bundleUrl}`);
  }

  // 4. PATCH the custom embed.
  console.log("→ fetch current embed (for revision)");
  const cur = await wixJson(
    "GET",
    `https://www.wixapis.com/embeds/v1/custom-embeds/${EMBED_ID}`,
  );
  const embed   = cur.customEmbed || cur;
  const oldHtml = embed.embedData?.html;
  if (!oldHtml) throw new Error("Custom embed has no html.");
  const newHtml = oldHtml.replace(
    /var BUNDLE_URL = "[^"]+";/,
    `var BUNDLE_URL = "${bundleUrl}";`,
  );
  if (newHtml === oldHtml) {
    throw new Error("Could not find BUNDLE_URL line in embed html to replace.");
  }

  console.log(`→ PATCH custom-embed ${EMBED_ID}  (revision ${embed.revision})`);
  const upd = await wixJson(
    "PATCH",
    `https://www.wixapis.com/embeds/v1/custom-embeds/${EMBED_ID}`,
    {
      customEmbed: {
        id:       EMBED_ID,
        revision: embed.revision,
        name:     embed.name,
        enabled:  embed.enabled,
        position: embed.position,
        loadOnce: embed.loadOnce,
        embedData: { ...embed.embedData, html: newHtml },
      },
    },
  );
  const newRev = upd.customEmbed?.revision || upd.revision;
  console.log(`  patched. new revision=${newRev}`);

  console.log("\nDeploy OK.");
  console.log(`  Live URL : https://www.jysenglish.com/?app=jys-hr`);
  console.log(`  Bundle   : ${bundleUrl}`);
  console.log(`  File ID  : ${fileId}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error("Deploy failed:", err.message); process.exit(1); });
