/* JYS HR — data layer (catalog, sample employees, violations, quiz, helpers) */

const SECTIONS = {
  I:  "Xử lý vào kỳ trả lương",
  II: "Xử lý trực tiếp tại thời điểm vi phạm",
  III:"Quản lý",
  IV: "Lễ tân và chăm sóc khách hàng",
  V:  "Kế toán và thủ quỹ",
  VI: "Giáo viên và trợ giảng",
};

const CATALOG = [
  {code:"I.1",sec:"I",type:"fixed",amount:10000,desc:"Đi muộn hoặc về sớm trong vòng 5 phút"},
  {code:"I.2",sec:"I",type:"per",amount:20000,desc:"Đi muộn hoặc về sớm từ 5 phút trở đi (mỗi mốc 5 phút)"},
  {code:"I.3",sec:"I",type:"manual",amount:0,desc:"Đi muộn hoặc về sớm từ lần thứ 3 trong tháng",consq:"Trừ 50% lương tháng — nhập số tiền tương ứng"},
  {code:"I.4",sec:"I",type:"none",amount:0,desc:"Quên check in/out, không xác nhận với P.HCNS trong 24 giờ",consq:"Không xác nhận 0,25 ngày công"},
  {code:"I.5",sec:"I",type:"fixed",amount:5000,desc:"Quên check in/out, có xác nhận với P.HCNS trong 24 giờ"},
  {code:"I.6",sec:"I",type:"fixed",amount:10000,desc:"Không gửi lịch đăng ký làm việc đúng hạn"},
  {code:"I.7",sec:"I",type:"fixed",amount:10000,desc:"Không bổ sung đơn xin nghỉ trong 24 giờ"},
  {code:"I.8",sec:"I",type:"fixed",amount:25000,desc:"Không hoàn thành đúng deadline đặt ra"},
  {code:"I.9",sec:"I",type:"fixed",amount:30000,desc:"Không cập nhật sự cố lớp học trên hệ thống trong ca"},
  {code:"I.10",sec:"I",type:"manual",amount:0,desc:"Các vi phạm khác (tùy mức độ nghiêm trọng)"},

  {code:"II.1",sec:"II",type:"none",amount:0,desc:"Ăn uống trong giờ làm việc cao điểm",consq:"Dọn văn phòng"},
  {code:"II.2",sec:"II",type:"fixed",amount:20000,desc:"Không tắt điện hoặc đóng cửa sổ khi hết giờ làm"},
  {code:"II.3",sec:"II",type:"fixed",amount:50000,desc:"Không tắt điều hòa khi hết giờ làm"},
  {code:"II.4",sec:"II",type:"fixed",amount:100000,desc:"Che khuất hoặc tắt camera giám sát không đúng thẩm quyền"},
  {code:"II.5",sec:"II",type:"fixed",amount:50000,desc:"Không tuân thủ các mốc thời gian quy định"},
  {code:"II.6",sec:"II",type:"per",amount:20000,desc:"Tham gia họp muộn quá 5 phút (mỗi mốc 5 phút)"},
  {code:"II.7",sec:"II",type:"fixed",amount:100000,desc:"Vắng họp không có lý do"},
  {code:"II.8",sec:"II",type:"fixed",amount:100000,desc:"Hút thuốc lá trong văn phòng"},
  {code:"II.9",sec:"II",type:"fixed",amount:20000,desc:"Sai sót văn bản (chính tả, số, nội dung) — duyệt nội bộ"},
  {code:"II.10",sec:"II",type:"fixed",amount:50000,desc:"Sai sót văn bản giao dịch chính thức với đối tác/khách hàng"},
  {code:"II.11",sec:"II",type:"fixed",amount:100000,desc:"Sai sót văn bản dẫn đến khách hàng phản hồi/khiếu nại"},
  {code:"II.12",sec:"II",type:"fixed",amount:20000,desc:"Không giữ gìn vệ sinh văn phòng và bàn làm việc",consq:"Kèm dọn WC"},
  {code:"II.13",sec:"II",type:"none",amount:0,desc:"Tranh cãi, không phối hợp, đùn đẩy trách nhiệm",consq:"Sa thải"},
  {code:"II.14",sec:"II",type:"fixed",amount:50000,desc:"Không phản hồi email/tin nhắn/chỉ thị của quản lý"},
  {code:"II.15",sec:"II",type:"fixed",amount:20000,desc:"Không mặc đồng phục hoặc đeo thẻ nhân viên"},
  {code:"II.16",sec:"II",type:"fixed",amount:50000,desc:"Trao đổi công việc quan trọng qua kênh cá nhân"},
  {code:"II.17",sec:"II",type:"manual",amount:0,desc:"Các vi phạm khác (tùy mức độ nghiêm trọng)"},

  {code:"III.1",sec:"III",type:"fixed",amount:50000,desc:"Không phối hợp xử lý công việc đúng thời gian quy định"},
  {code:"III.2",sec:"III",type:"fixed",amount:50000,desc:"Bao che sai phạm các bộ phận liên quan"},
  {code:"III.3",sec:"III",type:"fixed",amount:100000,desc:"Lợi dụng quyền hạn gây khó dễ cho các bộ phận"},

  {code:"IV.1",sec:"IV",type:"fixed",amount:50000,desc:"Không vệ sinh quầy lễ tân gọn gàng"},
  {code:"IV.2",sec:"IV",type:"fixed",amount:10000,desc:"Không in hóa đơn học phí"},
  {code:"IV.3",sec:"IV",type:"fixed",amount:20000,desc:"Không niềm nở chào đón học sinh"},
  {code:"IV.4",sec:"IV",type:"fixed",amount:1000000,desc:"Chuyển thông tin khách hàng ra ngoài công ty",consq:"Có thể kèm sa thải"},
  {code:"IV.5",sec:"IV",type:"fixed",amount:20000,desc:"Không nắm được lịch học các lớp"},
  {code:"IV.6",sec:"IV",type:"fixed",amount:20000,desc:"Không quản lý được danh sách và số lượng học sinh"},
  {code:"IV.7",sec:"IV",type:"fixed",amount:20000,desc:"Không quản lý tốt thẻ học viên, voucher"},
  {code:"IV.8",sec:"IV",type:"fixed",amount:50000,desc:"Không kiểm tra thiết bị điện nước phòng học sau ca học"},
  {code:"IV.9",sec:"IV",type:"fixed",amount:20000,desc:"Không đeo thẻ hoặc mặc đồng phục"},

  {code:"V.1",sec:"V",type:"fixed",amount:50000,desc:"Không tuân thủ mốc thời gian trong bảng mô tả công việc"},
  {code:"V.2",sec:"V",type:"fixed",amount:50000,desc:"Không nộp báo cáo đúng thời gian quy định"},
  {code:"V.3",sec:"V",type:"fixed",amount:1000000,desc:"Đánh mất giấy tờ chuyển giao hoặc không sắp xếp giấy tờ"},
  {code:"V.4",sec:"V",type:"fixed",amount:500000,desc:"Không kiểm tra kỹ đề nghị mua sắm, quyết toán, thu chi"},
  {code:"V.5",sec:"V",type:"fixed",amount:200000,desc:"Sau 12 giờ không nhập liệu các phát sinh thu chi"},
  {code:"V.6",sec:"V",type:"fixed",amount:500000,desc:"Không rà soát các khoản phải thu của khách hàng"},
  {code:"V.7",sec:"V",type:"fixed",amount:100000,desc:"Không xử lý nhanh đề nghị mua sắm, thanh toán, chuyển khoản"},
  {code:"V.8",sec:"V",type:"fixed",amount:10000000,desc:"Điều chế giấy tờ số liệu, lạm dụng chức vụ quyền hạn",consq:"Có thể kèm sa thải"},

  {code:"VI.1",sec:"VI",type:"fixed",amount:50000,desc:"Không cập nhật tiến độ học viên trên hệ thống đúng định kỳ"},
  {code:"VI.2",sec:"VI",type:"fixed",amount:50000,desc:"Không gửi feedback cho phụ huynh theo SOP"},
  {code:"VI.3",sec:"VI",type:"fixed",amount:100000,desc:"Vắng đào tạo định kỳ không có lý do"},
  {code:"VI.4",sec:"VI",type:"fixed",amount:100000,desc:"Không tuân thủ giáo trình và kế hoạch giảng dạy đã duyệt"},
  {code:"VI.5",sec:"VI",type:"fixed",amount:5000000,desc:"Sử dụng tài liệu giảng dạy của JYS sai mục đích",consq:"Có thể kèm sa thải"},
];
const CAT_MAP = Object.fromEntries(CATALOG.map(c => [c.code, c]));

const RANKS = [
  {ten:"Bậc 1", min:0,        max:8000000,  desc:"Lương tháng dưới 8 triệu"},
  {ten:"Bậc 2", min:8000000,  max:12000000, desc:"Lương tháng từ 8 đến dưới 12 triệu"},
  {ten:"Bậc 3", min:12000000, max:18000000, desc:"Lương tháng từ 12 đến dưới 18 triệu"},
  {ten:"Bậc 4", min:18000000, max:Infinity, desc:"Lương tháng từ 18 triệu trở lên"},
];

const BRANCHES = ["Đô Lương", "Vinh", "Văn Hiến"];

const POSITIONS = [
  "Giáo viên IELTS", "Giáo viên Tiếng Anh trẻ em", "Trợ giảng",
  "Lễ tân", "Tư vấn tuyển sinh", "Kế toán", "Thủ quỹ",
  "Quản lý chi nhánh", "Trưởng phòng đào tạo", "Marketing"
];

const CONTRACT_TYPES = ["Thử việc", "Hợp đồng 1 năm", "Hợp đồng 2 năm", "Hợp đồng không xác định thời hạn"];

/* ---------- sample employees ---------- */
const EMPLOYEES_SEED = [
  { id:"e01", maNV:"JYS-001", hoTen:"Nguyễn Thị Phương Anh", maCaNhan:"2841", chiNhanh:"Vinh",       viTri:"Trưởng phòng đào tạo",       ngaySinh:"1989-03-12", soDienThoai:"0912 345 678", email:"phuonganh@jysenglish.com", ngayVaoLam:"2020-06-15", loaiHopDong:"Hợp đồng không xác định thời hạn", hopDongTu:"2022-06-15", hopDongDen:"",            luongThang:22000000, quyenLoiKhac:"Bảo hiểm full, phụ cấp ăn trưa 1tr/tháng, thưởng quý theo KPI", ghiChu:"Thành viên ban tuyển dụng" },
  { id:"e02", maNV:"JYS-002", hoTen:"Lê Hoàng Minh",         maCaNhan:"7193", chiNhanh:"Đô Lương",   viTri:"Quản lý chi nhánh",          ngaySinh:"1991-07-22", soDienThoai:"0938 221 110", email:"minh.le@jysenglish.com",  ngayVaoLam:"2021-09-01", loaiHopDong:"Hợp đồng 2 năm",                  hopDongTu:"2024-09-01", hopDongDen:"2026-08-31",  luongThang:18500000, quyenLoiKhac:"Bảo hiểm full, phụ cấp xăng 500k", ghiChu:"" },
  { id:"e03", maNV:"JYS-003", hoTen:"Trần Bảo Châu",         maCaNhan:"5026", chiNhanh:"Vinh",       viTri:"Giáo viên IELTS",            ngaySinh:"1994-11-08", soDienThoai:"0987 654 321", email:"bchau@jysenglish.com",    ngayVaoLam:"2022-02-10", loaiHopDong:"Hợp đồng 2 năm",                  hopDongTu:"2024-02-10", hopDongDen:"2026-02-09",  luongThang:15000000, quyenLoiKhac:"Bảo hiểm cơ bản, thưởng theo lớp", ghiChu:"IELTS 8.0, đang học thạc sĩ" },
  { id:"e04", maNV:"JYS-004", hoTen:"Phạm Quốc Việt",        maCaNhan:"4471", chiNhanh:"Văn Hiến",   viTri:"Giáo viên IELTS",            ngaySinh:"1993-05-30", soDienThoai:"0905 778 442", email:"viet.pham@jysenglish.com",ngayVaoLam:"2022-08-20", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-08-20", hopDongDen:"2026-08-19",  luongThang:14000000, quyenLoiKhac:"Bảo hiểm cơ bản", ghiChu:"" },
  { id:"e05", maNV:"JYS-005", hoTen:"Đặng Khánh Linh",       maCaNhan:"9034", chiNhanh:"Vinh",       viTri:"Lễ tân",                     ngaySinh:"1998-09-14", soDienThoai:"0915 002 119", email:"linh.dang@jysenglish.com",ngayVaoLam:"2023-04-03", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-04-03", hopDongDen:"2026-04-02",  luongThang:8500000,  quyenLoiKhac:"Phụ cấp ăn trưa", ghiChu:"" },
  { id:"e06", maNV:"JYS-006", hoTen:"Hoàng Đình Tuấn",       maCaNhan:"3318", chiNhanh:"Đô Lương",   viTri:"Giáo viên Tiếng Anh trẻ em", ngaySinh:"1995-01-25", soDienThoai:"0902 334 556", email:"tuan.hd@jysenglish.com",  ngayVaoLam:"2023-09-15", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-09-15", hopDongDen:"2026-06-12",  luongThang:11500000, quyenLoiKhac:"Bảo hiểm cơ bản", ghiChu:"Hợp đồng sắp hết hạn — cần gia hạn" },
  { id:"e07", maNV:"JYS-007", hoTen:"Vũ Thu Hà",             maCaNhan:"6587", chiNhanh:"Văn Hiến",   viTri:"Tư vấn tuyển sinh",          ngaySinh:"1996-12-03", soDienThoai:"0978 411 002", email:"ha.vu@jysenglish.com",    ngayVaoLam:"2024-01-08", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-01-08", hopDongDen:"2026-01-07",  luongThang:9800000,  quyenLoiKhac:"Hoa hồng theo doanh số", ghiChu:"" },
  { id:"e08", maNV:"JYS-008", hoTen:"Bùi Thanh Tùng",        maCaNhan:"1207", chiNhanh:"Đô Lương",   viTri:"Trợ giảng",                  ngaySinh:"2001-04-18", soDienThoai:"0967 778 990", email:"tung.bui@jysenglish.com", ngayVaoLam:"2024-08-01", loaiHopDong:"Thử việc",                        hopDongTu:"2025-08-01", hopDongDen:"2026-01-31",  luongThang:6500000,  quyenLoiKhac:"", ghiChu:"Sinh viên năm cuối ĐH Vinh, sẽ ký 1 năm khi tốt nghiệp" },
  { id:"e09", maNV:"JYS-009", hoTen:"Ngô Quỳnh Mai",         maCaNhan:"8462", chiNhanh:"Vinh",       viTri:"Kế toán",                    ngaySinh:"1990-08-07", soDienThoai:"0918 553 220", email:"mai.ngo@jysenglish.com",  ngayVaoLam:"2020-11-12", loaiHopDong:"Hợp đồng không xác định thời hạn", hopDongTu:"2023-11-12", hopDongDen:"",            luongThang:16500000, quyenLoiKhac:"Bảo hiểm full, thưởng cuối năm", ghiChu:"" },
  { id:"e10", maNV:"JYS-010", hoTen:"Trịnh Văn Hoàng",       maCaNhan:"4905", chiNhanh:"Văn Hiến",   viTri:"Marketing",                  ngaySinh:"1997-06-20", soDienThoai:"0934 887 661", email:"hoang.tv@jysenglish.com", ngayVaoLam:"2023-06-05", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-06-05", hopDongDen:"2026-06-04",  luongThang:13200000, quyenLoiKhac:"Bảo hiểm cơ bản", ghiChu:"" },
  { id:"e11", maNV:"JYS-011", hoTen:"Lương Thị Mỹ Duyên",    maCaNhan:"7780", chiNhanh:"Đô Lương",   viTri:"Lễ tân",                     ngaySinh:"2000-02-28", soDienThoai:"0976 002 558", email:"duyen.lt@jysenglish.com", ngayVaoLam:"2024-05-20", loaiHopDong:"Hợp đồng 1 năm",                  hopDongTu:"2025-05-20", hopDongDen:"2026-05-19",  luongThang:8200000,  quyenLoiKhac:"Phụ cấp ăn trưa", ghiChu:"" },
  { id:"e12", maNV:"JYS-012", hoTen:"Nguyễn Đức Anh",        maCaNhan:"3641", chiNhanh:"Vinh",       viTri:"Giáo viên IELTS",            ngaySinh:"1992-10-11", soDienThoai:"0922 117 339", email:"ducanh.n@jysenglish.com", ngayVaoLam:"2023-02-14", loaiHopDong:"Hợp đồng 2 năm",                  hopDongTu:"2025-02-14", hopDongDen:"2027-02-13",  luongThang:17000000, quyenLoiKhac:"Bảo hiểm full, thưởng theo lớp", ghiChu:"IELTS 8.5" },
];

/* ---------- sample violations (recent months) ---------- */
function isoMonthsAgo(months, day=null) {
  const d = new Date(2026, 4, 15); // May 2026 anchor
  d.setMonth(d.getMonth() - months);
  if (day != null) d.setDate(day);
  return d.toISOString().slice(0,10);
}
const VIOLATIONS_SEED = [
  // current month (May 2026)
  { id:"v01", empId:"e08", code:"I.1",  date:isoMonthsAgo(0, 3),  qty:1, amount:10000,  note:"Đi muộn 4 phút"},
  { id:"v02", empId:"e08", code:"I.2",  date:isoMonthsAgo(0, 7),  qty:2, amount:40000,  note:"Đi muộn 12 phút (2 mốc)"},
  { id:"v03", empId:"e05", code:"II.15",date:isoMonthsAgo(0, 6),  qty:1, amount:20000,  note:"Quên thẻ nhân viên"},
  { id:"v04", empId:"e04", code:"I.8",  date:isoMonthsAgo(0, 9),  qty:1, amount:25000,  note:"Chậm nộp giáo án tuần"},
  { id:"v05", empId:"e06", code:"VI.1", date:isoMonthsAgo(0, 11), qty:1, amount:50000,  note:"Không cập nhật tiến độ lớp K3-T7"},
  { id:"v06", empId:"e07", code:"II.14",date:isoMonthsAgo(0, 12), qty:1, amount:50000,  note:"Không phản hồi email duyệt báo giá"},
  { id:"v07", empId:"e11", code:"IV.3", date:isoMonthsAgo(0, 4),  qty:1, amount:20000,  note:"Không chào học sinh khi vào quầy"},
  { id:"v08", empId:"e04", code:"II.6", date:isoMonthsAgo(0, 8),  qty:1, amount:20000,  note:"Họp giáo viên muộn 6 phút"},
  { id:"v09", empId:"e10", code:"II.9", date:isoMonthsAgo(0, 13), qty:1, amount:20000,  note:"Sai chính tả poster lớp mới"},
  { id:"v10", empId:"e08", code:"II.12",date:isoMonthsAgo(0, 14), qty:1, amount:20000,  note:"Bàn làm việc bừa bộn"},
  // previous month (April)
  { id:"v11", empId:"e04", code:"I.2",  date:isoMonthsAgo(1, 5),  qty:3, amount:60000,  note:"Đi muộn 15 phút"},
  { id:"v12", empId:"e08", code:"I.8",  date:isoMonthsAgo(1, 12), qty:1, amount:25000,  note:"Trễ deadline báo cáo trợ giảng"},
  { id:"v13", empId:"e11", code:"IV.2", date:isoMonthsAgo(1, 18), qty:1, amount:10000,  note:"Quên in hóa đơn học phí"},
  { id:"v14", empId:"e05", code:"I.1",  date:isoMonthsAgo(1, 22), qty:1, amount:10000,  note:"Đi muộn 3 phút"},
  { id:"v15", empId:"e06", code:"VI.2", date:isoMonthsAgo(1, 25), qty:1, amount:50000,  note:"Không gửi feedback phụ huynh tuần"},
  { id:"v16", empId:"e07", code:"II.15",date:isoMonthsAgo(1, 9),  qty:1, amount:20000,  note:"Không mặc đồng phục"},
  // March
  { id:"v17", empId:"e08", code:"I.1",  date:isoMonthsAgo(2, 8),  qty:1, amount:10000,  note:"Đi muộn 2 phút"},
  { id:"v18", empId:"e04", code:"II.6", date:isoMonthsAgo(2, 14), qty:2, amount:40000,  note:"Họp muộn 11 phút"},
  { id:"v19", empId:"e10", code:"II.16",date:isoMonthsAgo(2, 17), qty:1, amount:50000,  note:"Bàn việc qua Zalo cá nhân"},
  { id:"v20", empId:"e11", code:"IV.5", date:isoMonthsAgo(2, 22), qty:1, amount:20000,  note:"Không nắm lịch lớp Pre-IELTS T7"},
];

/* ---------- sample quiz history ---------- */
const QUIZ_SEED = [
  { id:"k01", empId:"e08", name:"Bùi Thanh Tùng",     branch:"Đô Lương", pos:"Trợ giảng",      score:14, total:20, passed:false, date:isoMonthsAgo(0, 2)  },
  { id:"k02", empId:"e08", name:"Bùi Thanh Tùng",     branch:"Đô Lương", pos:"Trợ giảng",      score:17, total:20, passed:true,  date:isoMonthsAgo(0, 10) },
  { id:"k03", empId:"e05", name:"Đặng Khánh Linh",    branch:"Vinh",     pos:"Lễ tân",         score:18, total:20, passed:true,  date:isoMonthsAgo(1, 12) },
  { id:"k04", empId:"e11", name:"Lương Thị Mỹ Duyên", branch:"Đô Lương", pos:"Lễ tân",         score:15, total:20, passed:false, date:isoMonthsAgo(0, 5)  },
  { id:"k05", empId:"e06", name:"Hoàng Đình Tuấn",    branch:"Đô Lương", pos:"Giáo viên",      score:19, total:20, passed:true,  date:isoMonthsAgo(0, 14) },
];

/* ---------- quiz questions ---------- */
const QUIZ_BANK = [
  {q:"Lỗi \"Không hoàn thành đúng deadline đặt ra\" bị phạt bao nhiêu?",
   opts:["10.000đ","20.000đ","25.000đ","50.000đ"],a:2,
   why:"Mục I.8 — phạt 25.000đ mỗi lần không hoàn thành đúng deadline."},
  {q:"Đi muộn hoặc về sớm từ lần thứ 3 trở lên trong tháng bị xử lý thế nào?",
   opts:["Phạt 50.000đ","Trừ 50% lương tháng","Chỉ nhắc nhở","Sa thải"],a:1,
   why:"Mục I.3 — từ lần thứ 3 trở đi trong tháng bị trừ 50% lương tháng."},
  {q:"Theo nguyên tắc Ho-Ren-So, khi gặp việc vượt thẩm quyền hoặc ngoài SOP, nhân sự phải làm gì?",
   opts:["Tự quyết định rồi báo sau","Bỏ qua và chờ hết ca","Tham vấn quản lý trước khi quyết định","Hỏi đồng nghiệp cùng cấp rồi làm"],a:2,
   why:"Sodan (Bàn bạc) — phải tham vấn quản lý trước khi tự quyết định."},
  {q:"Xin nghỉ từ 1 đến 2 ngày phải nộp đơn cho Phòng HCNS trước bao lâu?",
   opts:["Trước 1 ngày","Trước 2 ngày","Trước 5 ngày","Không cần đơn"],a:1,
   why:"Nghỉ 1–2 ngày phải có đơn gửi P.HCNS trước 2 ngày."},
  {q:"Xin nghỉ trên 2 ngày phải có đơn trước ít nhất bao nhiêu ngày?",
   opts:["2 ngày","3 ngày","5 ngày","7 ngày"],a:2,
   why:"Nghỉ trên 2 ngày phải có đơn trước ít nhất 5 ngày."},
  {q:"\"Đúng giờ\" theo nội quy JYS được hiểu là gì?",
   opts:["Có mặt đúng lúc ca bắt đầu","Có mặt trước ca ít nhất 10 phút để chuẩn bị","Có mặt trong 5 phút đầu ca","Có mặt trước 30 phút"],a:1,
   why:"Đúng giờ nghĩa là đến sớm: có mặt và chuẩn bị xong trước ca ít nhất 10 phút."},
  {q:"Lỗi \"Chuyển thông tin khách hàng ra ngoài công ty\" bị phạt bao nhiêu?",
   opts:["100.000đ","500.000đ","1.000.000đ","50.000đ"],a:2,
   why:"Mục IV.4 — phạt 1.000.000đ, có thể kèm sa thải."},
  {q:"Tin nhắn chỉ đạo của quản lý qua Zalo phải được phản hồi trong vòng bao lâu (giờ làm việc)?",
   opts:["30 phút","2 giờ","24 giờ","Cuối ca"],a:0,
   why:"Mục II.14 — không phản hồi tin nhắn của quản lý quá 30 phút sẽ bị ghi nhận vi phạm."},
  {q:"Theo bảng xử lý vi phạm, không phản hồi email của quản lý chậm quá bao lâu thì bị ghi nhận vi phạm?",
   opts:["30 phút","2 giờ","12 giờ","24 giờ"],a:1,
   why:"Mục II.14 — email phải được phản hồi trong vòng 2 giờ."},
  {q:"Hành vi nào dưới đây bị xử lý \"Sa thải\" theo nội quy?",
   opts:["Đi muộn 3 lần trong tháng","Hút thuốc trong văn phòng","Tranh cãi, đùn đẩy trách nhiệm, không phối hợp xử lý công việc","Quên đeo thẻ nhân viên"],a:2,
   why:"Mục II.13 — tranh cãi, không phối hợp, đùn đẩy trách nhiệm bị sa thải."},
  {q:"Hành vi nào với camera giám sát bị phạt 100.000đ?",
   opts:["Nhìn vào camera khi làm việc","Đặt vật dụng che khuất góc camera hoặc tắt camera không đúng thẩm quyền","Lau bụi camera","Báo cáo camera bị hỏng"],a:1,
   why:"Mục II.4 — che khuất hoặc tắt camera không đúng thẩm quyền bị phạt 100.000đ."},
  {q:"Trao đổi công việc quan trọng qua Zalo cá nhân thay vì kênh công ty bị xử lý thế nào?",
   opts:["Không sao cả","Phạt 50.000đ","Phạt 10.000đ","Sa thải ngay"],a:1,
   why:"Mục II.16 — phạt 50.000đ. Công việc quan trọng phải đi qua kênh công ty."},
  {q:"Trong cuộc họp, nhân viên được phép làm điều nào sau đây?",
   opts:["Dùng laptop tự do","Để điện thoại reo chuông","Ghi chép bằng bút và sổ","Ăn uống tại chỗ"],a:2,
   why:"Trong họp: ghi chép bằng bút sổ, tắt hoặc để rung điện thoại, không dùng laptop khi chưa được phép."},
  {q:"Tham gia họp muộn quá 5 phút bị phạt như thế nào?",
   opts:["10.000đ cố định","20.000đ cho mỗi 5 phút muộn","50.000đ cố định","Không phạt"],a:1,
   why:"Mục II.6 — 20.000đ cho mỗi mốc 5 phút muộn."},
  {q:"Nguyên tắc 5S — \"Seiton (Sắp xếp)\" yêu cầu điều gì?",
   opts:["Loại bỏ đồ cũ không cần thiết","Vệ sinh sạch sẽ trước và sau ca","Mọi vật dụng có vị trí cố định, dán nhãn, tìm thấy trong 30 giây","Tự giác tuân thủ không cần nhắc"],a:2,
   why:"Seiton — sắp xếp: mọi vật dụng có vị trí cố định, dán nhãn, tìm thấy trong vòng 30 giây."},
  {q:"Vắng họp không có lý do bị phạt bao nhiêu?",
   opts:["20.000đ","50.000đ","100.000đ","200.000đ"],a:2,
   why:"Mục II.7 — vắng họp không lý do bị phạt 100.000đ."},
  {q:"Giáo viên không cập nhật tiến độ học viên trên hệ thống đúng định kỳ bị phạt bao nhiêu?",
   opts:["10.000đ","20.000đ","50.000đ","100.000đ"],a:2,
   why:"Mục VI.1 — phạt 50.000đ mỗi lần. Cập nhật tối thiểu 1 lần mỗi tuần với mỗi lớp."},
  {q:"Sự cố xảy ra trong lớp học phải được báo cáo khi nào?",
   opts:["Vào cuối ca","Vào cuối ngày","Ngay lập tức trên hệ thống","Vào buổi họp tuần"],a:2,
   why:"Hokoku (Báo cáo) — sự cố lớp học phải báo ngay lập tức trên hệ thống, không đợi cuối ca."},
  {q:"Tiền phạt vi phạm nội quy được sử dụng vào việc gì?",
   opts:["Thưởng cho quản lý","Nộp vào quỹ công đoàn của công ty","Hoàn lại cho nhân viên","Chi phí văn phòng phẩm"],a:1,
   why:"Toàn bộ tiền phạt được nộp vào quỹ công đoàn của công ty."},
  {q:"Nhân viên đi muộn 12 phút (lỗi I.2 — 20.000đ cho mỗi mốc 5 phút). Số tiền phạt là bao nhiêu?",
   opts:["20.000đ","40.000đ","60.000đ","24.000đ"],a:2,
   why:"12 phút = 3 mốc 5 phút → 3 × 20.000đ = 60.000đ."},
];
const QUIZ_TOTAL = QUIZ_BANK.length;
const QUIZ_PASS = 16;

/* ---------- helpers ---------- */
function fmtMoney(n){ return (Number(n)||0).toLocaleString("vi-VN") + " đ"; }
function fmtMoneyShort(n){
  n = Number(n)||0;
  if (n>=1000000) return (n/1000000).toFixed(n%1000000===0?0:1).replace(".0","") + "tr";
  if (n>=1000) return Math.round(n/1000) + "k";
  return String(n);
}
function fmtDate(iso){
  if(!iso) return "—";
  const s = String(iso).slice(0,10);
  const p = s.split("-");
  return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : s;
}
function todayISO(){ return new Date(2026, 4, 15).toISOString().slice(0,10); }  // demo "today"
function monthISO(){ return todayISO().slice(0,7); }

function tinhHang(luong){
  const l = Number(luong)||0;
  let idx = 0;
  for(let i=0;i<RANKS.length;i++){ if(l>=RANKS[i].min) idx=i; }
  return { idx, ten:RANKS[idx].ten, desc:RANKS[idx].desc };
}

function thamNien(ngayVao){
  if(!ngayVao) return null;
  const d = new Date(ngayVao);
  if(isNaN(d)) return null;
  const now = new Date(2026, 4, 15);
  let thang = (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
  if(now.getDate() < d.getDate()) thang--;
  if(thang<0) thang = 0;
  return { thang, nam:Math.floor(thang/12), thangLe:thang%12 };
}
function chuoiThamNien(ngayVao){
  const t = thamNien(ngayVao);
  if(!t) return "—";
  if(t.nam===0) return t.thang+" tháng";
  if(t.thangLe===0) return t.nam+" năm";
  return t.nam+" năm "+t.thangLe+" tháng";
}
function ngayConLai(den){
  if(!den) return null;
  const d = new Date(den);
  if(isNaN(d)) return null;
  return Math.round((d - new Date(2026, 4, 15)) / 86400000);
}
function trangThaiHopDong(emp){
  if (!emp.hopDongDen) return { kind:"ok", label:"Không xác định thời hạn" };
  const days = ngayConLai(emp.hopDongDen);
  if (days < 0) return { kind:"late", label:`Hết hạn ${Math.abs(days)} ngày trước` };
  if (days <= 60) return { kind:"soon", label:`Còn ${days} ngày` };
  return { kind:"ok", label:`Còn ${days} ngày` };
}

function initials(name){
  if(!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  const last = parts[parts.length-1]||"";
  const first = parts.length>1 ? parts[0] : "";
  return (last[0]||"") + (first[0]||"");
}

function csvEscape(s){
  s = String(s==null?"":s);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

window.JYS_DATA = {
  SECTIONS, CATALOG, CAT_MAP, RANKS, BRANCHES, POSITIONS, CONTRACT_TYPES,
  EMPLOYEES_SEED, VIOLATIONS_SEED, QUIZ_SEED, QUIZ_BANK, QUIZ_TOTAL, QUIZ_PASS,
  fmtMoney, fmtMoneyShort, fmtDate, todayISO, monthISO,
  tinhHang, thamNien, chuoiThamNien, ngayConLai, trangThaiHopDong, initials, csvEscape,
};
