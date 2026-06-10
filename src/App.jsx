import { useState, useEffect } from "react";

const WEBHOOK_URL = "https://signalcraftai.app.n8n.cloud/webhook/manager-api";
const UPDATE_URL = "https://signalcraftai.app.n8n.cloud/webhook/manager-update";
const BLOCKED_URL = "https://signalcraftai.app.n8n.cloud/webhook/blocked-tables";

const AUTH = { username: "admin", password: "admin", pin: "1234" };
const SESSION_KEY = "signalcraft_auth";

const TABLES = [
  { id:"T01", capacity:2,  location:"Window" },
  { id:"T02", capacity:2,  location:"Window" },
  { id:"T03", capacity:2,  location:"Interior" },
  { id:"T04", capacity:2,  location:"Interior" },
  { id:"T05", capacity:4,  location:"Terrace" },
  { id:"T06", capacity:4,  location:"Terrace" },
  { id:"T07", capacity:4,  location:"Interior" },
  { id:"T08", capacity:6,  location:"Interior" },
  { id:"T09", capacity:6,  location:"Interior" },
  { id:"T10", capacity:12, location:"Private Room" },
];

const toDateStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
};
const fmtDate = (s) => {
  if (!s) return "";
  return new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
};
const toMin = (t) => { if (!t) return 0; const [h,m] = t.split(":").map(Number); return h*60+m; };

const getDates = () => {
  const TODAY = toDateStr(0), TMR = toDateStr(1), DAT = toDateStr(2);
  return [
    { label:"Today", sub:fmtDate(TODAY), val:TODAY },
    { label:"Tomorrow", sub:fmtDate(TMR), val:TMR },
    { label:fmtDate(DAT), sub:"", val:DAT },
  ];
};

const LUNCH  = { start:720,  end:870 };
const DINNER = { start:1080, end:1320 };

const SC = {
  Confirmed:{ bg:"#0d2b1a", text:"#22c55e", border:"#166534" },
  Pending:  { bg:"#2b1f05", text:"#f59e0b", border:"#92400e" },
  Cancelled:{ bg:"#2b0a0a", text:"#ef4444", border:"#991b1b" },
};

const SESSION_OPTIONS = ["All", "Lunch", "Dinner"];

const parseBlocked = (data) => {
  let records = [];
  if (Array.isArray(data)) records = data;
  else if (data && data.id) records = [data];
  else if (data && Array.isArray(data.records)) records = data.records;
  return records.map(r => ({
    id: r.id,
    table_id: r.fields?.Table_ID || r.Table_ID || "",
    date: r.fields?.Date ? r.fields.Date.split("T")[0] : (r.Date ? r.Date.split("T")[0] : ""),
    session: r.fields?.Session || r.Session || "",
    start_time: r.fields?.Start_Time || r.Start_Time || "",
    end_time: r.fields?.End_Time || r.End_Time || "",
    reason: r.fields?.Reason || r.Reason || "",
  }));
};

const getTableBlocks = (blockedForDate, tableId, sess, sessName) => {
  return blockedForDate.filter(b => {
    if (b.table_id !== tableId) return false;
    if (b.start_time && b.end_time) return toMin(b.start_time) < sess.end && toMin(b.end_time) > sess.start;
    return b.session === "All" || b.session === sessName;
  });
};

// ── useIsMobile hook ──
const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
};

// ── Login ──
function LoginScreen({ onLogin }) {
  const [step, setStep] = useState("creds");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleCreds = () => {
    if (username === AUTH.username && password === AUTH.password) { setError(""); setStep("pin"); }
    else { setError("Invalid username or password"); triggerShake(); }
  };

  const handlePin = (digit) => {
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      if (next === AUTH.pin) { localStorage.setItem(SESSION_KEY, "1"); onLogin(); }
      else { setError("Wrong PIN"); triggerShake(); setTimeout(() => setPin(""), 600); }
    }
  };

  const inp = { background:"#0f0f1c", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px", color:"#e2e8f0", fontSize:16, width:"100%", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0b0b14",padding:20}}>
      <div style={{width:"100%",maxWidth:380,padding:32,background:"#13131f",border:"1px solid #1a1a30",borderRadius:24,boxShadow:"0 24px 64px #000a",transform:shake?"translateX(-6px)":"none",transition:"transform 0.1s"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:"linear-gradient(135deg,#7c3aed,#4338ca)",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 14px"}}>⚡</div>
          <div style={{fontWeight:800,fontSize:22,color:"#fff"}}>SignalCraft</div>
          <div style={{fontSize:11,color:"#7c3aed",fontWeight:700,letterSpacing:3,marginTop:3}}>AI MANAGER</div>
        </div>

        {step === "creds" ? (
          <>
            <div style={{fontSize:14,color:"#64748b",textAlign:"center",marginBottom:24}}>Sign in to continue</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,color:"#475569",marginBottom:8}}>Username</div>
              <input style={inp} value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreds()} placeholder="admin" autoComplete="username"/>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,color:"#475569",marginBottom:8}}>Password</div>
              <input style={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreds()} placeholder="••••••" autoComplete="current-password"/>
            </div>
            {error && <div style={{color:"#ef4444",fontSize:13,textAlign:"center",marginBottom:16}}>{error}</div>}
            <button onClick={handleCreds} style={{width:"100%",background:"linear-gradient(135deg,#7c3aed,#4338ca)",color:"#fff",border:"none",borderRadius:12,padding:"16px",fontSize:16,fontWeight:700,cursor:"pointer"}}>
              Continue →
            </button>
          </>
        ) : (
          <>
            <div style={{fontSize:14,color:"#64748b",textAlign:"center",marginBottom:28}}>Enter your 4-digit PIN</div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:32}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:18,height:18,borderRadius:"50%",background:i<pin.length?"#7c3aed":"#1a1a30",border:"2px solid",borderColor:i<pin.length?"#7c3aed":"#2a2a45",transition:"all 0.15s"}}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i)=>(
                <button key={i} onClick={()=>{ if(d==="⌫") setPin(p=>p.slice(0,-1)); else if(d) handlePin(d); }}
                  style={{padding:"18px 0",borderRadius:14,border:"1px solid #1a1a30",background:d?"#0f0f1c":"transparent",color:"#e2e8f0",fontSize:22,fontWeight:700,cursor:d?"pointer":"default",opacity:d?1:0,WebkitTapHighlightColor:"transparent"}}>
                  {d}
                </button>
              ))}
            </div>
            {error && <div style={{color:"#ef4444",fontSize:13,textAlign:"center",marginBottom:10}}>{error}</div>}
            <button onClick={()=>{setStep("creds");setPin("");setError("");}} style={{width:"100%",background:"transparent",color:"#475569",border:"none",fontSize:13,cursor:"pointer",padding:"10px"}}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ──
export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(SESSION_KEY));
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { localStorage.removeItem(SESSION_KEY); setAuthed(false); }} />;
}

function Dashboard({ onLogout }) {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState([]);
  const [blocked, setBlocked]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [dates, setDates]               = useState(getDates);
  const [date, setDate]                 = useState(() => toDateStr(0));
  const [view, setView]                 = useState("timeline");
  const [session, setSession]           = useState("lunch");
  const [detail, setDetail]             = useState(null);
  const [toast, setToast]               = useState(null);
  const [now, setNow]                   = useState(new Date());
  const [blockForm, setBlockForm]       = useState({ table_id:"T01", date:toDateStr(0), session:"All", start_time:"", end_time:"", reason:"" });
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    fetchReservations(); fetchBlocked();
    const clock = setInterval(() => { setNow(new Date()); setDates(getDates()); }, 30000);
    return () => clearInterval(clock);
  }, []);

  const fetchReservations = async () => {
    try { setLoading(true); setError(null); const res = await fetch(WEBHOOK_URL); const data = await res.json(); setReservations(data[0]?.reservations || data.reservations || []); }
    catch (e) { setError("Could not load reservations."); } finally { setLoading(false); }
  };
  const fetchBlocked = async () => {
    try { const res = await fetch(BLOCKED_URL); const data = await res.json(); setBlocked(parseBlocked(data)); }
    catch (e) { setBlocked([]); }
  };
  const addBlock = async () => {
    if (!blockForm.table_id || !blockForm.date) return;
    try {
      setBlockLoading(true);
      const res = await fetch(BLOCKED_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(blockForm) });
      const data = await res.json();
      if (data.success) { showToast("🚫 Table blocked"); await fetchBlocked(); setBlockForm({table_id:"T01",date:toDateStr(0),session:"All",start_time:"",end_time:"",reason:""}); }
      else showToast("Failed","err");
    } catch(e) { showToast("Failed","err"); } finally { setBlockLoading(false); }
  };
  const removeBlock = async (id) => {
    try { await fetch(BLOCKED_URL, {method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}); showToast("✅ Removed"); setBlocked(prev=>prev.filter(b=>b.id!==id)); }
    catch(e) { showToast("Failed","err"); }
  };
  const updateStatus = async (id, status) => {
    try { setReservations(prev=>prev.map(r=>r.id===id?{...r,status}:r)); showToast(status==="Confirmed"?"✅ Confirmed":"❌ Cancelled"); setDetail(null); await fetch(UPDATE_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})}); }
    catch(e) { showToast("Failed","err"); fetchReservations(); }
  };
  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const TODAY_STR = toDateStr(0);
  const dayRes   = reservations.filter(r=>r.date===date && r.status!=="Cancelled");
  const allDay   = reservations.filter(r=>r.date===date);
  const sess     = session==="lunch" ? LUNCH : DINNER;
  const sessW    = sess.end - sess.start;
  const sessName = session==="lunch" ? "Lunch" : "Dinner";

  const stats = { total:allDay.length, confirmed:allDay.filter(r=>r.status==="Confirmed").length, pending:allDay.filter(r=>r.status==="Pending").length, cancelled:allDay.filter(r=>r.status==="Cancelled").length };

  const nowMin = now.getHours()*60+now.getMinutes();
  const nowPct = date===TODAY_STR ? Math.min(100,Math.max(0,(nowMin-sess.start)/sessW*100)) : null;
  const inSess = date===TODAY_STR && nowMin>=sess.start && nowMin<=sess.end;

  const inSession = (r) => toMin(r.end_time)>sess.start && toMin(r.start_time)<sess.end;
  const leftPct   = (r) => Math.max(0,(toMin(r.start_time)-sess.start)/sessW*100);
  const widthPct  = (r) => Math.min(100,(toMin(r.end_time)-Math.max(toMin(r.start_time),sess.start))/sessW*100);
  const bLeftPct  = (b) => Math.max(0,(Math.max(toMin(b.start_time),sess.start)-sess.start)/sessW*100);
  const bWidthPct = (b) => Math.min(100,(Math.min(toMin(b.end_time),sess.end)-Math.max(toMin(b.start_time),sess.start))/sessW*100);

  const getFloorStatus = (tableId) => {
    if (blockedForDate.some(b=>b.table_id===tableId)) return {color:"#ef4444"};
    const res = dayRes.find(r=>r.table===tableId);
    if (!res) return {color:"#22c55e"};
    return {color:res.status==="Pending"?"#f59e0b":"#ef4444"};
  };

  const blockedForDate = blocked.filter(b=>b.date===date);

  const NAV = [
    {id:"timeline", icon:"⏱", label:"Timeline"},
    {id:"list",     icon:"📋", label:"Bookings"},
    {id:"floor",    icon:"🪑", label:"Floor"},
    {id:"blocked",  icon:"🚫", label:"Block"},
  ];

  const inp = {background:"#0f0f1c",border:"1px solid #1a1a30",borderRadius:10,padding:"12px 14px",color:"#e2e8f0",fontSize:15,width:"100%",boxSizing:"border-box"};

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0b0b14",color:"#a78bfa",flexDirection:"column",gap:16}}><div style={{fontSize:40}}>⚡</div><div style={{fontSize:14,color:"#64748b"}}>Loading...</div></div>;
  if (error) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0b0b14",color:"#ef4444",flexDirection:"column",gap:16}}><div style={{fontSize:32}}>⚠️</div><div>{error}</div><button onClick={fetchReservations} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer"}}>Retry</button></div>;

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100vh",background:"#0b0b14",color:"#e2e8f0",fontFamily:"system-ui,sans-serif",overflow:"hidden"}}>

      {/* Toast */}
      {toast && <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,background:toast.type==="ok"?"#0d2b1a":"#2b0a0a",border:`1px solid ${toast.type==="ok"?"#166534":"#991b1b"}`,color:toast.type==="ok"?"#22c55e":"#ef4444",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:700,boxShadow:"0 8px 32px #0009",whiteSpace:"nowrap"}}>{toast.msg}</div>}

      {/* Detail Modal */}
      {detail && (
        <div style={{position:"fixed",inset:0,background:"#000c",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setDetail(null)}>
          <div style={{background:"#13131f",border:"1px solid #2a2a45",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:500,boxShadow:"0 -8px 40px #000a",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"#2a2a45",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <span style={{fontWeight:800,fontSize:17}}>Reservation — {detail.res_id}</span>
              <button onClick={()=>setDetail(null)} style={{background:"#1a1a30",border:"none",color:"#94a3b8",fontSize:16,cursor:"pointer",borderRadius:8,padding:"6px 10px"}}>✕</button>
            </div>
            {[["Name",detail.name],["Phone",detail.phone],["Email",detail.email||"—"],["Date",detail.date],["Time",`${detail.start_time} → ${detail.end_time}`],["Guests",detail.guests],["Table",detail.table],["Status",detail.status]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #1e1e3a",fontSize:14}}>
                <span style={{color:"#64748b"}}>{k}</span>
                <span style={{fontWeight:600,color:k==="Status"?SC[v]?.text:"#e2e8f0"}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:12,marginTop:20}}>
              <button onClick={()=>updateStatus(detail.id,"Confirmed")} style={{flex:1,background:"#166534",color:"#22c55e",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:700,cursor:"pointer"}}>✓ Confirm</button>
              <button onClick={()=>updateStatus(detail.id,"Cancelled")} style={{flex:1,background:"#991b1b",color:"#ef4444",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:700,cursor:"pointer"}}>✗ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP Sidebar */}
      {!isMobile && (
        <div style={{width:200,background:"#0f0f1c",borderRight:"1px solid #1a1a30",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"20px 16px",borderBottom:"1px solid #1a1a30"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:32,height:32,background:"linear-gradient(135deg,#7c3aed,#4338ca)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
              <div><div style={{fontWeight:800,fontSize:13,color:"#fff"}}>SignalCraft</div><div style={{fontSize:9,color:"#7c3aed",fontWeight:700,letterSpacing:2}}>AI MANAGER</div></div>
            </div>
          </div>
          <nav style={{flex:1,padding:"12px 8px"}}>
            {NAV.map(item=>(
              <button key={item.id} onClick={()=>setView(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:3,background:view===item.id?"#7c3aed22":"transparent",color:view===item.id?"#a78bfa":"#64748b",fontWeight:view===item.id?700:400,fontSize:13,textAlign:"left",borderLeft:`2px solid ${view===item.id?"#7c3aed":"transparent"}`}}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div style={{padding:"12px 16px",borderTop:"1px solid #1a1a30",display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{fetchReservations();fetchBlocked();}} style={{width:"100%",background:"#1e1e3a",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}}>🔄 Refresh</button>
            <button onClick={onLogout} style={{width:"100%",background:"#2b0a0a",border:"1px solid #991b1b",color:"#ef4444",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}}>🚪 Logout</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Mobile Header */}
        {isMobile && (
          <div style={{background:"#0f0f1c",borderBottom:"1px solid #1a1a30",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,background:"linear-gradient(135deg,#7c3aed,#4338ca)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
              <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>SignalCraft</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,color:"#475569"}}>🕐 {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
              <button onClick={onLogout} style={{background:"#2b0a0a",border:"1px solid #991b1b",color:"#ef4444",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Logout</button>
            </div>
          </div>
        )}

        {/* Date tabs */}
        <div style={{background:"#0f0f1c",borderBottom:"1px solid #1a1a30",padding:isMobile?"10px 16px":"0 22px",display:"flex",gap:8,flexShrink:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          {!isMobile && <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
            {dates.map(d=>(
              <button key={d.val} onClick={()=>setDate(d.val)} style={{padding:"5px 14px",height:56,borderRadius:0,border:"none",borderBottom:`2px solid ${date===d.val?"#7c3aed":"transparent"}`,background:"transparent",color:date===d.val?"#a78bfa":"#64748b",fontWeight:date===d.val?700:400,fontSize:13,cursor:"pointer"}}>
                {d.label} <span style={{fontSize:11,opacity:0.6}}>{d.sub}</span>
              </button>
            ))}
          </div>}
          {isMobile && dates.map(d=>(
            <button key={d.val} onClick={()=>setDate(d.val)} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${date===d.val?"#7c3aed":"#1a1a30"}`,background:date===d.val?"#7c3aed":"transparent",color:date===d.val?"#fff":"#64748b",fontWeight:date===d.val?700:400,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              {d.label}
            </button>
          ))}
          {!isMobile && (
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 4px"}}>
              <span style={{fontSize:12,color:"#475569"}}>🕐 {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#4338ca)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13}}>M</div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflow:"auto",padding:isMobile?"12px":"20px",paddingBottom:isMobile?"90px":"20px",display:"flex",flexDirection:"column",gap:isMobile?10:16}}>

          {/* Stats */}
          {view!=="blocked" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
              {[{label:"Total",val:stats.total,icon:"📅",color:"#818cf8"},{label:"Confirmed",val:stats.confirmed,icon:"✅",color:"#22c55e"},{label:"Pending",val:stats.pending,icon:"⏳",color:"#f59e0b"},{label:"Cancelled",val:stats.cancelled,icon:"❌",color:"#ef4444"}].map((s,i)=>(
                <div key={i} style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:10,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.icon}</div>
                  <div><div style={{fontSize:11,color:"#475569",marginBottom:1}}>{s.label}</div><div style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div></div>
                </div>
              ))}
            </div>
          )}

          {/* TIMELINE */}
          {view==="timeline" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14}}>Timeline — {fmtDate(date)}</span>
                <div style={{display:"flex",gap:6}}>
                  {["lunch","dinner"].map(s=>(
                    <button key={s} onClick={()=>setSession(s)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${session===s?"#7c3aed":"#1a1a30"}`,background:session===s?"#7c3aed":"transparent",color:session===s?"#fff":"#64748b",fontWeight:session===s?700:400,fontSize:12,cursor:"pointer"}}>
                      {s==="lunch"?"☀️":"🌙"} {s==="lunch"?"Lunch":"Dinner"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{overflowX:"auto",padding:"14px 16px"}}>
                <div style={{minWidth:500}}>
                  <div style={{display:"flex",marginLeft:70,marginBottom:6}}>
                    {Array.from({length:7},(_,i)=>{const m=sess.start+i*(sessW/6),h=Math.floor(m/60),mn=m%60;return<div key={i} style={{flex:1,fontSize:9,color:"#374151"}}>{String(h).padStart(2,"0")}:{String(Math.round(mn)).padStart(2,"0")}</div>;})}
                  </div>
                  <div style={{position:"relative"}}>
                    <div style={{position:"absolute",inset:0,display:"flex",marginLeft:70,pointerEvents:"none"}}>
                      {Array.from({length:7},(_,i)=><div key={i} style={{flex:1,borderLeft:"1px solid #1a1a30"}}/>)}
                    </div>
                    {nowPct!==null && inSess && (
                      <div style={{position:"absolute",top:0,bottom:0,left:`calc(70px + ${nowPct}% * (100% - 70px) / 100)`,width:2,background:"#7c3aed",zIndex:10,pointerEvents:"none"}}>
                        <div style={{position:"absolute",top:-4,left:-14,fontSize:8,color:"#a78bfa",fontWeight:700,background:"#13131f",padding:"1px 3px",borderRadius:3}}>NOW</div>
                      </div>
                    )}
                    {TABLES.map(t=>{
                      const tRes = dayRes.filter(r=>r.table===t.id && inSession(r));
                      const tBlocks = getTableBlocks(blockedForDate, t.id, sess, sessName);
                      const isFullyBlocked = tBlocks.some(b=>!b.start_time||!b.end_time);
                      return (
                        <div key={t.id} style={{display:"flex",alignItems:"center",marginBottom:6,height:38}}>
                          <div style={{width:70,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                            <span style={{fontSize:12,fontWeight:700,color:tBlocks.length>0?"#ef4444":"#a78bfa"}}>{t.id}</span>
                            <span style={{fontSize:10,color:"#374151"}}>{t.capacity}p</span>
                            {tBlocks.length>0&&<span style={{fontSize:9}}>🚫</span>}
                          </div>
                          <div style={{flex:1,position:"relative",height:32,background:isFullyBlocked?"#2b0a0a":"#0f0f1c",borderRadius:8,overflow:"hidden",border:isFullyBlocked?"1px solid #991b1b":"none"}}>
                            <div style={{position:"absolute",inset:0,background:"#0d2b1a22",borderRadius:8}}/>
                            {!isFullyBlocked && tRes.map(r=>{
                              const lp=leftPct(r),wp=widthPct(r);
                              if(wp<=0) return null;
                              const sc=SC[r.status];
                              return <div key={r.id} onClick={()=>setDetail(r)} style={{position:"absolute",top:2,height:"calc(100% - 4px)",left:`${lp}%`,width:`${wp}%`,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",paddingLeft:6,overflow:"hidden",minWidth:4,zIndex:2}}>
                                <span style={{fontSize:11,fontWeight:600,color:sc.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{wp>8?r.name?.split(" ")[0]:""}</span>
                              </div>;
                            })}
                            {!isFullyBlocked && tBlocks.map(b=>{
                              const lp=bLeftPct(b),wp=bWidthPct(b);
                              if(wp<=0) return null;
                              return <div key={b.id} style={{position:"absolute",top:2,height:"calc(100% - 4px)",left:`${lp}%`,width:`${wp}%`,background:"#2b0a0a",border:"1px solid #991b1b",borderRadius:6,display:"flex",alignItems:"center",paddingLeft:6,overflow:"hidden",minWidth:4,zIndex:3}}>
                                <span style={{fontSize:11,fontWeight:600,color:"#ef4444",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{wp>8?`🚫${b.reason?` ${b.reason}`:""}`:""}</span>
                              </div>;
                            })}
                            {isFullyBlocked && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:8}}><span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>Blocked{tBlocks[0]?.reason?` — ${tBlocks[0].reason}`:""}</span></div>}
                            {!isFullyBlocked && tRes.length===0 && tBlocks.length===0 && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:8}}><span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>Free</span></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:14,marginTop:10,paddingTop:10,borderTop:"1px solid #1a1a30",flexWrap:"wrap"}}>
                    {Object.entries(SC).map(([s,c])=><div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><div style={{width:10,height:10,borderRadius:2,background:c.bg,border:`1px solid ${c.border}`}}/><span style={{color:c.text}}>{s}</span></div>)}
                    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}><div style={{width:10,height:10,borderRadius:2,background:"#2b0a0a",border:"1px solid #991b1b"}}/><span style={{color:"#ef4444"}}>Blocked</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIST */}
          {view==="list" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a30",fontWeight:700,fontSize:14}}>Reservations — {fmtDate(date)}</div>
              <div style={{overflow:"auto"}}>
                {allDay.length===0 ? <div style={{padding:40,textAlign:"center",color:"#374151",fontSize:14}}>No reservations for this day</div> :
                allDay.map((r,i)=>{
                  const sc=SC[r.status];
                  return (
                    <div key={r.id} onClick={()=>setDetail(r)} style={{padding:"14px 16px",borderBottom:"1px solid #1a1a30",cursor:"pointer",background:i%2===0?"transparent":"#0f0f1c08"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontWeight:700,fontSize:15}}>{r.name}</span>
                          <span style={{background:"#1e1e3a",borderRadius:6,padding:"2px 7px",fontSize:12,fontWeight:700,color:"#a78bfa"}}>{r.table}</span>
                        </div>
                        <span style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>{r.status}</span>
                      </div>
                      <div style={{display:"flex",gap:12,fontSize:12,color:"#64748b"}}>
                        <span>🕐 {r.start_time} → {r.end_time}</span>
                        <span>👥 {r.guests} guests</span>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10}} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>updateStatus(r.id,"Confirmed")} style={{flex:1,background:"#0d2b1a",color:"#22c55e",border:"1px solid #166534",borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Confirm</button>
                        <button onClick={()=>updateStatus(r.id,"Cancelled")} style={{flex:1,background:"#2b0a0a",color:"#ef4444",border:"1px solid #991b1b",borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✗ Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FLOOR */}
          {view==="floor" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a30",fontWeight:700,fontSize:14}}>Floor Map — {fmtDate(date)}</div>
              <div style={{padding:16}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,maxWidth:500,margin:"0 auto"}}>
                  {TABLES.map(t=>{
                    const fs=getFloorStatus(t.id);
                    const activeRes=dayRes.find(r=>r.table===t.id);
                    const isBlocked=blockedForDate.some(b=>b.table_id===t.id);
                    const blockInfo=blockedForDate.find(b=>b.table_id===t.id);
                    return (
                      <div key={t.id} onClick={()=>activeRes&&!isBlocked&&setDetail(activeRes)}
                        style={{background:isBlocked?"#2b0a0a20":fs.color+"18",border:`2px solid ${isBlocked?"#991b1b55":fs.color+"55"}`,borderRadius:14,padding:"16px 12px",textAlign:"center",cursor:activeRes&&!isBlocked?"pointer":"default"}}>
                        <div style={{fontSize:24,marginBottom:4}}>{isBlocked?"🚫":t.capacity<=2?"🪑":t.capacity<=4?"🍽️":t.capacity<=6?"👥":"🏛️"}</div>
                        <div style={{fontSize:15,fontWeight:800,color:isBlocked?"#ef4444":fs.color}}>{t.id}</div>
                        <div style={{fontSize:11,color:"#475569",marginTop:2}}>{t.capacity}p · {t.location}</div>
                        {isBlocked && <div style={{fontSize:10,color:"#ef4444",marginTop:4,fontWeight:600}}>{blockInfo?.reason||"Blocked"}</div>}
                        {!isBlocked && activeRes && <div style={{fontSize:10,color:fs.color,marginTop:4,fontWeight:600}}>{activeRes.name?.split(" ")[0]} · {activeRes.start_time}</div>}
                        {!isBlocked && !activeRes && <div style={{fontSize:10,color:"#22c55e",marginTop:4}}>Free</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* BLOCK TABLES */}
          {view==="blocked" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,padding:16}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>🚫 Block a Table</div>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
                  <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>Table</div>
                    <select value={blockForm.table_id} onChange={e=>setBlockForm(p=>({...p,table_id:e.target.value}))} style={inp}>
                      {TABLES.map(t=><option key={t.id} value={t.id}>{t.id} — {t.capacity}p {t.location}</option>)}
                    </select></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>Date</div>
                      <input type="date" value={blockForm.date} onChange={e=>setBlockForm(p=>({...p,date:e.target.value}))} style={inp}/></div>
                    <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>Session</div>
                      <select value={blockForm.session} onChange={e=>setBlockForm(p=>({...p,session:e.target.value}))} style={inp}>
                        {SESSION_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>Start Time</div>
                      <input type="time" value={blockForm.start_time} onChange={e=>setBlockForm(p=>({...p,start_time:e.target.value}))} style={inp}/></div>
                    <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>End Time</div>
                      <input type="time" value={blockForm.end_time} onChange={e=>setBlockForm(p=>({...p,end_time:e.target.value}))} style={inp}/></div>
                  </div>
                  <div><div style={{fontSize:12,color:"#475569",marginBottom:6}}>Reason</div>
                    <input type="text" placeholder="e.g. Maintenance" value={blockForm.reason} onChange={e=>setBlockForm(p=>({...p,reason:e.target.value}))} style={inp}/></div>
                </div>
                <button onClick={addBlock} disabled={blockLoading} style={{width:"100%",background:"#7c3aed",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:blockLoading?0.6:1}}>
                  {blockLoading?"Saving...":"🚫 Block Table"}
                </button>
              </div>

              <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a30",fontWeight:700,fontSize:14}}>Active Blocks ({blocked.length})</div>
                {blocked.length===0 ? <div style={{padding:32,textAlign:"center",color:"#374151",fontSize:14}}>No blocked tables</div> :
                blocked.map((b,i)=>(
                  <div key={b.id} style={{padding:"14px 16px",borderBottom:"1px solid #1a1a30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{background:"#2b0a0a",border:"1px solid #991b1b",borderRadius:6,padding:"2px 8px",fontSize:13,fontWeight:700,color:"#ef4444"}}>{b.table_id}</span>
                        <span style={{fontSize:13,color:"#e2e8f0"}}>{fmtDate(b.date)}</span>
                      </div>
                      <div style={{fontSize:12,color:"#64748b"}}>
                        {b.session} {b.start_time&&b.end_time?`· ${b.start_time}–${b.end_time}`:""} {b.reason?`· ${b.reason}`:""}
                      </div>
                    </div>
                    <button onClick={()=>removeBlock(b.id)} style={{background:"#2b0a0a",color:"#ef4444",border:"1px solid #991b1b",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MOBILE Bottom Navigation */}
      {isMobile && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f0f1c",borderTop:"1px solid #1a1a30",display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>setView(item.id)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 4px",border:"none",background:"transparent",cursor:"pointer",color:view===item.id?"#a78bfa":"#475569",WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:20,marginBottom:2}}>{item.icon}</span>
              <span style={{fontSize:10,fontWeight:view===item.id?700:400}}>{item.label}</span>
              {view===item.id && <div style={{width:4,height:4,borderRadius:"50%",background:"#7c3aed",marginTop:3}}/>}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
