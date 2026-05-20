/* JYS HR — Manager screens: Dashboard, HR, Violation Log */
const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM } = React;
const DM = window.JYS_DATA;

/* ---------- Dashboard ---------- */
function Dashboard({ employees, violations, onOpenEmp }) {
  const [filterMonth, setFilterMonth] = useStateM(DM.monthISO());
  const [filterBranch, setFilterBranch] = useStateM("all");

  const inScope = useMemoM(()=>{
    return violations.filter(v=>{
      const monthMatch = String(v.date).slice(0,7) === filterMonth;
      if (!monthMatch) return false;
      if (filterBranch !== "all") {
        const emp = employees.find(e=>e.id===v.empId);
        if (!emp || emp.chiNhanh !== filterBranch) return false;
      }
      return true;
    });
  }, [violations, employees, filterMonth, filterBranch]);

  const tongTien = inScope.reduce((s,v)=>s+Number(v.amount||0), 0);
  const soLuot = inScope.length;

  // most fined
  const byEmp = {};
  inScope.forEach(v=>{ byEmp[v.empId] = (byEmp[v.empId]||0)+Number(v.amount||0); });
  let topEmpId=null, topEmpAmount=0;
  Object.entries(byEmp).forEach(([id,amt])=>{ if(amt>topEmpAmount){topEmpId=id;topEmpAmount=amt;} });
  const topEmp = employees.find(e=>e.id===topEmpId);

  // most common section
  const bySec = {};
  inScope.forEach(v=>{
    const sec = DM.CAT_MAP[v.code]?.sec || "?";
    bySec[sec] = (bySec[sec]||0) + 1;
  });
  let topSec=null, topSecCount=0;
  Object.entries(bySec).forEach(([s,c])=>{ if(c>topSecCount){topSec=s;topSecCount=c;} });

  // Contract warnings
  const today = new Date(2026,4,15);
  const warnings = employees
    .map(e=>{
      if (!e.hopDongDen) return null;
      const d = new Date(e.hopDongDen);
      const days = Math.round((d - today)/86400000);
      if (days < 0) return { kind:"danger", emp:e, days, label:"Hết hạn hợp đồng" };
      if (days <= 60) return { kind:"alert", emp:e, days, label:"Sắp hết hạn hợp đồng" };
      return null;
    })
    .filter(Boolean)
    .sort((a,b)=>a.days-b.days);

  // bar chart: fines per employee (top 8)
  const empBars = Object.entries(byEmp)
    .map(([id, amt])=>({ id, emp: employees.find(e=>e.id===id), amount:amt }))
    .filter(x=>x.emp)
    .sort((a,b)=>b.amount-a.amount)
    .slice(0,8);
  const empBarMax = empBars[0]?.amount || 1;

  // bar chart: by section
  const secBars = ["I","II","III","IV","V","VI"].map(s=>({
    sec:s,
    label:`Nhóm ${s}`,
    name:DM.SECTIONS[s],
    count:bySec[s]||0
  })).sort((a,b)=>b.count-a.count);
  const secBarMax = secBars[0]?.count || 1;

  // branch breakdown stacked
  const branchData = DM.BRANCHES.map(br=>{
    const empsBr = employees.filter(e=>e.chiNhanh===br);
    const vBr = inScope.filter(v=>{
      const e = employees.find(e=>e.id===v.empId);
      return e && e.chiNhanh === br;
    });
    return {
      name: br,
      empCount: empsBr.length,
      vCount: vBr.length,
      vAmount: vBr.reduce((s,v)=>s+Number(v.amount||0),0),
    };
  });
  const branchMaxAmt = Math.max(1, ...branchData.map(b=>b.vAmount));

  return (
    <>
      <div className="filter-bar">
        <div className="field sm">
          <label>Tháng</label>
          <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} />
        </div>
        <div className="field sm">
          <label>Chi nhánh</label>
          <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}>
            <option value="all">Tất cả chi nhánh</option>
            {DM.BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{marginLeft:"auto"}} className="subtle">
          Tháng {filterMonth.split("-")[1]}/{filterMonth.split("-")[0]} · {filterBranch==="all"?"Toàn hệ thống":filterBranch}
        </div>
      </div>

      <div className="stats">
        <div className="stat accent">
          <div className="lbl">Tổng tiền phạt</div>
          <div className="val">{DM.fmtMoney(tongTien)}</div>
          <div className="note">Trong kỳ đã chọn</div>
        </div>
        <div className="stat">
          <div className="lbl">Số lượt vi phạm</div>
          <div className="val">{soLuot}</div>
          <div className="note">{employees.length} nhân viên đang theo dõi</div>
        </div>
        <div className="stat">
          <div className="lbl">Phạt nhiều nhất</div>
          <div className="val" style={{fontSize:18}}>{topEmp?topEmp.hoTen:"—"}</div>
          <div className="note">{topEmp?`${DM.fmtMoney(topEmpAmount)} · ${topEmp.chiNhanh}`:"Chưa có vi phạm"}</div>
        </div>
        <div className="stat">
          <div className="lbl">Lỗi phổ biến</div>
          <div className="val" style={{fontSize:18}}>{topSec?`Nhóm ${topSec}`:"—"}</div>
          <div className="note">{topSec?`${DM.SECTIONS[topSec]} · ${topSecCount} lượt`:"Chưa có dữ liệu"}</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <>
          <h3 className="section-title">Cảnh báo</h3>
          <div className="card">
            <div className="card-pad">
              {warnings.map(w=>(
                <div key={w.emp.id} className={"warn-item "+w.kind}>
                  <div className={"warn-icon "+w.kind}>!</div>
                  <div style={{flex:1}}>
                    <div className="wt">{w.label} · {w.emp.hoTen}</div>
                    <div className="wd">
                      {w.emp.viTri} · {w.emp.chiNhanh} · Hợp đồng đến {DM.fmtDate(w.emp.hopDongDen)}
                      {w.days>=0 ? ` (còn ${w.days} ngày)` : ` (đã hết ${Math.abs(w.days)} ngày)`}
                    </div>
                  </div>
                  <button className="btn ghost sm" onClick={()=>onOpenEmp(w.emp.id)}>Xem hồ sơ</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid-2" style={{marginTop:24}}>
        <div className="card">
          <div className="card-pad">
            <div className="card-h">Tiền phạt theo nhân viên</div>
            {empBars.length===0 ? (
              <div className="empty"><div className="big">Chưa có dữ liệu</div><div>Trong kỳ đã chọn</div></div>
            ) : empBars.map(b=>(
              <div key={b.id} className="bar-row">
                <div className="bl" title={b.emp.hoTen}>{b.emp.hoTen}</div>
                <div className="bar-track"><div className="bar-fill" style={{width:`${(b.amount/empBarMax)*100}%`}}></div></div>
                <div className="bar-val">{DM.fmtMoney(b.amount)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-pad">
            <div className="card-h">Phân bổ theo nhóm lỗi</div>
            {secBars.every(s=>s.count===0) ? (
              <div className="empty"><div className="big">Chưa có dữ liệu</div><div>Trong kỳ đã chọn</div></div>
            ) : secBars.map(s=>(
              <div key={s.sec} className="bar-row">
                <div className="bl" title={s.name}>{s.label}</div>
                <div className="bar-track"><div className="bar-fill dark" style={{width:`${(s.count/secBarMax)*100}%`}}></div></div>
                <div className="bar-val">{s.count} lượt</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="section-title">Theo chi nhánh</h3>
      <div className="card">
        <div className="card-pad">
          {branchData.map(b=>(
            <div key={b.name} className="branch-bars">
              <div className="blab">
                {b.name}
                <span className="sm">{b.empCount} nhân sự · {b.vCount} lượt vi phạm</span>
              </div>
              <div className="bar-track" title={`${DM.fmtMoney(b.vAmount)}`}>
                <div className="bar-fill dim" style={{width:`${(b.vAmount/branchMaxAmt)*100}%`}}></div>
              </div>
              <div className="bval">{DM.fmtMoney(b.vAmount)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- HR (employee directory) ---------- */
function HRScreen({ employees, onSave, onDelete, onOpenEmp, showToast }) {
  const blankEmp = {
    id:"", maNV:"", hoTen:"", maCaNhan:"", chiNhanh:DM.BRANCHES[0], viTri:DM.POSITIONS[0],
    ngaySinh:"", soDienThoai:"", email:"", ngayVaoLam:"", loaiHopDong:DM.CONTRACT_TYPES[1],
    hopDongTu:"", hopDongDen:"", luongThang:"", quyenLoiKhac:"", ghiChu:""
  };
  const [form, setForm] = useStateM(blankEmp);
  const [editingId, setEditingId] = useStateM(null);
  const [filterBranch, setFilterBranch] = useStateM("all");
  const [filterQ, setFilterQ] = useStateM("");

  function gen4(){ return String(Math.floor(1000+Math.random()*9000)); }
  function uid(){ return "e" + Date.now().toString(36).slice(-5); }

  function setField(k, v){ setForm(f=>({...f, [k]:v})); }
  function startNew(){ setForm({...blankEmp, maCaNhan:gen4()}); setEditingId(null); }
  function edit(emp){ setForm({...emp}); setEditingId(emp.id); window.scrollTo({top:0, behavior:"smooth"}); }
  function save(){
    if (!form.hoTen.trim()) { showToast("Nhập họ tên", "err"); return; }
    if (!/^\d{4}$/.test(String(form.maCaNhan||""))) { showToast("Mã cá nhân phải gồm 4 chữ số","err"); return; }
    const rec = {...form};
    if (!rec.id) rec.id = uid();
    if (!rec.maNV) rec.maNV = "JYS-" + String(employees.length+1).padStart(3,"0");
    rec.luongThang = Number(rec.luongThang)||0;
    onSave(rec);
    setForm(blankEmp);
    setEditingId(null);
  }
  function regen(){ setField("maCaNhan", gen4()); showToast("Đã tạo mã cá nhân mới"); }

  const hang = useMemoM(()=>DM.tinhHang(form.luongThang), [form.luongThang]);

  const filtered = employees.filter(e=>{
    if (filterBranch!=="all" && e.chiNhanh!==filterBranch) return false;
    if (filterQ) {
      const q = filterQ.toLowerCase();
      if (!String(e.hoTen).toLowerCase().includes(q) &&
          !String(e.maNV).toLowerCase().includes(q) &&
          !String(e.viTri).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="grid-side">
      <div className="card">
        <div className="card-pad">
          <div className="card-h">{editingId ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</div>

          <div className="field">
            <label>Họ và tên</label>
            <input value={form.hoTen} onChange={e=>setField("hoTen", e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div className="row c2">
            <div className="field">
              <label>Mã nhân viên <span className="hint">(tự tạo nếu để trống)</span></label>
              <input value={form.maNV} onChange={e=>setField("maNV", e.target.value)} placeholder="JYS-001" />
            </div>
            <div className="field">
              <label>Chi nhánh</label>
              <select value={form.chiNhanh} onChange={e=>setField("chiNhanh", e.target.value)}>
                {DM.BRANCHES.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="row c2">
            <div className="field">
              <label>Vị trí</label>
              <select value={form.viTri} onChange={e=>setField("viTri", e.target.value)}>
                {DM.POSITIONS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Ngày sinh</label>
              <input type="date" value={form.ngaySinh} onChange={e=>setField("ngaySinh", e.target.value)} />
            </div>
          </div>
          <div className="row c2">
            <div className="field">
              <label>Số điện thoại</label>
              <input value={form.soDienThoai} onChange={e=>setField("soDienThoai", e.target.value)} placeholder="0912 345 678" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e=>setField("email", e.target.value)} placeholder="name@jysenglish.com" />
            </div>
          </div>
          <div className="field">
            <label>Ngày vào làm</label>
            <input type="date" value={form.ngayVaoLam} onChange={e=>setField("ngayVaoLam", e.target.value)} />
          </div>
          <div className="field">
            <label>Loại hợp đồng</label>
            <select value={form.loaiHopDong} onChange={e=>setField("loaiHopDong", e.target.value)}>
              {DM.CONTRACT_TYPES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="row c2">
            <div className="field">
              <label>Hợp đồng từ</label>
              <input type="date" value={form.hopDongTu} onChange={e=>setField("hopDongTu", e.target.value)} />
            </div>
            <div className="field">
              <label>Hợp đồng đến</label>
              <input type="date" value={form.hopDongDen} onChange={e=>setField("hopDongDen", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Lương tháng <span className="hint">(đồng) → {hang.ten}</span></label>
            <input type="number" value={form.luongThang} onChange={e=>setField("luongThang", e.target.value)} placeholder="10000000" />
          </div>
          <div className="field">
            <label>Quyền lợi khác</label>
            <textarea value={form.quyenLoiKhac} onChange={e=>setField("quyenLoiKhac", e.target.value)} placeholder="Bảo hiểm, phụ cấp, thưởng..." />
          </div>
          <div className="field">
            <label>Ghi chú nội bộ</label>
            <textarea value={form.ghiChu} onChange={e=>setField("ghiChu", e.target.value)} />
          </div>
          <div className="field">
            <label>Mã cá nhân (4 số)</label>
            <div style={{display:"flex", gap:8}}>
              <input value={form.maCaNhan} onChange={e=>setField("maCaNhan", e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} placeholder="••••" style={{fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:4, fontSize:18}} />
              <button className="btn ghost sm" onClick={regen}>Tạo mã mới</button>
            </div>
          </div>

          <div className="btn-row" style={{marginTop:8}}>
            <button className="btn" onClick={save}>{editingId?"Lưu thay đổi":"Thêm nhân viên"}</button>
            {editingId && <button className="btn ghost" onClick={()=>{setForm(blankEmp); setEditingId(null);}}>Hủy</button>}
            {!editingId && <button className="btn ghost" onClick={startNew}>Tạo mới + sinh mã</button>}
          </div>
        </div>
      </div>

      <div>
        <div className="filter-bar">
          <div className="field sm">
            <label>Chi nhánh</label>
            <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}>
              <option value="all">Tất cả</option>
              {DM.BRANCHES.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{flex:1, minWidth:200}}>
            <label>Tìm kiếm</label>
            <input type="search" placeholder="Tên, mã NV, vị trí..." value={filterQ} onChange={e=>setFilterQ(e.target.value)} />
          </div>
          <div className="subtle" style={{paddingBottom:10}}>{filtered.length} / {employees.length}</div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Chi nhánh</th>
                <th>Vị trí</th>
                <th>Hạng</th>
                <th>Thâm niên</th>
                <th>Mã CN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e=>{
                const h = DM.tinhHang(e.luongThang);
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="name-cell" onClick={()=>onOpenEmp(e.id)} style={{cursor:"pointer"}}>
                        <DM_Avatar name={e.hoTen}/>
                        <div>
                          <div className="nm">{e.hoTen}</div>
                          <div className="sub">{e.maNV}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="pill br">{e.chiNhanh}</span></td>
                    <td>{e.viTri}</td>
                    <td><span className={`pill rank r${h.idx+1}`}>{h.ten}</span></td>
                    <td>{DM.chuoiThamNien(e.ngayVaoLam)}</td>
                    <td><span className="pill code">{e.maCaNhan}</span></td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="icon-btn" onClick={()=>onOpenEmp(e.id)}>Xem</button>
                      <button className="icon-btn" onClick={()=>edit(e)}>Sửa</button>
                      <button className="icon-btn danger" onClick={()=>onDelete(e.id)}>Xóa</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0 && (
                <tr><td colSpan={7}><div className="empty"><div className="big">Không có nhân viên phù hợp</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DM_Avatar({ name }) {
  return <span className="av">{DM.initials(name)}</span>;
}

/* ---------- Violation Log ---------- */
function ViolationLog({ employees, violations, onSave, onDelete, showToast }) {
  const [filterMonth, setFilterMonth] = useStateM(DM.monthISO());
  const [filterEmp, setFilterEmp] = useStateM("all");

  // form
  const [fEmpId, setFEmpId] = useStateM("");
  const [fCode, setFCode] = useStateM("");
  const [fQty, setFQty] = useStateM(1);
  const [fAmount, setFAmount] = useStateM("");
  const [fDate, setFDate] = useStateM(DM.todayISO());
  const [fNote, setFNote] = useStateM("");
  const [autoAmt, setAutoAmt] = useStateM(true);

  const code = DM.CAT_MAP[fCode];

  useEffectM(()=>{
    if (!code) { setAutoAmt(true); return; }
    if (code.type === "fixed") { setFAmount(String(code.amount)); setAutoAmt(true); }
    else if (code.type === "per") { setFAmount(String(code.amount * Number(fQty||1))); setAutoAmt(true); }
    else { setAutoAmt(false); setFAmount(""); }
  }, [fCode, fQty]);

  function uid(){ return "v" + Date.now().toString(36).slice(-5); }
  function submit(){
    if (!fEmpId) { showToast("Chọn nhân viên","err"); return; }
    if (!fCode)  { showToast("Chọn mã vi phạm","err"); return; }
    onSave({
      id: uid(), empId: fEmpId, code: fCode,
      date: fDate, qty: Number(fQty)||1, amount: Number(fAmount)||0, note: fNote
    });
    setFCode(""); setFQty(1); setFAmount(""); setFNote("");
  }

  const inScope = violations.filter(v=>{
    if (String(v.date).slice(0,7) !== filterMonth) return false;
    if (filterEmp !== "all" && v.empId !== filterEmp) return false;
    return true;
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  function exportCSV(){
    const head = ["Ngày","Nhân viên","Chi nhánh","Mã lỗi","Mô tả","SL","Số tiền","Ghi chú"];
    const lines = [head.map(DM.csvEscape).join(",")];
    inScope.forEach(v=>{
      const e = employees.find(x=>x.id===v.empId);
      const c = DM.CAT_MAP[v.code];
      lines.push([
        v.date, e?.hoTen||"", e?.chiNhanh||"", v.code, c?.desc||"", v.qty||1, v.amount||0, v.note||""
      ].map(DM.csvEscape).join(","));
    });
    const blob = new Blob(["\ufeff"+lines.join("\n")], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vi-pham-${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất CSV");
  }

  const groupedOpts = ["I","II","III","IV","V","VI"].map(sec=>({
    sec, items: DM.CATALOG.filter(c=>c.sec===sec)
  }));

  return (
    <div className="grid-side">
      <div className="card">
        <div className="card-pad">
          <div className="card-h">Ghi nhận vi phạm</div>

          <div className="field">
            <label>Nhân viên</label>
            <select value={fEmpId} onChange={e=>setFEmpId(e.target.value)}>
              <option value="">— Chọn nhân viên —</option>
              {[...employees].sort((a,b)=>String(a.hoTen).localeCompare(String(b.hoTen),"vi")).map(e=>(
                <option key={e.id} value={e.id}>{e.hoTen} — {e.chiNhanh}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Mã vi phạm</label>
            <select value={fCode} onChange={e=>setFCode(e.target.value)}>
              <option value="">— Chọn lỗi —</option>
              {groupedOpts.map(g=>(
                <optgroup key={g.sec} label={`Nhóm ${g.sec} · ${DM.SECTIONS[g.sec]}`}>
                  {g.items.map(c=>(
                    <option key={c.code} value={c.code}>{c.code} — {c.desc}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {code && (
              <div className="subtle" style={{marginTop:6, fontSize:12}}>
                {code.type==="fixed" && <>Phạt cố định: <b>{DM.fmtMoney(code.amount)}</b></>}
                {code.type==="per"   && <>Phạt theo mốc: <b>{DM.fmtMoney(code.amount)}</b> × SL</>}
                {code.type==="manual"&& <>Nhập số tiền theo mức độ. {code.consq||""}</>}
                {code.type==="none"  && <span className="consq">{code.consq||"Không phạt tiền"}</span>}
              </div>
            )}
          </div>

          {code && code.type==="per" && (
            <div className="field">
              <label>Số lần / số mốc</label>
              <input type="number" min="1" value={fQty} onChange={e=>setFQty(e.target.value)} />
            </div>
          )}

          <div className="field">
            <label>Số tiền phạt {autoAmt && <span className="hint">(tự tính)</span>}</label>
            <input type="number" value={fAmount} onChange={e=>{setFAmount(e.target.value); setAutoAmt(false);}} placeholder="0" disabled={code && code.type==="none"} />
          </div>

          <div className="field">
            <label>Ngày vi phạm</label>
            <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} />
          </div>

          <div className="field">
            <label>Ghi chú</label>
            <textarea value={fNote} onChange={e=>setFNote(e.target.value)} placeholder="Mô tả ngắn..." />
          </div>

          <button className="btn full" onClick={submit}>Ghi nhận vi phạm</button>
        </div>
      </div>

      <div>
        <div className="filter-bar">
          <div className="field sm">
            <label>Tháng</label>
            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Nhân viên</label>
            <select value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
              <option value="all">Tất cả</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.hoTen}</option>)}
            </select>
          </div>
          <div style={{marginLeft:"auto", display:"flex", gap:8, paddingBottom:2}}>
            <button className="btn ghost sm" onClick={exportCSV}>Xuất CSV</button>
          </div>
        </div>

        <div className="kvbar">
          <div className="kv"><span className="k">Số lượt</span><span className="v">{inScope.length}</span></div>
          <div className="kv"><span className="k">Tổng tiền phạt</span><span className="v">{DM.fmtMoney(inScope.reduce((s,v)=>s+Number(v.amount||0),0))}</span></div>
          <div className="kv"><span className="k">Tháng</span><span className="v">{filterMonth.split("-")[1]}/{filterMonth.split("-")[0]}</span></div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Nhân viên</th>
                <th>Lỗi</th>
                <th>Ghi chú</th>
                <th className="num">Số tiền</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inScope.map(v=>{
                const e = employees.find(x=>x.id===v.empId);
                const c = DM.CAT_MAP[v.code];
                return (
                  <tr key={v.id}>
                    <td style={{whiteSpace:"nowrap"}}>{DM.fmtDate(v.date)}</td>
                    <td>
                      <div className="name-cell">
                        <DM_Avatar name={e?.hoTen||"?"}/>
                        <div>
                          <div className="nm">{e?.hoTen||"—"}</div>
                          <div className="sub">{e?.chiNhanh}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="pill code">{v.code}</span> <span style={{color:"var(--ink-soft)", fontSize:12.5}}>{c?.desc||""}</span></td>
                    <td style={{color:"var(--ink-soft)"}}>{v.note||"—"}</td>
                    <td className="money-cell">{v.amount>0?DM.fmtMoney(v.amount):"—"}</td>
                    <td><button className="icon-btn danger" onClick={()=>onDelete(v.id)}>Xóa</button></td>
                  </tr>
                );
              })}
              {inScope.length===0 && (
                <tr><td colSpan={6}><div className="empty"><div className="big">Chưa có vi phạm</div><div>Trong tháng đã chọn</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, HRScreen, ViolationLog });
window.JYS_MGR = { Dashboard, HRScreen, ViolationLog };
