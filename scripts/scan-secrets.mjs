#!/usr/bin/env node
// Pre-commit / CI secret scan. Fails (exit 1) if a real secret appears in
// committed source. Placeholders and documentation examples are allowed.

import { execSync } from "node:child_process";

const EXCLUDES = [".git", "node_modules", ".tmp", "artifacts", "dist", "build", ".cache",
  "playwright-report", "test-results"].map((d) => `--exclude-dir=${d}`).join(" ");

function grep(pattern, paths = ".") {
  try {
    // -I skip binary, -n line numbers, -R recursive; skip deps/build/generated dirs.
    return execSync(`grep -RIn ${EXCLUDES} -E '${pattern}' ${paths}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim().split("\n").filter(Boolean);
  } catch { return []; } // grep exits 1 when no match
}

const findings = [];

// 1. Real Apps Script /exec URLs anywhere.
for (const line of grep("script\\.google\\.com/macros/s/[A-Za-z0-9_-]{20,}")) {
  // Allow documentation placeholders like ABCxyz... and the scan rule lines themselves.
  if (/ABCxyz|AKfy\.\.\.|\bgrep\b|script-url|\[A-Za-z0-9/.test(line)) continue;
  findings.push(`Apps Script URL leak: ${line}`);
}

// 2. Hardcoded API_URL in the production HTML (must stay __API_URL__ in source).
for (const line of grep('var API_URL = "https', "production")) {
  if (/TEST_PLAN|HUONG_DAN|ABCxyz/.test(line)) continue; // doc examples
  findings.push(`Hardcoded API_URL in source: ${line}`);
}

// 3. Hardcoded manager code.
for (const line of grep('MANAGER_CODE\\s*=\\s*"[^_<]', "production")) {
  findings.push(`Hardcoded manager code: ${line}`);
}

// 4. Tokens / credentials.
for (const line of grep("(WIX_API_KEY|ADMIN_PASS|ADMIN_USER|CLASP|OAuth|Bearer )[A-Za-z0-9._-]{8,}")) {
  if (/secrets\.|process\.env|\${{|description|README|runbook|\bgrep\b|CLASP_CREDENTIALS/.test(line)) continue;
  findings.push(`Possible credential: ${line}`);
}

if (findings.length) {
  console.error("Secret scan FAILED:");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("Secret scan OK — no real secrets in committed source.");
