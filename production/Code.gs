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
var SHEET_NHANVIEN = "NhanVien";
var SHEET_VIPHAM   = "ViPham";
var SHEET_KIEMTRA  = "KiemTra";
var SHEET_AUDIT    = "AuditLog";

var COLS_NHANVIEN = [
  "id","maNV","hoTen","maCaNhan","chiNhanh","viTri",
  "ngaySinh","soDienThoai","email",
  "ngayVaoLam","loaiHopDong","hopDongTu","hopDongDen",
  "luongThang","quyenLoiKhac","ghiChu",
  "active","createdAt","updatedAt"
];
var COLS_VIPHAM = ["id","empId","date","ts","code","qty","amount","note","createdAt","createdBy"];
var COLS_KIEMTRA = ["id","empId","name","branch","pos","date","ts","score","total","passed","answersJson","createdAt"];
var COLS_AUDIT  = ["id","ts","actorRole","actorId","action","targetSheet","targetId","detailsJson"];

var BRANCHES = ["Đô Lương", "Vinh", "Quảng Sơn"];


/* ============================================================
 * KHỞI TẠO SHEET
 * Tạo các tab nếu chưa có, kèm dòng tiêu đề.
 * ============================================================ */
function khoiTaoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NHANVIEN, COLS_NHANVIEN);
  ensureSheet_(ss, SHEET_VIPHAM,   COLS_VIPHAM);
  ensureSheet_(ss, SHEET_KIEMTRA,  COLS_KIEMTRA);
  ensureSheet_(ss, SHEET_AUDIT,    COLS_AUDIT);

  // MANAGER_CODE phải được đặt thủ công trong Script Properties.
  // KHÔNG đặt giá trị mặc định ở đây — tránh commit mã quản lý vào repo.
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("MANAGER_CODE")) {
    throw new Error("Chưa cấu hình MANAGER_CODE. Vào Project Settings > Script Properties và thêm property MANAGER_CODE trước khi chạy khoiTaoSheet().");
  }
  return "Đã khởi tạo xong các sheet: " + [SHEET_NHANVIEN,SHEET_VIPHAM,SHEET_KIEMTRA,SHEET_AUDIT].join(", ");
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
 * ROUTER
 * ============================================================ */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";
    switch (action) {
      case "ping":         return jsonOk_({pong:true, ts: new Date().getTime()});
      case "":
        return jsonErr_("Chỉ hỗ trợ POST cho các action nghiệp vụ. Vui lòng gọi doPost.");
      default:
        return jsonErr_("GET không được hỗ trợ cho action: " + action + ". Hãy dùng POST.");
    }
  } catch (err) {
    return jsonErr_(String(err && err.message || err));
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (er) { body = {}; }
    }
    return routeAction_(body);
  } catch (err) {
    return jsonErr_(String(err && err.message || err));
  }
}

function routeAction_(body) {
  var action = body.action || "";
  switch (action) {
    case "listNames":      return jsonOk_({names: listNames_()});
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
    nhanvien: readSheet_(SHEET_NHANVIEN).filter(function(r){ return String(r.active||"1") !== "0"; }),
    vipham:   readSheet_(SHEET_VIPHAM),
    kiemtra:  readSheet_(SHEET_KIEMTRA)
  });
}

function getMine_(empId, auth) {
  var emp = getStaffByCredentials_(empId, auth);
  if (!emp) return jsonErr_("Sai mã cá nhân");
  // Đừng để lộ maCaNhan của người khác — nhưng đây là chính mình nên ok
  var profile = emp;
  var vipham  = readSheet_(SHEET_VIPHAM).filter(function(v){ return String(v.empId) === String(empId); });
  var kiemtra = readSheet_(SHEET_KIEMTRA).filter(function(k){ return String(k.empId) === String(empId); });
  return jsonOk_({profile: profile, vipham: vipham, kiemtra: kiemtra});
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
 * AUDIT LOG
 * ============================================================ */
function audit_(actorRole, actorId, action, targetSheet, targetId, details) {
  try {
    appendRow_(SHEET_AUDIT, {
      id: uid_(),
      ts: new Date().toISOString(),
      actorRole: actorRole || "",
      actorId: actorId || "",
      action: action || "",
      targetSheet: targetSheet || "",
      targetId: targetId || "",
      detailsJson: details ? JSON.stringify(details) : ""
    });
  } catch (e) {
    // Không để lỗi audit làm hỏng request chính
  }
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

function jsonOk_(extra) {
  var obj = {ok: true};
  if (extra) for (var k in extra) obj[k] = extra[k];
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr_(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ok:false, error: msg || "Lỗi không xác định"}))
    .setMimeType(ContentService.MimeType.JSON);
}


function getAdminUser_(){ return PropertiesService.getScriptProperties().getProperty("ADMIN_USER") || ""; }
function getAdminPass_(){ return PropertiesService.getScriptProperties().getProperty("ADMIN_PASS") || ""; }
function adminLogin_(auth,user,pass){
  requireManager_(auth);
  if(!getAdminUser_()||!getAdminPass_()) return jsonErr_("Chưa cấu hình ADMIN_USER/ADMIN_PASS trong Script Properties");
  if(String(user)!==String(getAdminUser_())||String(pass)!==String(getAdminPass_())) return jsonErr_("Sai tài khoản admin");
  return jsonOk_({ok:true});
}
function adminGetCodes_(auth){
  requireManager_(auth);
  var rows=readSheet_(SHEET_NHANVIEN).map(function(r){ return {id:r.id,hoTen:r.hoTen,maNV:r.maNV,maCaNhan:r.maCaNhan}; });
  return jsonOk_({rows:rows, managerCode:getManagerCode_()});
}
function adminSaveCodes_(auth,managerCode,updates){
  requireManager_(auth);
  if(!/^\d{4}$/.test(String(managerCode||""))) return jsonErr_("Mã quản lý phải gồm 4 chữ số");
  PropertiesService.getScriptProperties().setProperty("MANAGER_CODE", String(managerCode));
  updates=(updates||[]);
  updates.forEach(function(u){
    if(!/^\d{4}$/.test(String(u.maCaNhan||""))) throw new Error("Mã cá nhân phải gồm 4 chữ số");
    var row=rowIndexById_(SHEET_NHANVIEN, u.id); if(row<2) return;
    var sh=sh_(SHEET_NHANVIEN);
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    var pinCol=headers.indexOf("maCaNhan")+1;
    if(pinCol>0) sh.getRange(row,pinCol).setValue(String(u.maCaNhan));
  });
  return jsonOk_({ok:true});
}
