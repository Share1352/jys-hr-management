# Wix setup — single permanent HR URL

## Policy: one URL, forever

The app has exactly **one** access URL on the website:

```
https://www.jysenglish.com/?app=jys-hr
```

- No second page. No `/quan-ly-nhan-su`. No `#jys-hr`. One URL avoids confusion and split traffic.
- The app is served by the site-wide Wix **Custom Embed** named **"JYS HR app launcher"** (embed id `516cefe5-e0bb-4b1c-9d06-5bb16dd6482f`, site `a3bfa336-e918-48e6-831b-82ed7ff178f5`).
- The launcher holds a single line `var BUNDLE_URL = "…";` pointing at the current bundle in Wix Media. The deploy pipeline updates that line on every release.

## How a deploy reaches production (no manual Wix step)

`.github/workflows/deploy-wix.yml` does it all:

1. `scripts/deploy-wix.mjs` injects `API_URL` + `APP_BUILD` into `jys_quan_ly_nhan_su.html`, uploads it to Wix Media as a new file, and PATCHes the Custom Embed's `BUNDLE_URL` to that file.
2. It re-fetches the embed and confirms `BUNDLE_URL` now equals the uploaded URL.
3. `scripts/verify-production.mjs` opens `https://www.jysenglish.com/?app=jys-hr` in a real browser and confirms the app renders with the expected build.

You do **not** open the Wix Editor for a normal release. Wix's SSR/CDN cache catches up within ~5 minutes.

## One-time launcher requirements

The launcher embed must already exist and be enabled (it is). It must:

- Fetch `BUNDLE_URL`, create a blob/iframe, and render the bundle when the page URL carries `?app=jys-hr`.
- Be a **site-wide** Custom Embed so it is present on the homepage where `?app=jys-hr` is read.

If the launcher is ever lost, recreate a site-wide Custom Embed that:
1. Reads `location.search` for `app=jys-hr`.
2. Fetches `BUNDLE_URL`, then injects the response as an iframe (`srcdoc` or a `blob:` URL) filling the viewport.
3. Keeps the exact line `var BUNDLE_URL = "…";` so the deploy script can patch it.

## Verify / rollback

- Verify anytime: GitHub → Actions → **Verify production** → Run workflow. Read `artifacts/verification-summary.md`.
- Manual spot check:
  ```bash
  curl -fsSL "$BUNDLE_URL" | grep -o 'var APP_BUILD = "[^"]*"'   # bundle build
  curl -fsSL "$API_URL?action=health" | jq .backendBuild         # backend build (must match)
  ```
- Rollback: re-run `deploy-wix.yml` from a known-good commit, or PATCH the embed `BUNDLE_URL` back to the previous `artifacts/deploy-manifest.json` `bundleUrl`.

## Troubleshooting

- **App not loading / "Không kết nối được máy chủ…":** backend issue, not Wix. Check `?action=health`.
- **Old version showing:** Wix CDN cache; wait up to 5 min, hard-refresh.
- **Two scrollbars / black bar:** launcher iframe sizing on the homepage; set it to `100vh`, full width.

Observability contract (health endpoint, build IDs, AuditLog, diagnostics): see `README.md` and `docs/observability-runbook.md`.
