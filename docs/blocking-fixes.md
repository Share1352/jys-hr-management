Blocking issues that MUST be fixed and re-tested before this app is deployed
to production OR before GitHub Pages is enabled on this repo.

> Gate policy: mỗi mục chỉ được tick khi đã có **bằng chứng runtime validation** (ảnh/chụp màn hình, log Network/Console, hoặc kết quả sheet thực tế), không chỉ vì code đã sửa xong.

- [x] fix PIN reset modal bug
- [x] make employee PIN field readonly
- [x] remove hardcoded default manager code from `Code.gs`
- [x] change docs to use a new private `MANAGER_CODE`, not any old/shared code
- [x] add `ts` to `ViPham` and `KiemTra` schema
- [x] fix `KiemTra` name/branch/pos persistence or frontend fallback
- [x] move authenticated reads to POST if possible
- [x] rerun `production/TEST_PLAN.md`

## Required evidence before deployment gate opens

- `production/TEST_PLAN.md` phải được chạy đầy đủ và đính kèm bằng chứng pass/fail theo từng section.
- Phần **Final sign-off** trong `production/TEST_PLAN.md` phải được điền đủ thông tin owner + date + quyết định.
- Nếu thiếu bằng chứng test plan hoặc thiếu sign-off thì **không được enable GitHub Pages** và **không được rollout production**.

Do not enable GitHub Pages until every box above is checked, runtime-validated, and the completed test plan evidence is green.
