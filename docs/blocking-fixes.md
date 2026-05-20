Blocking issues that MUST be fixed and re-tested before this app is deployed
to production OR before GitHub Pages is enabled on this repo.

- [ ] fix PIN reset modal bug
- [ ] make employee PIN field readonly
- [ ] remove hardcoded default manager code from `Code.gs`
- [ ] change docs to use a new private `MANAGER_CODE`, not any old/shared code
- [ ] add `ts` to `ViPham` and `KiemTra` schema
- [ ] fix `KiemTra` name/branch/pos persistence or frontend fallback
- [ ] move authenticated reads to POST if possible
- [ ] rerun `production/TEST_PLAN.md`

Do not enable GitHub Pages until every box above is checked and the test plan is green.
