#!/usr/bin/env node
// Static checks runnable without any secrets or network:
//   - source placeholders are present in committed HTML
//   - backend/frontend expose the required observability surface
//   - all .mjs scripts parse
//   - the HTML's inline <script> parses

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fails.push(msg); };

const html = await fs.readFile("production/jys_quan_ly_nhan_su.html", "utf8");
const code = await fs.readFile("production/Code.gs", "utf8");

// Source placeholders must remain in committed source.
ok(html.includes('var API_URL = "__API_URL__";'), "HTML keeps __API_URL__ placeholder");
ok(html.includes('var APP_BUILD = "__APP_BUILD__";'), "HTML keeps __APP_BUILD__ placeholder");

// Frontend observability surface.
ok(html.includes("window.__JYS_DIAG__"), "HTML defines __JYS_DIAG__");
ok(/var BUILD_INFO = \{/.test(html), "HTML defines BUILD_INFO");
ok(html.includes("reportClientEvent"), "HTML has reportClientEvent telemetry");
ok(html.includes('addEventListener("error"'), "HTML captures window errors");
ok(html.includes('addEventListener("unhandledrejection"'), "HTML captures unhandled rejections");
ok(html.includes("probeHealth_"), "HTML has startup health probe");
ok(html.includes("renderDiag"), "HTML has manager diagnostics panel");
// Diagnostics must not expose the full API_URL.
ok(!/__JYS_DIAG__[\s\S]{0,400}apiUrl\s*:/.test(html), "Diagnostics object does not expose full API_URL");

// Backend observability surface.
ok(/case "health":/.test(code), "Backend has health action");
ok(/case "ping":/.test(code), "Backend keeps ping alias");
ok(code.includes("function clientLog_"), "Backend has clientLog_ sink");
ok(code.includes("function getAuditLog_"), "Backend has getAuditLog_");
ok(code.includes("function sanitizeForLog_"), "Backend has sanitizeForLog_ redaction");
ok(code.includes("function logEvent_"), "Backend has logEvent_");
ok(/COLS_AUDIT\s*=\s*\[[\s\S]*requestId[\s\S]*durationMs[\s\S]*userAgent/.test(code),
  "AuditLog schema includes requestId/durationMs/userAgent");

// Every script parses.
for (const f of ["scripts/deploy-wix.mjs", "scripts/deploy-gas.mjs", "scripts/verify-production.mjs", "scripts/scan-secrets.mjs"]) {
  try { execSync(`node --check ${f}`); ok(true, `${f} parses`); }
  catch (e) { ok(false, `${f} parses (${e.message})`); }
}

// HTML inline script parses.
try {
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  await fs.writeFile(".tmp-app-check.js", m[1]);
  execSync("node --check .tmp-app-check.js");
  await fs.rm(".tmp-app-check.js");
  ok(true, "HTML inline <script> parses");
} catch (e) { ok(false, `HTML inline <script> parses (${e.message})`); }

if (fails.length) { console.error(`\n${fails.length} static check(s) failed.`); process.exit(1); }
console.log("\nAll static checks passed.");
