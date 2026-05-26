# Observability runbook — JYS HR

How to answer operational questions about the live app from GitHub Actions and the
backend, without manual poking. Single app URL (permanent): `https://www.jysenglish.com/?app=jys-hr`.

## Required repository configuration

Secrets (Settings → Secrets and variables → Actions → Secrets):

| Secret | Used by | Purpose |
|---|---|---|
| `API_URL` | deploy + verify | Apps Script `/exec` URL (backend). Never printed. |
| `WIX_API_KEY` | deploy + verify | Read/patch the Wix Custom Embed + Media. |
| `GAS_SCRIPT_ID` | deploy:gas | Apps Script project id. |
| `CLASP_CREDENTIALS_JSON` | deploy:gas | Contents of `~/.clasprc.json` (clasp oauth). |
| `GAS_DEPLOYMENT_ID` | deploy:gas (optional) | Update the SAME web-app deployment in place so `API_URL` reflects the new build. **Set this if `API_URL` is a fixed versioned `/exec`.** |
| `E2E_MANAGER_CODE` | verify (optional) | Enables authenticated end-to-end checks. |
| `ALERT_WEBHOOK_URL` | both (optional) | POST a JSON alert on failure. |

Variables (Settings → Variables): `WIX_SITE_ID`, `WIX_EMBED_ID` (defaults baked in), `FULL_E2E_REQUIRED` (default `false`).

> If a required secret is missing, the deploy workflow fails at the **Preflight** step and prints exactly which names are missing — it never deploys a partial/mismatched stack.

## "Is the latest version live?"

1. Open the latest **Deploy HR** run → its artifact `deploy-manifest.json` has `buildId` + `bundleUrl`.
2. `curl "$API_URL?action=health"` → `backendBuild` must equal that `buildId`.
3. Open `https://www.jysenglish.com/?app=jys-hr` → footer "Phiên bản hệ thống: giao diện … · máy chủ …" must show the same build on both sides. A red banner appears if they differ.
4. Or just read `artifacts/verification-summary.md` from the latest **Verify production** run.

## "What failed?"

1. Read `artifacts/verification-summary.md` — one row per check with ✅/❌ and detail.
2. `artifacts/console-log.json` + `network-failures.json` — browser-side errors on initial render.
3. `artifacts/health.json` — backend health + per-sheet status.
4. Screenshot (`app-login.png`) — what the page actually rendered.
5. Backend: manager → tab **Chẩn đoán** → **Tải log gần đây**, or call `getAuditLog`.

## Using requestId

- Every backend response includes `requestId`. The frontend mirrors it in `window.__JYS_DIAG__.lastRequestId`.
- Every request is written to `AuditLog` with that `requestId`. Frontend telemetry (`clientLog`) carries the same id where available.
- To trace one failed user action: get the `requestId` from the user's browser console (`window.__JYS_DIAG__`), then `getAuditLog` with `{ requestId }` to see backend + frontend rows for it.

## Reading AuditLog safely

- Manager-only: `POST {action:"getAuditLog", auth:<managerCode>, limit:100, level?, status?, action?, requestId?, since?}`. Newest first.
- Values are redacted on write **and** again on read — no manager code, PIN, password, full API URL, Authorization/Bearer, or cookie ever appears.
- Filter by `status` to triage: `auth_failure`, `validation_error`, `exception`, `malformed_json`, `client`, `success`.

## Run verify-production manually

- GitHub: Actions → **Verify production** → Run workflow.
- Local: `npm install && npx playwright install --with-deps chromium && API_URL=… WIX_API_KEY=… npm run verify:production`. Artifacts land in `artifacts/`.

## Rollback

1. Actions → **Deploy HR** → Run workflow → pick the last known-good commit SHA.
2. Or re-point the Wix Custom Embed `BUNDLE_URL` to the previous run's `deploy-manifest.json` `bundleUrl`, then republish Wix.
3. Confirm: `?action=health` build matches, the app renders at `https://www.jysenglish.com/?app=jys-hr`, no console errors. Re-run **Verify production**.
