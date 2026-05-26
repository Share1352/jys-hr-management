#!/usr/bin/env node
// Deploys the Apps Script backend (production/Code.gs) with clasp — no manual
// copy/paste into the Apps Script editor. Runs BEFORE the Wix deploy so the
// frontend never points at a backend that is a build behind.
//
// Required env:
//   GAS_SCRIPT_ID                       - Apps Script project (script) id.
//   CLASP_CREDENTIALS_JSON | CLASP_CREDENTIALS - contents of ~/.clasprc.json (oauth).
// Optional env:
//   GAS_DEPLOYMENT_ID                   - reuse a deployment id instead of a new versioned one.
//   BUILD_ID | APP_BUILD                - build stamp injected as the backend build.
//
// On missing credentials it fails with a precise diagnostic and exits non-zero.
// It never asks the user and never commits .tmp, .clasp.json, or credentials.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const SRC        = path.resolve("production/Code.gs");
const TMP_DIR    = path.resolve(".tmp/gas");
const CLASP_JSON = path.join(TMP_DIR, ".clasp.json");
const CLASPRC    = path.join(os.homedir(), ".clasprc.json");

function sh(cmd) { try { return execSync(cmd).toString().trim(); } catch { return ""; } }
function shortSha() { return sh("git rev-parse --short HEAD") || "local"; }

function buildId() {
  if (process.env.BUILD_ID)  return process.env.BUILD_ID;
  if (process.env.APP_BUILD) return process.env.APP_BUILD;
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-` +
                `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  return `${stamp}-${shortSha()}`;
}

function parseCreds(raw) {
  const s = String(raw).replace(/^﻿/, "").trim();
  try { return JSON.parse(s); } catch {}
  // Some setups base64 the file to dodge shell/secret mangling.
  try {
    const dec = Buffer.from(s, "base64").toString("utf8").replace(/^﻿/, "").trim();
    if (dec.startsWith("{")) return JSON.parse(dec);
  } catch {}
  return null;
}

// clasp v3 login writes { tokens: { default: { type:"authorized_user", ... } } }.
// The pinned clasp v2 expects { token, oauth2ClientSettings }. Normalize to v2 so
// CI works regardless of which clasp the operator used locally to mint the token.
function toClaspV2(parsed) {
  if (parsed && parsed.token && parsed.oauth2ClientSettings) return parsed; // already v2
  const d = (parsed && parsed.tokens && parsed.tokens.default) || parsed;
  if (d && (d.refresh_token || d.access_token) && d.client_id) {
    return {
      token: {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        scope: d.scope || "",
        token_type: "Bearer",
        expiry_date: d.expiry_date || 1, // past → forces refresh via refresh_token
      },
      oauth2ClientSettings: {
        clientId: d.client_id,
        clientSecret: d.client_secret,
        redirectUri: d.redirect_uri || "http://localhost",
      },
      isLocalCreds: false,
    };
  }
  return parsed; // unknown shape; let clasp try
}

function failMissing(lines) {
  console.error("GAS deploy blocked — required configuration is missing:");
  for (const l of lines) console.error(`  - ${l}`);
  console.error("Set these as repository secrets, then re-run. (Not prompting; this is CI.)");
  process.exit(2);
}

async function main() {
  const BUILD_ID  = buildId();
  const SCRIPT_ID = process.env.GAS_SCRIPT_ID;
  const CREDS     = process.env.CLASP_CREDENTIALS_JSON || process.env.CLASP_CREDENTIALS;

  const missing = [];
  if (!SCRIPT_ID) missing.push("GAS_SCRIPT_ID (Apps Script project id)");
  if (!CREDS)     missing.push("CLASP_CREDENTIALS_JSON or CLASP_CREDENTIALS (~/.clasprc.json oauth contents)");
  if (missing.length) failMissing(missing);

  // Parse credentials tolerantly: strip BOM/whitespace, accept raw JSON or base64-of-JSON.
  const parsedCreds = parseCreds(CREDS);
  if (!parsedCreds) {
    const s = String(CREDS).replace(/^﻿/, "").trim();
    // Non-leaking diagnostic: only length + whether it begins like JSON.
    failMissing([
      `CLASP_CREDENTIALS_JSON is not valid JSON (length=${s.length}, beginsWith='{'=${s.startsWith("{")}).`,
      "Expected the literal contents of ~/.clasprc.json. Re-set with: gh secret set CLASP_CREDENTIALS_JSON < ~/.clasprc.json",
      "If your clasp version splits creds, the file may live at ~/.config/clasp/.clasprc.json — use that file.",
    ]);
  }
  const credsJson = JSON.stringify(toClaspV2(parsedCreds));

  console.log(`Build ID : ${BUILD_ID}`);
  console.log(`Script   : ${SCRIPT_ID}`);

  // 2-4. Temp project dir with build-stamped copy of Code.gs.
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  let code = await fs.readFile(SRC, "utf8");
  if (code.includes("__APP_BUILD__")) {
    code = code.split("__APP_BUILD__").join(BUILD_ID);
  } else {
    // Stamp the DEFAULT_APP_BUILD fallback so health reports this build even
    // when the APP_BUILD script property is unset.
    const before = code;
    code = code.replace(/var DEFAULT_APP_BUILD = "[^"]*";/, `var DEFAULT_APP_BUILD = "${BUILD_ID}";`);
    if (code === before) {
      throw new Error("Could not stamp build id: no __APP_BUILD__ and no DEFAULT_APP_BUILD line in Code.gs.");
    }
  }
  await fs.writeFile(path.join(TMP_DIR, "Code.js"), code);
  // appsscript.json manifest so clasp pushes a valid project.
  await fs.writeFile(path.join(TMP_DIR, "appsscript.json"), JSON.stringify({
    timeZone: "Asia/Ho_Chi_Minh",
    exceptionLogging: "STACKDRIVER",
    runtimeVersion: "V8",
    webapp: { access: "ANYONE_ANONYMOUS", executeAs: "USER_DEPLOYING" },
  }, null, 2));

  // 5. .clasp.json (inside temp dir; clasp uses cwd's config).
  await fs.writeFile(CLASP_JSON, JSON.stringify({ scriptId: SCRIPT_ID, rootDir: "." }, null, 2));

  // 6. ~/.clasprc.json credentials (normalized JSON).
  await fs.writeFile(CLASPRC, credsJson, { mode: 0o600 });

  const run = (cmd) => {
    console.log(`→ ${cmd}`);
    return execSync(cmd, { cwd: TMP_DIR, stdio: "inherit" });
  };

  // 7. Push source.
  run("npx --yes clasp push --force");

  // 8. Create/update a deployment.
  const desc = `jys-hr ${BUILD_ID}`;
  const out = process.env.GAS_DEPLOYMENT_ID
    ? execSync(`npx --yes clasp deploy --deploymentId "${process.env.GAS_DEPLOYMENT_ID}" --description "${desc}"`,
        { cwd: TMP_DIR }).toString()
    : execSync(`npx --yes clasp deploy --description "${desc}"`, { cwd: TMP_DIR }).toString();
  console.log(out.trim());

  console.log("\nGAS deploy OK.");
  console.log(`  Build ID : ${BUILD_ID}`);
  console.log("  Backend health (?action=health) should now report this build.");
}

main().catch((err) => { console.error("GAS deploy failed:", err.message); process.exit(1); });
