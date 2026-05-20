/* JYS HR — Shared & staff screens: Catalog, MyProfile, MyViolations, Quiz */
const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS } = React;
const DS = window.JYS_DATA;

/* ---------- Catalog (shared) ---------- */
function CatalogScreen() {
  const grouped = ["I","II","III","IV","V","VI"].map(sec=>({
    sec, items: DS.CATALOG.filter(c=>c.sec===sec)
  }));
  return (
    <>
      <h3 className="section-title">Danh mục lỗi và mức phạt</h3>
      <p className="subtle" style={{marginBottom:18, maxWidth:760}}>
        Bảng tra cứu toàn bộ lỗi vi phạm theo nội quy. Áp dụng cho mọi nhân sự của JYS — tham khảo thường xuyên để tránh sai phạm. Khoản tiền phạt được nộp vào quỹ công đoàn của công ty.
      </p>
      {grouped.map(g=>(
        <div key={g.sec} className="catalog-sec">
          <div className="catalog-sec-head">
            <span className="nu">{g.sec}</span>
            <h3>{DS.SECTIONS[g.sec]}</h3>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{width:64}}>Mã</th>
                  <th>Mô tả lỗi</th>
                  <th style={{width:200, textAlign:"right"}}>Mức phạt / Hậu quả</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map(c=>(
                  <tr key={c.code}>
                    <td><span className="pill code">{c.code}</span></td>
                    <td>
                      {c.desc}
                      {c.consq && <div className="consq" style={{marginTop:3, fontSize:11.5}}>{c.consq}</div>}
                    </td>
                    <td style={{textAlign:"right"}}>
                      {c.type==="fixed"  && <span className="money-cell">{DS.fmtMoney(c.amount)}</span>}
                      {c.type==="per"    && <span><span className="money-cell">{DS.fmtMoney(c.amount)}</span><div className="subtle" style={{fontSize:11}}>/ mốc 5 phút</div></span>}
                      {c.type==="manual" && <span className="pill warn">Tùy mức độ</span>}
                      {c.type==="none"   && <span className="pill muted">Không phạt tiền</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- My Profile (staff) ---------- */
function MyProfile({ me }) {
  if (!me) return <div className="empty"><div className="big">Không tìm thấy hồ sơ</div></div>;
  const A = window.JYS_APP;
  const hang = DS.tinhHang(me.luongThang);
  const tn = DS.thamNien(me.ngayVaoLam);
  const cs = DS.trangThaiHopDong(me);
  const luongNam = Number(me.luongThang||0) * 12;

  return (
    <>
      <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:18, flexWrap:"wrap"}}>
        <A.Avatar name={me.hoTen} lg dark />
        <div>
          <h2 style={{fontSize:22, color:"var(--black)"}}>{me.hoTen}</h2>
          <div className="subtle">{me.viTri} · {me.chiNhanh} · Mã NV {me.maNV}</div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <span className={`pill rank r${hang.idx+1}`}>{hang.ten}</span>
        </div>
      </div>
      <A.RankBanner hang={hang} luong={me.luongThang} />
      <A.ProfileSections emp={me} hang={hang} tn={tn} cs={cs} luongNam={luongNam} tongPhat={0} viCount={0} />
    </>
  );
}

/* ---------- My Violations (staff) ---------- */
function MyViolations({ me, violations }) {
  if (!me) return null;
  const thisMonth = DS.monthISO();
  const monthList = violations.filter(v=>String(v.date).slice(0,7)===thisMonth);
  const total = violations.reduce((s,v)=>s+Number(v.amount||0),0);
  const monthTotal = monthList.reduce((s,v)=>s+Number(v.amount||0),0);
  const sorted = [...violations].sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  return (
    <>
      <h3 className="section-title">Lỗi vi phạm của tôi</h3>
      <div className="stats" style={{gridTemplateColumns:"repeat(2,1fr)", maxWidth:560}}>
        <div className="stat accent">
          <div className="lbl">Tổng phạt từ trước đến nay</div>
          <div className="val" style={{color: total>0?"var(--warn)":"var(--ink)"}}>{DS.fmtMoney(total)}</div>
          <div className="note">{violations.length} lượt vi phạm</div>
        </div>
        <div className="stat">
          <div className="lbl">Tháng này ({thisMonth.split("-")[1]}/{thisMonth.split("-")[0]})</div>
          <div className="val" style={{color: monthTotal>0?"var(--warn)":"var(--ink)"}}>{DS.fmtMoney(monthTotal)}</div>
          <div className="note">{monthList.length} lượt</div>
        </div>
      </div>

      <h3 className="section-title">Chi tiết</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Lỗi</th>
              <th>Ghi chú</th>
              <th className="num">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(v=>{
              const c = DS.CAT_MAP[v.code];
              return (
                <tr key={v.id}>
                  <td style={{whiteSpace:"nowrap"}}>{DS.fmtDate(v.date)}</td>
                  <td><span className="pill code">{v.code}</span> <span style={{color:"var(--ink-soft)", fontSize:12.5}}>{c?.desc}</span></td>
                  <td style={{color:"var(--ink-soft)"}}>{v.note||"—"}</td>
                  <td className="money-cell">{v.amount>0?DS.fmtMoney(v.amount):"—"}</td>
                </tr>
              );
            })}
            {sorted.length===0 && (
              <tr><td colSpan={4}><div className="empty"><div className="big">Bạn chưa có vi phạm nào</div><div>Tiếp tục giữ vững — cố gắng nhé!</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Quiz (shared) ---------- */
function QuizScreen({ me, isMgr, quizzes, onSaveQuiz, showToast }) {
  const [phase, setPhase] = useStateS("intro"); // intro | running | result
  const [questions, setQuestions] = useStateS([]);
  const [answers, setAnswers] = useStateS([]);
  const [idx, setIdx] = useStateS(0);
  const [lastResult, setLastResult] = useStateS(null);

  function shuffleArr(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

  function start(){
    const qs = shuffleArr(DS.QUIZ_BANK).slice(0, DS.QUIZ_TOTAL);
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(null));
    setIdx(0);
    setPhase("running");
  }

  function pick(i){
    const next = answers.slice();
    next[idx] = i;
    setAnswers(next);
  }
  function nextQ(){
    if (idx < questions.length-1) setIdx(idx+1);
    else finish();
  }
  function prevQ(){
    if (idx>0) setIdx(idx-1);
  }
  function finish(){
    let score = 0;
    questions.forEach((q,i)=>{ if(answers[i]===q.a) score++; });
    const passed = score >= DS.QUIZ_PASS;
    const result = {
      id: "k"+Date.now().toString(36).slice(-5),
      empId: me?.id || "manager",
      name: me?.hoTen || "Quản lý",
      branch: me?.chiNhanh || "—",
      pos: me?.viTri || "Quản lý",
      score, total: questions.length, passed,
      date: DS.todayISO(),
      questions, answers,
    };
    setLastResult(result);
    setPhase("result");
    onSaveQuiz(result);
    showToast(passed ? `Đậu! ${score}/${questions.length}` : `Chưa đạt: ${score}/${questions.length}`);
  }

  if (phase === "intro") {
    const myHist = me ? quizzes.filter(k=>k.empId===me.id).sort((a,b)=>String(b.date).localeCompare(String(a.date))) : [];
    return (
      <div className="quiz-card">
        <h3 className="section-title" style={{marginTop:0}}>Bài kiểm tra nội quy</h3>
        <div className="card">
          <div className="card-pad">
            <div className="kvbar" style={{marginBottom:18}}>
              <div className="kv"><span className="k">Số câu</span><span className="v">{DS.QUIZ_TOTAL}</span></div>
              <div className="kv"><span className="k">Điểm đạt</span><span className="v">{DS.QUIZ_PASS}/{DS.QUIZ_TOTAL}</span></div>
              <div className="kv"><span className="k">Thời lượng</span><span className="v">~10p</span></div>
            </div>
            <p className="subtle" style={{marginBottom:14}}>
              Kiểm tra hiểu biết về nội quy JYS: mức phạt, quy trình nghỉ phép, Ho-Ren-So, 5S, và các tình huống thường gặp. Mỗi câu chỉ chọn một đáp án. Có thể quay lại câu trước.
            </p>
            <button className="btn" onClick={start}>Bắt đầu làm bài</button>
          </div>
        </div>

        {myHist.length>0 && (
          <>
            <h3 className="section-title">Lịch sử của bạn</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Ngày</th><th>Điểm</th><th>Kết quả</th></tr></thead>
                <tbody>
                  {myHist.map(k=>(
                    <tr key={k.id}>
                      <td>{DS.fmtDate(k.date)}</td>
                      <td className="money-cell">{k.score}/{k.total}</td>
                      <td><span className={"pill "+(k.passed?"pass":"fail")}>{k.passed?"Đạt":"Chưa đạt"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {isMgr && quizzes.length>0 && (
          <>
            <h3 className="section-title">Kết quả gần đây của nhân viên</h3>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Ngày</th><th>Nhân viên</th><th>Chi nhánh</th><th>Vị trí</th><th>Điểm</th><th>Kết quả</th></tr></thead>
                <tbody>
                  {[...quizzes].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10).map(k=>(
                    <tr key={k.id}>
                      <td>{DS.fmtDate(k.date)}</td>
                      <td><div className="name-cell"><span className="av">{DS.initials(k.name)}</span><div><div className="nm">{k.name}</div></div></div></td>
                      <td>{k.branch}</td>
                      <td>{k.pos}</td>
                      <td className="money-cell">{k.score}/{k.total}</td>
                      <td><span className={"pill "+(k.passed?"pass":"fail")}>{k.passed?"Đạt":"Chưa đạt"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === "running") {
    const q = questions[idx];
    const sel = answers[idx];
    const progress = ((idx+1)/questions.length)*100;
    const answered = answers.filter(a=>a!=null).length;
    return (
      <div className="quiz-card">
        <div className="card">
          <div className="card-pad">
            <div className="q-progress"><div style={{width:progress+"%"}}></div></div>
            <div className="q-count">
              <span>Câu {idx+1} / {questions.length}</span>
              <span>{answered} đã trả lời</span>
            </div>
            <div className="q-text">{q.q}</div>
            {q.opts.map((opt,i)=>(
              <button key={i} className={"q-opt"+(sel===i?" sel":"")} onClick={()=>pick(i)}>
                <span className="mk">{String.fromCharCode(65+i)}</span>
                <span className="ot">{opt}</span>
              </button>
            ))}
            <div className="btn-row" style={{justifyContent:"space-between", marginTop:16}}>
              <button className="btn ghost" onClick={prevQ} disabled={idx===0}>← Câu trước</button>
              {idx < questions.length-1
                ? <button className="btn" onClick={nextQ} disabled={sel==null}>Câu tiếp →</button>
                : <button className="btn dark" onClick={finish} disabled={sel==null}>Nộp bài</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // phase === "result"
  const r = lastResult;
  const wrong = r.questions.map((q,i)=>({q, i, picked:r.answers[i]})).filter(x=>x.picked !== x.q.a);
  const pct = Math.round((r.score/r.total)*100);
  return (
    <div className="quiz-card">
      <div className="card">
        <div className="card-pad" style={{textAlign:"center"}}>
          <div className="subtle" style={{fontSize:13, letterSpacing:".05em", textTransform:"uppercase", fontWeight:700, marginBottom:8}}>Kết quả bài kiểm tra</div>
          <div className="result-score">{r.score}<span className="of">/{r.total}</span></div>
          <div style={{marginTop:14, marginBottom:14}}>
            <span className={"pill "+(r.passed?"pass":"fail")} style={{fontSize:13, padding:"5px 14px"}}>{r.passed?"Đạt — Chúc mừng!":"Chưa đạt — cần ôn lại"}</span>
          </div>
          <div className="subtle">Tỉ lệ đúng {pct}% · Cần {DS.QUIZ_PASS}/{r.total} câu để đạt</div>
          <div className="btn-row" style={{justifyContent:"center", marginTop:18}}>
            <button className="btn" onClick={()=>setPhase("intro")}>Làm lại</button>
          </div>
        </div>
      </div>

      {wrong.length > 0 && (
        <>
          <h3 className="section-title">Xem lại các câu sai ({wrong.length})</h3>
          {wrong.map(({q, i, picked})=>(
            <div className="rev-item" key={i}>
              <div className="rq">Câu {i+1}. {q.q}</div>
              <div className="rev-line"><span className="tag">Bạn chọn</span><span className="ans-wrong">{picked!=null ? q.opts[picked] : "(không trả lời)"}</span></div>
              <div className="rev-line"><span className="tag">Đáp án</span><span className="ans-right">{q.opts[q.a]}</span></div>
              <div className="rev-why">{q.why}</div>
            </div>
          ))}
        </>
      )}
      {wrong.length === 0 && (
        <div className="card" style={{marginTop:18}}><div className="card-pad" style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:22, color:"var(--sky-dark)"}}>Hoàn hảo! Tất cả câu trả lời đều đúng.</div>
          <div className="subtle" style={{marginTop:6}}>Bạn nắm rất chắc nội quy của JYS.</div>
        </div></div>
      )}
    </div>
  );
}

Object.assign(window, { CatalogScreen, MyProfile, MyViolations, QuizScreen });
window.JYS_SHARED = { CatalogScreen, MyProfile, MyViolations, QuizScreen };
