/* ============================================================
 * JYS IELTS — Hệ thống quản lý nhân sự
 * Backend: Google Apps Script (Web App) + Google Sheets
 *
 * Cài đặt:
 *   1. Tạo Google Sheet trống.
 *   2. Tools > Apps Script, dán toàn bộ file này.
 *   3. Project Settings > Script Properties: thêm MANAGER_CODE = <mã riêng do bạn chọn — KHÔNG commit vào repo>
 *   4. Chạy hàm khoiTaoSheet() một lần (cấp quyền nếu được hỏi).
 *   5. Deploy > New deployment > Web app:
 *        Execute as: Me
 *        Who has access: Anyone
 *      Sao chép URL /exec rồi dán vào API_URL trong file HTML.
 * ============================================================ */

/* ----- Hằng số ----- */
var SHEET_NHANVIEN   = "NhanVien";
var SHEET_VIPHAM     = "ViPham";
var SHEET_KIEMTRA    = "KiemTra";
var SHEET_LUONGTHANG = "LuongThang";
var SHEET_AUDIT      = "AuditLog";

var COLS_NHANVIEN = [
  "id","maNV","hoTen","maCaNhan","chiNhanh","viTri",
  "ngaySinh","soDienThoai","email",
  "ngayVaoLam","loaiHopDong","hopDongTu","hopDongDen",
  "luongThang","quyenLoiKhac","ghiChu",
  "active","createdAt","updatedAt"
];
var COLS_VIPHAM     = ["id","empId","date","ts","code","qty","amount","note","createdAt","createdBy"];
var COLS_KIEMTRA    = ["id","empId","name","branch","pos","date","ts","score","total","passed","answersJson","createdAt"];
var COLS_LUONGTHANG = ["id","empId","month","luongThucTe","ghiChu","createdAt","updatedAt","createdBy"];
// Append-only schema: ensureSheet_ adds any missing columns to existing AuditLog
// sheets without dropping old data. Order here only matters for fresh installs.
var COLS_AUDIT      = [
  "id","ts","requestId","level","status","source",
  "actorRole","actorId","action","targetSheet","targetId",
  "message","detailsJson","durationMs","build","userAgent"
];

var BRANCHES = ["Đô Lương", "Vinh", "Quảng Sơn"];
var DEFAULT_APP_BUILD = "dev";


/* ============================================================
 * KHỞI TẠO SHEET
 * Tạo các tab nếu chưa có, kèm dòng tiêu đề.
 * ============================================================ */
function khoiTaoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NHANVIEN,   COLS_NHANVIEN);
  ensureSheet_(ss, SHEET_VIPHAM,     COLS_VIPHAM);
  ensureSheet_(ss, SHEET_KIEMTRA,    COLS_KIEMTRA);
  ensureSheet_(ss, SHEET_LUONGTHANG, COLS_LUONGTHANG);
  ensureSheet_(ss, SHEET_AUDIT,      COLS_AUDIT);

  // MANAGER_CODE phải được đặt thủ công trong Script Properties.
  // KHÔNG đặt giá trị mặc định ở đây — tránh commit mã quản lý vào repo.
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("MANAGER_CODE")) {
    throw new Error("Chưa cấu hình MANAGER_CODE. Vào Project Settings > Script Properties và thêm property MANAGER_CODE trước khi chạy khoiTaoSheet().");
  }
  return "Đã khởi tạo xong các sheet: " + [SHEET_NHANVIEN,SHEET_VIPHAM,SHEET_KIEMTRA,SHEET_LUONGTHANG,SHEET_AUDIT].join(", ");
}

function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,cols.length).setValues([cols]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,cols.length).setFontWeight("bold");
  } else {
    // bảo đảm các cột tồn tại; chỉ append cột mới khi cần
    var existing = sh.getRange(1,1,1,Math.max(1, sh.getLastColumn())).getValues()[0];
    var existingLower = existing.map(function(v){return String(v).trim();});
    var changed = false;
    cols.forEach(function(c){
      if (existingLower.indexOf(c) < 0) {
        existing.push(c);
        existingLower.push(c);
        changed = true;
      }
    });
    if (changed) {
      sh.getRange(1,1,1,existing.length).setValues([existing]);
      sh.getRange(1,1,1,existing.length).setFontWeight("bold");
    }
  }
}


/* ============================================================
 * ROUTER + REQUEST WRAPPER
 * Every request gets a requestId, duration, and an AuditLog row.
 * jsonOk_/jsonErr_ read CTX to stamp requestId/backendBuild/timestamp.
 * ============================================================ */
var CTX = null;  // per-request context, set by doGet/doPost

function getAppBuild_() {
  return PropertiesService.getScriptProperties().getProperty("APP_BUILD") || DEFAULT_APP_BUILD;
}

function newRequestId_() {
  try { return Utilities.getUuid(); }
  catch (e) { return "req_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1e6); }
}

function ctxReq_() { return (CTX && CTX.requestId) || ""; }
function ctxDur_() { return CTX ? (new Date().getTime() - CTX.started) : ""; }

function isAuthMessage_(m) {
  return /sai mã|mã quản lý không đúng|không có quyền|sai tài khoản/i.test(String(m || ""));
}

/* Canonical health endpoint — public, non-sensitive. No manager code,
 * no staff data, no spreadsheet id, no API URL. */
function healthResponse_() {
  var build = getAppBuild_();
  return jsonOk_({
    service: "jys-hr",
    version: build,
    backendBuild: build,
    timestamp: new Date().toISOString(),
    ts: new Date().getTime(),
    runtime: "google-apps-script",
    sheets: {
      NhanVien:   sheetExists_(SHEET_NHANVIEN),
      ViPham:     sheetExists_(SHEET_VIPHAM),
      KiemTra:    sheetExists_(SHEET_KIEMTRA),
      LuongThang: sheetExists_(SHEET_LUONGTHANG),
      AuditLog:   sheetExists_(SHEET_AUDIT)
    }
  });
}

function doGet(e) {
  var started = new Date().getTime();
  var action = (e && e.parameter && e.parameter.action) || "";
  CTX = { requestId: newRequestId_(), started: started, build: getAppBuild_(),
          source: "backend", action: action, errored: false, errorMessage: "", audited: false };
  try {
    var out;
    switch (action) {
      case "health":            // canonical
      case "ping":              // backward-compatible alias
        out = healthResponse_();
        break;
      case "":
        out = jsonErr_("Chỉ hỗ trợ POST cho các action nghiệp vụ. Vui lòng gọi doPost.");
        break;
      default:
        out = jsonErr_("GET không được hỗ trợ cho action: " + action + ". Hãy dùng POST.");
    }
    logEvent_({
      level: CTX.errored ? "warn" : "info",
      status: CTX.errored ? "validation_error" : "success",
      source: "backend", action: action || "(get)", requestId: CTX.requestId,
      durationMs: new Date().getTime() - started, build: CTX.build,
      message: CTX.errorMessage, details: { method: "GET" }
    });
    return out;
  } catch (err) {
    var msg = sanitizeMessage_(String(err && err.message || err));
    logEvent_({ level: "error", status: "exception", source: "backend",
      action: action || "(get)", requestId: CTX.requestId,
      durationMs: new Date().getTime() - started, build: CTX.build, message: msg });
    return jsonErr_(msg);
  } finally {
    CTX = null;
  }
}

function doPost(e) {
  var started = new Date().getTime();
  var malformed = false;
  var body = {};
  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); }
    catch (er) { body = {}; malformed = true; }
  }
  var requestId = (body && body.requestId) ? String(body.requestId).slice(0, 64) : newRequestId_();
  var action = (body && body.action) || "";
  CTX = { requestId: requestId, started: started, build: getAppBuild_(),
          source: "backend", action: action, errored: false, errorMessage: "", audited: false };
  var isClientLog = (action === "clientLog");
  try {
    if (malformed) {
      logEvent_({ level: "warn", status: "malformed_json", source: "backend",
        action: action || "(unknown)", requestId: requestId,
        durationMs: new Date().getTime() - started, build: CTX.build,
        message: "Malformed JSON body" });
    }
    var out = routeAction_(body);
    if (!isClientLog) {
      if (CTX.errored) {
        var authErr = isAuthMessage_(CTX.errorMessage);
        logEvent_({ level: "warn", status: authErr ? "auth_failure" : "validation_error",
          source: "backend", action: action || "(unknown)", requestId: requestId,
          durationMs: new Date().getTime() - started, build: CTX.build,
          message: CTX.errorMessage });
      } else if (!malformed && !CTX.audited) {
        // Read-only / non-audited success: still record the request envelope.
        logEvent_({ level: "info", status: "success", source: "backend",
          action: action || "(unknown)", requestId: requestId,
          durationMs: new Date().getTime() - started, build: CTX.build });
      }
    }
    return out;
  } catch (err) {
    var raw = String(err && err.message || err);
    var msg = sanitizeMessage_(raw);
    var authErr = isAuthMessage_(raw);
    logEvent_({ level: authErr ? "warn" : "error",
      status: authErr ? "auth_failure" : "exception", source: "backend",
      action: action || "(unknown)", requestId: requestId,
      durationMs: new Date().getTime() - started, build: CTX.build, message: msg });
    return jsonErr_(msg);
  } finally {
    CTX = null;
  }
}

function routeAction_(body) {
  var action = body.action || "";
  switch (action) {
    case "health":         return healthResponse_();
    case "ping":           return healthResponse_();
    case "clientLog":      return clientLog_(body);
    case "getAuditLog":    return getAuditLog_(body);
    case "listNames":      return jsonOk_({names: listNames_()});
    case "emailManagerCode": return emailManagerCode_();
    case "loginManager":   return loginManager_(body.auth);
    case "loginStaff":     return loginStaff_(body.empId, body.auth);
    case "getAll":         return getAll_(body.auth);
    case "getMine":        return getMine_(body.empId, body.auth);
    case "saveNhanVien":   return saveNhanVien_(body);
    case "deleteNhanVien": return deleteNhanVien_(body);
    case "saveViPham":     return saveViPham_(body);
    case "deleteViPham":   return deleteViPham_(body);
    case "saveKiemTra":    return saveKiemTra_(body);
    case "deleteKiemTra":  return deleteKiemTra_(body);
    case "saveLuongThang":   return saveLuongThang_(body);
    case "deleteLuongThang": return deleteLuongThang_(body);
    case "adminLogin":     return adminLogin_(body.auth, body.user, body.pass);
    case "adminGetCodes":  return adminGetCodes_(body.auth);
    case "adminSaveCodes": return adminSaveCodes_(body.auth, body.managerCode, body.updates);
    default:               return jsonErr_("Hành động không hợp lệ: " + action);
  }
}


/* ============================================================
 * AUTH HELPERS
 * ============================================================ */
function getManagerCode_() {
  return PropertiesService.getScriptProperties().getProperty("MANAGER_CODE") || "";
}

function getRecoveryEmail_() {
  return PropertiesService.getScriptProperties().getProperty("RECOVERY_EMAIL") || "";
}

// Run ONCE from the Apps Script editor (Run button) to grant the script the
// permission to send email (scope script.send_mail). Google requires the owner
// to approve this interactively — it cannot be granted by clasp/CI. On approval
// it also sends a confirmation email to RECOVERY_EMAIL so you know it works.
function authorizeServices() {
  var to = getRecoveryEmail_();
  if (to) {
    MailApp.sendEmail({
      to: to,
      subject: "JYS HR — Quyền gửi email đã được cấp",
      body: "Nếu bạn nhận được email này, tính năng gửi mã quản lý khôi phục đã hoạt động.\n"
          + "Thời gian: " + new Date().toISOString()
    });
  }
  return "OK" + (to ? " — đã gửi email thử tới " + to : " — chưa đặt RECOVERY_EMAIL");
}

// Emails the CURRENT manager code to the pre-configured recovery address ONLY.
// reason: "recovery" (forgot) | "update" (code changed). Never sends to a
// caller-supplied address; the code is never written to logs.
function sendManagerCodeEmail_(reason) {
  var to = getRecoveryEmail_();
  if (!to) return false;
  var code = getManagerCode_();
  if (!code) return false;
  var subj = reason === "update" ? "JYS HR — Mã quản lý đã được cập nhật" : "JYS HR — Mã quản lý của bạn";
  var body = "Mã quản lý hiện tại: " + code + "\n\n"
    + "Đăng nhập tại: https://www.jysenglish.com/?app=jys-hr\n\n"
    + (reason === "update"
        ? "Mã vừa được thay đổi từ trang quản trị.\n"
        : "Bạn (hoặc ai đó) đã yêu cầu khôi phục mã. Nếu không phải bạn, hãy đổi mã ngay.\n")
    + "Thời gian: " + new Date().toISOString();
  MailApp.sendEmail({ to: to, subject: subj, body: body });
  return true;
}

// Recovery endpoint — unauthenticated by design (for a forgotten code).
// Sends ONLY to the pre-set recovery email, rate-limited to 1/5min, audited.
function emailManagerCode_() {
  var to = getRecoveryEmail_();
  if (!to) return jsonErr_("Chưa cấu hình email khôi phục. Đặt RECOVERY_EMAIL trong Script Properties hoặc trang quản trị.");
  var props = PropertiesService.getScriptProperties();
  var last = Number(props.getProperty("LAST_RECOVERY_TS") || "0");
  var now = Date.now();
  if (now - last < 5 * 60 * 1000) {
    logEvent_({ level: "warn", status: "rate_limited", source: "backend", actorRole: "anon",
      action: "emailManagerCode", requestId: ctxReq_(), durationMs: ctxDur_(),
      message: "Yêu cầu gửi mã quá nhanh — bị giới hạn" });
    if (CTX) CTX.audited = true;
    return jsonErr_("Vui lòng đợi vài phút rồi thử lại.");
  }
  if (!getManagerCode_()) return jsonErr_("Chưa cấu hình mã quản lý.");
  sendManagerCodeEmail_("recovery");
  props.setProperty("LAST_RECOVERY_TS", String(now));
  logEvent_({ level: "info", status: "success", source: "backend", actorRole: "anon",
    action: "emailManagerCode", requestId: ctxReq_(), durationMs: ctxDur_(),
    message: "Đã gửi mã quản lý tới email khôi phục" });
  if (CTX) CTX.audited = true;
  return jsonOk_({ sent: true });
}

function isManager_(auth) {
  if (!auth) return false;
  var code = getManagerCode_();
  if (!code) return false;
  return String(auth) === String(code);
}

function requireManager_(auth) {
  if (!isManager_(auth)) {
    throw new Error("Mã quản lý không đúng");
  }
}

function getStaffByCredentials_(empId, pin) {
  if (!empId || !pin) return null;
  if (!/^\d{4}$/.test(String(pin))) return null;
  var rows = readSheet_(SHEET_NHANVIEN);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(empId) &&
        String(rows[i].maCaNhan) === String(pin)) {
      return rows[i];
    }
  }
  return null;
}



function getEmpById_(empId) {
  if (!empId) return null;
  var rows = readSheet_(SHEET_NHANVIEN);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(empId)) return rows[i];
  }
  return null;
}

/* ============================================================
 * READ HELPERS
 * ============================================================ */
function sh_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function readSheet_(name) {
  var sh = sh_(name);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var cols = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var vals = sh.getRange(2,1,last-1,cols.length).getValues();
  return vals.map(function(row){
    var obj = {};
    cols.forEach(function(c,i){ obj[c] = row[i]; });
    return obj;
  });
}

function rowIndexById_(name, id) {
  var sh = sh_(name);
  if (!sh) return -1;
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var idCol = 1; // assume 'id' is col 1
  var ids = sh.getRange(2, idCol, last-1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // sheet row number
  }
  return -1;
}

function appendRow_(name, obj) {
  var sh = sh_(name);
  if (!sh) throw new Error("Sheet không tồn tại: " + name);
  var cols = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var row = cols.map(function(c){ return obj[c] != null ? obj[c] : ""; });
  sh.appendRow(row);
}

function updateRow_(name, rowNum, obj) {
  var sh = sh_(name);
  if (!sh) throw new Error("Sheet không tồn tại: " + name);
  var cols = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var current = sh.getRange(rowNum,1,1,cols.length).getValues()[0];
  var row = cols.map(function(c,i){
    if (obj.hasOwnProperty(c)) return obj[c];
    return current[i];
  });
  sh.getRange(rowNum,1,1,cols.length).setValues([row]);
}

function deleteRow_(name, rowNum) {
  var sh = sh_(name);
  if (!sh) return;
  sh.deleteRow(rowNum);
}


/* ============================================================
 * ACTIONS — public (no auth)
 * ============================================================ */
function listNames_() {
  var rows = readSheet_(SHEET_NHANVIEN);
  return rows
    .filter(function(r){ return String(r.active||"1") !== "0"; })
    .map(function(r){
      return { id: r.id, hoTen: r.hoTen, chiNhanh: r.chiNhanh };
    });
}


/* ============================================================
 * ACTIONS — login
 * ============================================================ */
function loginManager_(auth) {
  if (!isManager_(auth)) return jsonErr_("Sai mã quản lý");
  audit_("manager", "", "loginManager", "", "", {});
  return jsonOk_({role: "manager"});
}

function loginStaff_(empId, auth) {
  var emp = getStaffByCredentials_(empId, auth);
  if (!emp) return jsonErr_("Sai mã cá nhân");
  audit_("staff", empId, "loginStaff", SHEET_NHANVIEN, empId, {});
  return jsonOk_({role: "staff", empId: empId, hoTen: emp.hoTen});
}


/* ============================================================
 * ACTIONS — manager: getAll, save/delete
 * ============================================================ */
function getAll_(auth) {
  if (!isManager_(auth)) return jsonErr_("Mã quản lý không đúng");
  return jsonOk_({
    backendBuild: getAppBuild_(),
    nhanvien:   readSheet_(SHEET_NHANVIEN).filter(function(r){ return String(r.active||"1") !== "0"; }),
    vipham:     readSheet_(SHEET_VIPHAM),
    kiemtra:    readSheet_(SHEET_KIEMTRA),
    luongthang: readSheet_(SHEET_LUONGTHANG)
  });
}

function getMine_(empId, auth) {
  var emp = getStaffByCredentials_(empId, auth);
  if (!emp) return jsonErr_("Sai mã cá nhân");
  // Đừng để lộ maCaNhan của người khác — nhưng đây là chính mình nên ok
  var profile = emp;
  var vipham     = readSheet_(SHEET_VIPHAM).filter(function(v){ return String(v.empId) === String(empId); });
  var kiemtra    = readSheet_(SHEET_KIEMTRA).filter(function(k){ return String(k.empId) === String(empId); });
  var luongthang = readSheet_(SHEET_LUONGTHANG).filter(function(l){ return String(l.empId) === String(empId); });
  return jsonOk_({backendBuild: getAppBuild_(), profile: profile, vipham: vipham, kiemtra: kiemtra, luongthang: luongthang});
}

function saveNhanVien_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var rec = body.record || {};
    if (!rec.id) rec.id = uid_();
    if (!rec.hoTen) return jsonErr_("Thiếu họ tên");

    // Validate chi nhánh
    if (rec.chiNhanh && BRANCHES.indexOf(rec.chiNhanh) < 0) {
      return jsonErr_("Chi nhánh không hợp lệ: " + rec.chiNhanh);
    }

    var nowIso = new Date().toISOString();
    var existingRow = rowIndexById_(SHEET_NHANVIEN, rec.id);
    var isNew = (existingRow < 0) || body.isNew;
    var existing = null;
    if (existingRow > 0) {
      existing = readSheet_(SHEET_NHANVIEN).filter(function(r){
        return String(r.id) === String(rec.id);
      })[0];
    }

    // Quy tắc PIN
    if (isNew) {
      // Tạo mới: backend luôn sinh PIN
      rec.maCaNhan = generateUniquePin_();
      rec.active   = (rec.active == null ? "1" : rec.active);
      rec.createdAt = nowIso;
      rec.updatedAt = nowIso;
    } else {
      // Sửa: giữ PIN cũ trừ khi regeneratePin
      if (body.regeneratePin) {
        rec.maCaNhan = generateUniquePin_();
      } else {
        rec.maCaNhan = (existing && existing.maCaNhan) ? existing.maCaNhan : (rec.maCaNhan || generateUniquePin_());
      }
      rec.active   = (rec.active == null ? (existing && existing.active != null ? existing.active : "1") : rec.active);
      rec.createdAt = (existing && existing.createdAt) || nowIso;
      rec.updatedAt = nowIso;
    }

    if (existingRow > 0) {
      updateRow_(SHEET_NHANVIEN, existingRow, rec);
    } else {
      appendRow_(SHEET_NHANVIEN, rec);
    }

    audit_("manager", "", isNew ? "createNhanVien" : "updateNhanVien",
      SHEET_NHANVIEN, rec.id, {pinRegenerated: !!body.regeneratePin});

    return jsonOk_({record: rec, isNew: isNew});
  } finally {
    lock.releaseLock();
  }
}

function deleteNhanVien_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var id = body.id;
    if (!id) return jsonErr_("Thiếu id");
    var rowNum = rowIndexById_(SHEET_NHANVIEN, id);
    if (rowNum > 0) deleteRow_(SHEET_NHANVIEN, rowNum);

    // Xoá vi phạm và kiểm tra của nhân viên
    var vp = sh_(SHEET_VIPHAM);
    if (vp && vp.getLastRow() > 1) {
      var vrows = vp.getRange(2,1,vp.getLastRow()-1, vp.getLastColumn()).getValues();
      for (var i = vrows.length - 1; i >= 0; i--) {
        if (String(vrows[i][1]) === String(id)) vp.deleteRow(i + 2);
      }
    }
    var kt = sh_(SHEET_KIEMTRA);
    if (kt && kt.getLastRow() > 1) {
      var krows = kt.getRange(2,1,kt.getLastRow()-1, kt.getLastColumn()).getValues();
      for (var j = krows.length - 1; j >= 0; j--) {
        if (String(krows[j][1]) === String(id)) kt.deleteRow(j + 2);
      }
    }

    audit_("manager", "", "deleteNhanVien", SHEET_NHANVIEN, id, {});
    return jsonOk_({deleted: id});
  } finally {
    lock.releaseLock();
  }
}

function saveViPham_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var rec = body.record || {};
    if (!rec.id) rec.id = uid_();
    if (!rec.empId) return jsonErr_("Thiếu empId");
    if (!rec.code)  return jsonErr_("Thiếu mã lỗi");
    if (!rec.date)  return jsonErr_("Thiếu ngày vi phạm");
    rec.qty = Number(rec.qty) || 1;
    rec.amount = Number(rec.amount) || 0;
    rec.createdAt = rec.createdAt || new Date().toISOString();
    rec.ts = Number(rec.ts) || Date.now();
    rec.createdBy = "manager";

    var existingRow = rowIndexById_(SHEET_VIPHAM, rec.id);
    if (existingRow > 0) updateRow_(SHEET_VIPHAM, existingRow, rec);
    else appendRow_(SHEET_VIPHAM, rec);

    audit_("manager", "", existingRow > 0 ? "updateViPham" : "createViPham",
      SHEET_VIPHAM, rec.id, {empId: rec.empId, code: rec.code, amount: rec.amount});
    return jsonOk_({record: rec});
  } finally {
    lock.releaseLock();
  }
}

function deleteViPham_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var id = body.id;
    if (!id) return jsonErr_("Thiếu id");
    var rowNum = rowIndexById_(SHEET_VIPHAM, id);
    if (rowNum > 0) deleteRow_(SHEET_VIPHAM, rowNum);
    audit_("manager", "", "deleteViPham", SHEET_VIPHAM, id, {});
    return jsonOk_({deleted: id});
  } finally {
    lock.releaseLock();
  }
}

function saveKiemTra_(body) {
  // Cho phép cả manager và staff (staff phải đúng auth + đúng empId chính mình)
  var rec = body.record || {};
  if (!rec.empId) return jsonErr_("Thiếu empId");

  var actorRole = "";
  if (isManager_(body.auth)) {
    actorRole = "manager";
  } else {
    // staff: auth là PIN của chính họ; rec.empId phải khớp
    var emp = getStaffByCredentials_(rec.empId, body.auth);
    if (!emp) return jsonErr_("Không có quyền lưu kết quả cho người này");
    actorRole = "staff";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (!rec.id) rec.id = uid_();
    rec.score = Number(rec.score) || 0;
    rec.total = Number(rec.total) || 0;
    rec.passed = rec.passed ? "1" : "";
    rec.createdAt = rec.createdAt || new Date().toISOString();
    rec.date = rec.date || new Date().toISOString().slice(0,10);
    rec.ts = Number(rec.ts) || Date.now();
    var empRow = getEmpById_(rec.empId);
    if (empRow) {
      rec.name = rec.name || empRow.hoTen || "";
      rec.branch = rec.branch || empRow.chiNhanh || "";
      rec.pos = rec.pos || empRow.viTri || "";
    }
    // answersJson optional
    if (rec.answersJson && typeof rec.answersJson !== "string") {
      rec.answersJson = JSON.stringify(rec.answersJson);
    }

    var existingRow = rowIndexById_(SHEET_KIEMTRA, rec.id);
    if (existingRow > 0) updateRow_(SHEET_KIEMTRA, existingRow, rec);
    else appendRow_(SHEET_KIEMTRA, rec);

    audit_(actorRole, actorRole === "staff" ? rec.empId : "",
      existingRow > 0 ? "updateKiemTra" : "createKiemTra",
      SHEET_KIEMTRA, rec.id, {empId: rec.empId, score: rec.score, total: rec.total});
    return jsonOk_({record: rec});
  } finally {
    lock.releaseLock();
  }
}

function deleteKiemTra_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var id = body.id;
    if (!id) return jsonErr_("Thiếu id");
    var rowNum = rowIndexById_(SHEET_KIEMTRA, id);
    if (rowNum > 0) deleteRow_(SHEET_KIEMTRA, rowNum);
    audit_("manager", "", "deleteKiemTra", SHEET_KIEMTRA, id, {});
    return jsonOk_({deleted: id});
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================
 * ACTIONS — manager: monthly actual salary (LuongThang)
 * empId + month is unique. Saving the same pair updates in place.
 * ============================================================ */
function saveLuongThang_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var rec = body.record || {};
    if (!rec.empId) return jsonErr_("Thiếu empId");
    var month = String(rec.month || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return jsonErr_("Tháng không hợp lệ. Định dạng đúng: YYYY-MM và tháng từ 01 đến 12");
    }
    rec.month = month;
    if (rec.luongThucTe == null || rec.luongThucTe === "") {
      return jsonErr_("Thiếu lương thực tế");
    }
    var amount = Number(rec.luongThucTe);
    if (isNaN(amount) || amount < 0) {
      return jsonErr_("Lương thực tế phải là số không âm");
    }
    var empRow = getEmpById_(rec.empId);
    if (!empRow) return jsonErr_("Không tìm thấy nhân viên");

    // Look up by explicit id first, then by empId+month uniqueness.
    var existingRow = -1;
    var existingRec = null;
    if (rec.id) existingRow = rowIndexById_(SHEET_LUONGTHANG, rec.id);
    if (existingRow < 0) {
      var all = readSheet_(SHEET_LUONGTHANG);
      for (var i = 0; i < all.length; i++) {
        if (String(all[i].empId) === String(rec.empId) &&
            String(all[i].month) === rec.month) {
          existingRec = all[i];
          rec.id = existingRec.id;
          existingRow = rowIndexById_(SHEET_LUONGTHANG, existingRec.id);
          break;
        }
      }
    }

    var nowIso = new Date().toISOString();
    var isUpdate = existingRow > 0;
    if (!rec.id) rec.id = uid_();
    rec.luongThucTe = amount;
    rec.ghiChu = rec.ghiChu || "";
    rec.createdAt = (existingRec && existingRec.createdAt) || rec.createdAt || nowIso;
    rec.updatedAt = nowIso;
    rec.createdBy = "manager";

    if (isUpdate) updateRow_(SHEET_LUONGTHANG, existingRow, rec);
    else appendRow_(SHEET_LUONGTHANG, rec);

    audit_("manager", "", isUpdate ? "updateLuongThang" : "createLuongThang",
      SHEET_LUONGTHANG, rec.id, {empId: rec.empId, month: rec.month, luongThucTe: amount});
    return jsonOk_({record: rec, isUpdate: isUpdate});
  } finally {
    lock.releaseLock();
  }
}

function deleteLuongThang_(body) {
  requireManager_(body.auth);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var id = body.id;
    if (!id) return jsonErr_("Thiếu id");
    var rowNum = rowIndexById_(SHEET_LUONGTHANG, id);
    if (rowNum > 0) deleteRow_(SHEET_LUONGTHANG, rowNum);
    audit_("manager", "", "deleteLuongThang", SHEET_LUONGTHANG, id, {});
    return jsonOk_({deleted: id});
  } finally {
    lock.releaseLock();
  }
}


/* ============================================================
 * AUDIT LOG + OBSERVABILITY
 * ============================================================ */
var _auditEnsured = false;
function ensureAuditColumns_() {
  if (_auditEnsured) return;
  try {
    ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_AUDIT, COLS_AUDIT);
    _auditEnsured = true;
  } catch (e) { /* logging must never break a request */ }
}

function sheetExists_(name) {
  try { return !!sh_(name); } catch (e) { return false; }
}

/* ----- Redaction ----- */
var REDACT_KEY_RE = /(auth|managercode|macanhan|pin|pass|password|admin_pass|admin_user|api_?url|token|authorization|bearer|cookie)/i;
var PIN_KEY_RE    = /(pin|code|auth|macanhan|managercode)/i;
var SCRIPT_URL_RE = /https?:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]+(\/exec|\/dev)?/g;

function sanitizeString_(s, keyHint) {
  var out = String(s);
  out = out.replace(SCRIPT_URL_RE, "[script-url]");
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]");
  if (keyHint && PIN_KEY_RE.test(keyHint) && /^\s*\d{4}\s*$/.test(out)) return "[redacted]";
  out = out.replace(/[A-Za-z0-9_\-]{32,}/g, "[token]");  // long token-like strings
  if (out.length > 3000) out = out.slice(0, 3000) + "…[truncated]";
  return out;
}

/* Recursively redact secret-looking keys/values. Never throws. */
function sanitizeForLog_(value, keyHint, depth) {
  depth = depth || 0;
  if (depth > 6) return "[depth]";
  if (value === null || value === undefined) return value;
  var t = typeof value;
  if (t === "string") return sanitizeString_(value, keyHint);
  if (t === "number" || t === "boolean") {
    if (t === "number" && keyHint && PIN_KEY_RE.test(keyHint) && /^\d{4}$/.test(String(value))) return "[redacted]";
    return value;
  }
  if (Object.prototype.toString.call(value) === "[object Array]") {
    return value.slice(0, 50).map(function(v) { return sanitizeForLog_(v, keyHint, depth + 1); });
  }
  if (t === "object") {
    var out = {};
    for (var k in value) {
      if (!value.hasOwnProperty(k)) continue;
      if (REDACT_KEY_RE.test(k)) { out[k] = "[redacted]"; continue; }
      out[k] = sanitizeForLog_(value[k], k, depth + 1);
    }
    return out;
  }
  return String(value);
}

function sanitizeMessage_(msg) { return sanitizeString_(msg || ""); }

/* Central structured logger. Never throws. */
function logEvent_(ev) {
  try {
    ev = ev || {};
    ensureAuditColumns_();
    var detailsJson = "";
    if (ev.details !== null && ev.details !== undefined) {
      try { detailsJson = JSON.stringify(sanitizeForLog_(ev.details)); }
      catch (e) { detailsJson = ""; }
      if (detailsJson.length > 3000) detailsJson = detailsJson.slice(0, 3000) + "…";
    }
    appendRow_(SHEET_AUDIT, {
      id: uid_(),
      ts: new Date().toISOString(),
      requestId: ev.requestId || "",
      level: ev.level || "info",
      status: ev.status || "",
      source: ev.source || "backend",
      actorRole: ev.actorRole || "",
      actorId: ev.actorId || "",
      action: ev.action || "",
      targetSheet: ev.targetSheet || "",
      targetId: ev.targetId || "",
      message: sanitizeMessage_(ev.message || ""),
      detailsJson: detailsJson,
      durationMs: (ev.durationMs !== null && ev.durationMs !== undefined) ? ev.durationMs : "",
      build: ev.build || getAppBuild_(),
      userAgent: sanitizeMessage_(ev.userAgent || "")
    });
  } catch (e) {
    // Logging failures must never break the main request.
  }
}

/* Backward-compatible audit_(): all existing call sites stay unchanged but
 * now route through logEvent_ and carry the current requestId/duration. */
function audit_(actorRole, actorId, action, targetSheet, targetId, details) {
  if (CTX) CTX.audited = true;
  logEvent_({
    level: "info", status: "success", source: "backend",
    actorRole: actorRole || "", actorId: actorId || "", action: action || "",
    targetSheet: targetSheet || "", targetId: targetId || "",
    details: details || {},
    requestId: ctxReq_(), durationMs: ctxDur_(), build: getAppBuild_()
  });
}

/* Frontend telemetry sink — no manager auth required, sanitized only. */
function clientLog_(body) {
  var p = body || {};
  var event = String(p.event || "event").slice(0, 80);
  var lvl = String(p.level || "info").toLowerCase();
  if (["info", "warn", "error"].indexOf(lvl) < 0) lvl = "info";
  var details = {
    event: event,
    clientAction: String(p.action || "").slice(0, 80),
    urlPath: String(p.urlPath || "").slice(0, 200),
    payload: p.details
  };
  logEvent_({
    level: lvl, status: "client", source: "frontend",
    actorRole: "client", actorId: "",
    action: "clientLog:" + event,
    requestId: p.requestId ? String(p.requestId).slice(0, 64) : ctxReq_(),
    message: String(p.message || ""),
    userAgent: String(p.userAgent || ""),
    details: details,
    durationMs: ctxDur_(),
    build: String(p.clientBuild || "").slice(0, 64) || getAppBuild_()
  });
  return jsonOk_({ logged: true });
}

/* Manager-only audit retrieval for remote troubleshooting. */
function getAuditLog_(body) {
  requireManager_(body.auth);
  ensureAuditColumns_();
  var limit = Number(body.limit) || 100;
  if (limit > 500) limit = 500;
  if (limit < 1) limit = 1;
  var fLevel  = body.level     ? String(body.level)     : "";
  var fStatus = body.status    ? String(body.status)    : "";
  var fAction = body.action    ? String(body.action)    : "";
  var fReq    = body.requestId ? String(body.requestId) : "";
  var fSince  = body.since ? new Date(body.since).getTime() : null;

  var rows = readSheet_(SHEET_AUDIT).filter(function(r) {
    if (fLevel  && String(r.level)  !== fLevel)  return false;
    if (fStatus && String(r.status) !== fStatus) return false;
    if (fAction && String(r.action).indexOf(fAction) < 0) return false;
    if (fReq    && String(r.requestId) !== fReq) return false;
    if (fSince !== null && !isNaN(fSince)) {
      var t = new Date(r.ts).getTime();
      if (isNaN(t) || t < fSince) return false;
    }
    return true;
  });
  rows.reverse(); // newest first (AuditLog is appended chronologically)
  var out = rows.slice(0, limit).map(function(r) {
    var dj = r.detailsJson;
    if (dj) { try { dj = JSON.stringify(sanitizeForLog_(JSON.parse(dj))); } catch (e) {} }
    return {
      id: r.id, ts: r.ts, requestId: r.requestId, level: r.level, status: r.status,
      source: r.source, actorRole: r.actorRole, actorId: r.actorId, action: r.action,
      targetSheet: r.targetSheet, targetId: r.targetId,
      message: sanitizeMessage_(String(r.message || "")),
      detailsJson: dj, durationMs: r.durationMs, build: r.build
    };
  });
  return jsonOk_({ logs: out, count: out.length });
}


/* ============================================================
 * UTILITIES
 * ============================================================ */
function uid_() {
  return Utilities.getUuid().replace(/-/g,"").slice(0,18);
}

function generateUniquePin_() {
  var rows = readSheet_(SHEET_NHANVIEN);
  var taken = {};
  rows.forEach(function(r){ if (r.maCaNhan) taken[String(r.maCaNhan)] = true; });
  // 9000 mã có thể; nếu hết thì lỗi
  for (var attempt = 0; attempt < 200; attempt++) {
    var pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!taken[pin]) return pin;
  }
  throw new Error("Không thể sinh mã cá nhân mới — quá nhiều mã đã dùng");
}

function injectCtx_(obj) {
  if (!CTX) return;
  if (obj.requestId    == null) obj.requestId    = CTX.requestId;
  if (obj.backendBuild == null) obj.backendBuild = CTX.build;
  if (obj.timestamp    == null) obj.timestamp    = new Date().toISOString();
  if (obj.durationMs   == null) obj.durationMs   = new Date().getTime() - CTX.started;
}
function jsonOk_(extra) {
  var obj = {ok: true};
  if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) obj[k] = extra[k];
  injectCtx_(obj);
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr_(msg) {
  if (CTX) { CTX.errored = true; CTX.errorMessage = String(msg || ""); }
  var obj = {ok: false, error: msg || "Lỗi không xác định"};
  injectCtx_(obj);
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


function getAdminUser_(){ return PropertiesService.getScriptProperties().getProperty("ADMIN_USER") || ""; }
function getAdminPass_(){ return PropertiesService.getScriptProperties().getProperty("ADMIN_PASS") || ""; }
function adminLogin_(auth,user,pass){
  requireManager_(auth);
  if(!getAdminUser_()||!getAdminPass_()){
    // Do NOT log the returned manager code or admin credentials.
    logEvent_({level:"warn",status:"validation_error",source:"backend",actorRole:"manager",
      action:"adminLogin",requestId:ctxReq_(),durationMs:ctxDur_(),
      message:"ADMIN_USER/ADMIN_PASS chưa cấu hình"});
    if(CTX) CTX.audited = true;
    return jsonErr_("Chưa cấu hình ADMIN_USER/ADMIN_PASS trong Script Properties");
  }
  if(String(user)!==String(getAdminUser_())||String(pass)!==String(getAdminPass_())){
    logEvent_({level:"warn",status:"auth_failure",source:"backend",actorRole:"manager",
      action:"adminLogin",requestId:ctxReq_(),durationMs:ctxDur_(),
      message:"Sai tài khoản admin", details:{result:"failure"}});
    if(CTX) CTX.audited = true;
    return jsonErr_("Sai tài khoản admin");
  }
  audit_("manager","","adminLogin","","",{result:"success"});
  return jsonOk_({ok:true});
}
function adminGetCodes_(auth){
  requireManager_(auth);
  var rows=readSheet_(SHEET_NHANVIEN).map(function(r){ return {id:r.id,hoTen:r.hoTen,maNV:r.maNV,maCaNhan:r.maCaNhan}; });
  // Audit the access, but never log the returned manager code or staff PINs.
  audit_("manager","","adminGetCodes",SHEET_NHANVIEN,"",{count:rows.length});
  return jsonOk_({rows:rows, managerCode:getManagerCode_(), recoveryEmail:getRecoveryEmail_()});
}
function adminSaveCodes_(auth,managerCode,updates,recoveryEmail){
  requireManager_(auth);
  if(!/^[A-Za-z0-9]{4,32}$/.test(String(managerCode||""))) return jsonErr_("Mã quản lý phải gồm 4–32 chữ cái hoặc chữ số");
  var prevCode=getManagerCode_();
  PropertiesService.getScriptProperties().setProperty("MANAGER_CODE", String(managerCode));
  if(recoveryEmail!==undefined){
    var em=String(recoveryEmail||"").trim();
    if(em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return jsonErr_("Email khôi phục không hợp lệ");
    PropertiesService.getScriptProperties().setProperty("RECOVERY_EMAIL", em);
  }
  updates=(updates||[]);
  updates.forEach(function(u){
    if(!/^\d{4}$/.test(String(u.maCaNhan||""))) throw new Error("Mã cá nhân phải gồm 4 chữ số");
    var row=rowIndexById_(SHEET_NHANVIEN, u.id); if(row<2) return;
    var sh=sh_(SHEET_NHANVIEN);
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    var pinCol=headers.indexOf("maCaNhan")+1;
    if(pinCol>0) sh.getRange(row,pinCol).setValue(String(u.maCaNhan));
  });
  // Email the new manager code to the recovery address when it actually changed.
  if(String(managerCode)!==String(prevCode)){ try{ sendManagerCodeEmail_("update"); }catch(e){} }
  // Record the change count only — never the new manager code or PIN values.
  audit_("manager","","adminSaveCodes",SHEET_NHANVIEN,"",{updated:updates.length});
  return jsonOk_({ok:true});
}
