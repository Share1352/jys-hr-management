# Agent instructions for JYS HR Management

This repository is for the JYS HR management system.

## Source of truth

- `production/` is the only deployable app.
- `prototype/` is visual reference only. Do not deploy it. Do not copy demo auth logic from it.
- `archive/old-bundles/` is archival only.

## Architecture

- Frontend: `production/jys_quan_ly_nhan_su.html`, a single static HTML file.
- Backend: `production/Code.gs`, copied into Google Apps Script and connected to Google Sheets.
- Deployment target: hosted static HTML embedded into Wix, served at the single permanent URL `https://www.jysenglish.com/?app=jys-hr`.

## Security rules

Never commit secrets.

- Keep `var API_URL = "__API_URL__";` in committed HTML.
- The real Apps Script `/exec` URL must only be placed in a deploy copy, never committed.
- `MANAGER_CODE` must live only in Apps Script Script Properties.
- Do not hardcode or reintroduce old demo manager codes.
- Do not enable GitHub Pages until the blocker issue is resolved and `production/TEST_PLAN.md` passes.

## Current priority

Work from the GitHub issue titled `Blocking fixes before deployment`.

The known blocking areas are:

1. Fix the PIN reset modal bug in `production/jys_quan_ly_nhan_su.html`.
2. Make the existing employee PIN field readonly/display-only.
3. Ensure `production/Code.gs` has no default manager code.
4. Add/persist `ts` for `ViPham` and `KiemTra`.
5. Fix `KiemTra` name/branch/pos persistence or frontend fallback.
6. Move authenticated reads to POST if practical.
7. Run/update `production/TEST_PLAN.md`.

## Coding style

- Keep the app simple: vanilla JS frontend, no build step unless explicitly approved.
- Make minimal focused changes.
- Preserve Vietnamese UI text.
- Prefer small helper functions over scattered repeated logic.
- After changing behavior, update `production/TEST_PLAN.md`.
- Do not edit `prototype/` unless the task is explicitly about visual reference or archive cleanup.

## Validation before PR/commit

Run these checks locally:

```bash
grep -RIn --exclude-dir=.git -E 'script\.google\.com/macros/s/[A-Za-z0-9_-]{20,}' . || true
grep -RIn --exclude-dir=.git '<old-shared-manager-code>' . || true
grep -RIn --exclude-dir=.git 'Mã demo\|Demo:' production || true
```

Expected: no real Apps Script URL, no old manager code, and no production demo login.
