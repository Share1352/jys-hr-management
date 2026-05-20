Blocking issues that MUST be fixed and re-tested before this app is deployed
to production OR before GitHub Pages is enabled on this repo.

- [x] fix PIN reset modal bug
- [x] make employee PIN field readonly
- [x] remove hardcoded default manager code from `Code.gs`
- [x] change docs to use a new private `MANAGER_CODE`, not any old/shared code
- [x] add `ts` to `ViPham` and `KiemTra` schema
- [x] fix `KiemTra` name/branch/pos persistence or frontend fallback
- [x] move authenticated reads to POST if possible
- [x] rerun `production/TEST_PLAN.md`

Do not enable GitHub Pages until every box above is checked and the test plan is green.
