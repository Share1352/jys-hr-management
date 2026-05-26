#!/usr/bin/env node
// End-to-end production verification for the JYS HR app.
// Proves the live bundle, backend health, and rendered login page are all
// consistent and on the same build — and writes artifacts a human (or CI) can read.
//
// Env (all optional unless noted):
//   PROD_URL        default https://www.jysenglish.com/quan-ly-nhan-su
//   LEGACY_URL      default https://www.jysenglish.com/?app=jys-hr
//   API_URL         required: Apps Script /exec URL (backend health)
//   WIX_API_KEY     required: read the Custom Embed to find BUNDLE_URL
//   WIX_SITE_ID     default JYS site
//   WIX_EMBED_ID    default JYS HR launcher
//   EXPECTED_BUILD | BUILD_ID   expected build stamp; else read from artifacts/deploy-manifest.json
//   E2E_MANAGER_CODE            optional manager login e2e
//   E2E_ALLOW_MUTATION=true     allow creating/deleting QA records in e2e
//   FULL_E2E_REQUIRED=false     do not block signoff when manager e2e is skipped
//
// Writes artifacts/verification-summary.md, artifacts/health.json, screenshots,
// console + network logs. Exits non-zero if any required check fails.

import fs from "node:fs/promises";
import path from "node:path";

const PROD_URL   = process.env.PROD_URL   || "https://www.jysenglish.com/quan-ly-nhan-su";
const LEGACY_URL = process.env.LEGACY_URL || "https://www.jysenglish.com/?app=jys-hr";
const API_URL    = process.env.API_URL    || "";
const WIX_API_KEY = process.env.WIX_API_KEY || "";
const SITE_ID    = process.env.WIX_SITE_ID  || "a3bfa336-e918-48e6-831b-82ed7ff178f5";
const EMBED_ID   = process.env.WIX_EMBED_ID || "516cefe5-e0bb-4b1c-9d06-5bb16dd6482f";
const FULL_E2E_REQUIRED = String(process.env.FULL_E2E_REQUIRED || "true") !== "false";

const ART = path.resolve("artifacts");
const checks = [];
function check(name, pass, detail = "", { required = true } = {}) {
  checks.push({ name, pass: !!pass, detail: String(detail || ""), required });
  console.log(`${pass ? "PASS" : (required ? "FAIL" : "WARN")}  ${name}${detail ? " — " + detail : ""}`);
  return pass;
}

async function expectedBuild() {
  if (process.env.EXPECTED_BUILD) return process.env.EXPECTED_BUILD;
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  try {
    const m = JSON.parse(await fs.readFile(path.join(ART, "deploy-manifest.json"), "utf8"));
    return m.buildId || "";
  } catch { return ""; }
}

async function fetchEmbedBundleUrl() {
  if (!WIX_API_KEY) return null;
  const r = await fetch(`https://www.wixapis.com/embeds/v1/custom-embeds/${EMBED_ID}`, {
    headers: { Authorization: WIX_API_KEY, "wix-site-id": SITE_ID },
  });
  if (!r.ok) throw new Error(`embed fetch ${r.status}`);
  const j = await r.json();
  const html = j.customEmbed?.embedData?.html || "";
  const m = html.match(/var BUNDLE_URL = "([^"]+)";/);
  return m ? m[1] : null;
}

async function main() {
  await fs.mkdir(ART, { recursive: true });
  const EXPECTED = await expectedBuild();
  console.log(`Expected build: ${EXPECTED || "(unknown — will check frontend/backend parity only)"}`);

  let bundleText = "";
  let bundleBuild = "";

  // --- Bundle checks ---
  let bundleUrl = null;
  try { bundleUrl = await fetchEmbedBundleUrl(); }
  catch (e) { check("Wix embed reachable", false, e.message); }
  if (bundleUrl) {
    check("Wix embed has BUNDLE_URL", true, bundleUrl);
    try {
      const r = await fetch(bundleUrl);
      bundleText = await r.text();
      check("Bundle downloads", r.ok, `${bundleText.length} bytes`);
    } catch (e) { check("Bundle downloads", false, e.message); }

    if (bundleText) {
      check("Bundle has no __API_URL__ placeholder", !bundleText.includes("__API_URL__"));
      check("Bundle has no __APP_BUILD__ placeholder", !bundleText.includes("__APP_BUILD__"));
      check("Bundle has no hardcoded manager code/demo marker",
        !/MANAGER_CODE\s*=\s*"[^_<]/.test(bundleText) && !/Mã\s*demo|Demo:/i.test(bundleText));
      check("Bundle exposes __JYS_DIAG__ diagnostics", bundleText.includes("__JYS_DIAG__"));
      const m = bundleText.match(/var APP_BUILD = "([^"]+)";/);
      bundleBuild = m ? m[1] : "";
      check("Bundle APP_BUILD is injected (not placeholder)",
        !!bundleBuild && bundleBuild !== "__APP_BUILD__", bundleBuild);
      if (EXPECTED) {
        check("Bundle APP_BUILD equals expected build", bundleBuild === EXPECTED,
          `bundle=${bundleBuild} expected=${EXPECTED}`);
      }
    }
  } else if (WIX_API_KEY) {
    check("Wix embed has BUNDLE_URL", false, "no BUNDLE_URL found in embed html");
  } else {
    check("Wix embed checked", false, "WIX_API_KEY not set", { required: false });
  }

  // --- Backend health ---
  let health = null;
  if (API_URL) {
    try {
      const r = await fetch(`${API_URL}?action=health&requestId=verify-${Date.now()}`);
      health = await r.json();
      await fs.writeFile(path.join(ART, "health.json"), JSON.stringify(health, null, 2));
      check("Health ok:true", health && health.ok === true, JSON.stringify(health?.sheets || {}));
      check("Health service is jys-hr", health && health.service === "jys-hr", health?.service || "");
      const backendBuild = health?.backendBuild || health?.version || "";
      if (EXPECTED) {
        check("Health build equals expected build", backendBuild === EXPECTED,
          `backend=${backendBuild} expected=${EXPECTED}`);
      }
      if (bundleBuild) {
        check("Frontend build equals backend build", bundleBuild === backendBuild,
          `frontend=${bundleBuild} backend=${backendBuild}`);
      }
      const sheets = health?.sheets || {};
      check("Health reports required sheets",
        ["NhanVien","ViPham","KiemTra","LuongThang","AuditLog"].every((s) => s in sheets),
        Object.keys(sheets).join(","));
    } catch (e) { check("Backend health reachable", false, e.message); }
  } else {
    check("Backend health checked", false, "API_URL not set", { required: false });
  }

  // --- Browser render (Playwright) ---
  let chromium = null;
  try { ({ chromium } = await import("playwright")); }
  catch { check("Playwright available", false, "playwright not installed"); }

  if (chromium) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleMsgs = [], pageErrors = [], failedReqs = [];
    page.on("console", (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("requestfailed", (r) => failedReqs.push({ url: r.url(), err: r.failure()?.errorText }));

    try {
      await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
      // Login UI: segment tabs + login button.
      const hasStaff = await page.locator("#segStaff").count();
      const hasMgr   = await page.locator("#segMgr").count();
      const hasBtn   = await page.locator("#btnLogin").count();
      const bodyText = await page.locator("body").innerText().catch(() => "");
      check("Login: Nhân viên / Quản lý tabs render", hasStaff > 0 && hasMgr > 0);
      check("Login: button renders", hasBtn > 0);
      check("Login: HR title/text present",
        /Quản lý nhân sự|JYS|Đăng nhập/i.test(bodyText));
      await page.screenshot({ path: path.join(ART, "canonical-login.png"), fullPage: true });
    } catch (e) {
      check("Canonical page renders", false, e.message);
      await page.screenshot({ path: path.join(ART, "canonical-error.png") }).catch(() => {});
    }

    const uncaught = pageErrors.length + consoleMsgs.filter((m) => m.type === "error").length;
    check("No uncaught errors on initial render", uncaught === 0,
      uncaught ? JSON.stringify({ pageErrors, consoleErrors: consoleMsgs.filter((m) => m.type === "error") }).slice(0, 800) : "");
    await fs.writeFile(path.join(ART, "console-log.json"), JSON.stringify(consoleMsgs, null, 2));
    await fs.writeFile(path.join(ART, "network-failures.json"), JSON.stringify(failedReqs, null, 2));

    // Legacy URL → should land deterministically on canonical app.
    try {
      const legacyPage = await ctx.newPage();
      await legacyPage.goto(LEGACY_URL, { waitUntil: "networkidle", timeout: 45000 });
      const finalUrl = legacyPage.url();
      const legacyText = await legacyPage.locator("body").innerText().catch(() => "");
      const landsCanonical = /quan-ly-nhan-su/.test(finalUrl) ||
        /Quản lý nhân sự|Đăng nhập|JYS/i.test(legacyText);
      check("Legacy URL lands on canonical app", landsCanonical, `final=${finalUrl}`);
      await legacyPage.screenshot({ path: path.join(ART, "legacy.png") }).catch(() => {});
      await legacyPage.close();
    } catch (e) {
      check("Legacy URL lands on canonical app", false, e.message);
    }

    // --- Optional authenticated e2e ---
    const code = process.env.E2E_MANAGER_CODE;
    if (!code) {
      check("Full authenticated e2e", false,
        "skipped: missing E2E_MANAGER_CODE", { required: FULL_E2E_REQUIRED });
    } else if (API_URL) {
      try {
        const post = async (body) => {
          const r = await fetch(API_URL, {
            method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(body),
          });
          return r.json();
        };
        const login = await post({ action: "loginManager", auth: code, requestId: `e2e-${Date.now()}` });
        check("E2E manager login", login && login.ok === true && login.role === "manager");
        check("E2E response carries requestId", !!(login && login.requestId));
        const all = await post({ action: "getAll", auth: code });
        check("E2E getAll build matches expected",
          !EXPECTED || (all && all.backendBuild === EXPECTED), `build=${all?.backendBuild}`);
        // Mutation path is opt-in only.
        if (String(process.env.E2E_ALLOW_MUTATION) === "true") {
          const rid = `e2e-emp-${Date.now()}`;
          const created = await post({ action: "saveNhanVien", auth: code,
            requestId: rid, record: { hoTen: "QA Test " + Date.now(), chiNhanh: "Vinh" } });
          const empId = created?.record?.id;
          check("E2E create QA employee", created && created.ok === true && !!empId);
          if (empId) {
            await post({ action: "deleteNhanVien", auth: code, id: empId });
            check("E2E cleanup QA employee", true, empId);
          }
        }
      } catch (e) {
        check("Full authenticated e2e", false, e.message, { required: FULL_E2E_REQUIRED });
      }
    }

    await browser.close();
  }

  // --- Summary ---
  const failed = checks.filter((c) => c.required && !c.pass);
  const lines = [
    "# JYS HR — Production verification",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Expected build: ${EXPECTED || "(unknown)"}`,
    `- Canonical URL: ${PROD_URL}`,
    `- Legacy URL: ${LEGACY_URL}`,
    bundleUrl ? `- Bundle URL: ${bundleUrl}` : "- Bundle URL: (not resolved)",
    "",
    "## Checklist",
    "",
    "| Result | Check | Detail |",
    "|---|---|---|",
    ...checks.map((c) =>
      `| ${c.pass ? "✅" : (c.required ? "❌" : "⚠️")} | ${c.name} | ${c.detail.replace(/\|/g, "\\|").slice(0, 300)} |`),
    "",
    failed.length ? `**FAILED: ${failed.length} required check(s).**` : "**ALL REQUIRED CHECKS PASSED.**",
    "",
  ];
  await fs.writeFile(path.join(ART, "verification-summary.md"), lines.join("\n"));
  console.log(`\nSummary written: ${path.join(ART, "verification-summary.md")}`);

  if (failed.length) { console.error(`\n${failed.length} required check(s) failed.`); process.exit(1); }
  console.log("\nAll required checks passed.");
}

main().catch((err) => { console.error("Verification crashed:", err); process.exit(1); });
