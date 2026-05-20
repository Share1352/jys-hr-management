Blocking issues that MUST be fixed and re-tested before this app is deployed
to production OR before GitHub Pages is enabled on this repo.

> Gate policy: mỗi mục chỉ được tick khi đã có **bằng chứng runtime validation** (ảnh/chụp màn hình, log Network/Console, hoặc kết quả sheet thực tế), không chỉ vì code đã sửa xong.

- [ ] fix PIN reset modal bug
- [ ] make employee PIN field readonly
- [ ] remove hardcoded default manager code from `Code.gs`
- [ ] change docs to use a new private `MANAGER_CODE`, not any old/shared code
- [ ] add `ts` to `ViPham` and `KiemTra` schema
- [ ] fix `KiemTra` name/branch/pos persistence or frontend fallback
- [ ] move authenticated reads to POST if possible
- [ ] rerun `production/TEST_PLAN.md`

## Runtime validation status (2026-05-20)

- Kết quả test plan đầy đủ đã được ghi vào `production/TEST_PLAN.md` với trạng thái **CHƯA đủ điều kiện rollout**.
- Vì chưa có evidence runtime production (Wix + Apps Script + Sheet), tất cả blocker vẫn phải giữ trạng thái mở/chưa tick.

## Required evidence before deployment gate opens

- `production/TEST_PLAN.md` phải được chạy đầy đủ và đính kèm bằng chứng pass/fail theo từng section.
- Phần **Final sign-off** trong `production/TEST_PLAN.md` phải được điền đủ thông tin owner + date + quyết định.
- Nếu thiếu bằng chứng test plan hoặc thiếu sign-off thì **không được enable GitHub Pages** và **không được rollout production**.

Do not enable GitHub Pages until every box above is checked, runtime-validated, and the completed test plan evidence is green.
