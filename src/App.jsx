import { useState, useEffect } from "react";

const WEBHOOK_URL = "https://signalcraftai.app.n8n.cloud/webhook/manager-api";
const UPDATE_URL = "https://signalcraftai.app.n8n.cloud/webhook/manager-update";

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
  const d = new Date(); d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
};
const fmtDate = (s) => {
  if (!s) return "";
  return new Date(s+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
};
const toMin = (t) => { if(!t) return 0; const [h,m]=t.split(":").map(Number); return h*60+m; };

const TODAY = toDateStr(0), TMR = toDateStr(1), DAT = toDateStr(2);
const DATES = [
  {label:"Today",    sub:fmtDate(TODAY), val:TODAY},
  {label:"Tomorrow", sub:fmtDate(TMR),   val:TMR},
  {label:fmtDate(DAT), sub:"",           val:DAT},
];

const LUNCH  = { start:720,  end:870,  label:"Lunch" };
const DINNER = { start:1080, end:1320, label:"Dinner" };

const SC = {
  Confirmed:{ bg:"#0d2b1a", text:"#22c55e", border:"#166534" },
  Pending:  { bg:"#2b1f05", text:"#f59e0b", border:"#92400e" },
  Cancelled:{ bg:"#2b0a0a", text:"#ef4444", border:"#991b1b" },
};

export default function App() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [date, setDate]                 = useState(TODAY);
  const [view, setView]                 = useState("timeline");
  const [session, setSession]           = useState("lunch");
  const [detail, setDetail]             = useState(null);
  const [toast, setToast]               = useState(null);
  const [now, setNow]                   = useState(new Date());

  useEffect(() => {
    fetchReservations();
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(WEBHOOK_URL);
      const data = await res.json();
      setReservations(data.reservations || []);
    } catch (e) {
      setError("Could not load reservations. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setReservations(prev => prev.map(r => r.id === id ? {...r, status} : r));
      showToast(status === "Confirmed" ? "✅ Confirmed" : "❌ Cancelled");
      setDetail(null);
      await fetch(UPDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
    } catch (e) {
      showToast("Update failed — please retry", "err");
      fetchReservations();
    }
  };

  const showToast = (msg, type="ok") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const dayRes  = reservations.filter(r => r.date === date && r.status !== "Cancelled");
  const allDay  = reservations.filter(r => r.date === date);
  const sess    = session === "lunch" ? LUNCH : DINNER;
  const sessW   = sess.end - sess.start;

  const stats = {
    total:    allDay.length,
    confirmed:allDay.filter(r=>r.status==="Confirmed").length,
    pending:  allDay.filter(r=>r.status==="Pending").length,
    cancelled:allDay.filter(r=>r.status==="Cancelled").length,
  };

  const nowMin  = now.getHours()*60+now.getMinutes();
  const nowPct  = date===TODAY ? Math.min(100,Math.max(0,(nowMin-sess.start)/sessW*100)) : null;
  const inSess  = date===TODAY && nowMin>=sess.start && nowMin<=sess.end;

  const inSession  = (r) => toMin(r.end_time)>sess.start && toMin(r.start_time)<sess.end;
  const leftPct    = (r) => Math.max(0,(toMin(r.start_time)-sess.start)/sessW*100);
  const widthPct   = (r) => Math.min(100,(toMin(r.end_time)-Math.max(toMin(r.start_time),sess.start))/sessW*100);

  const getFloorStatus = (tableId) => {
    const res = dayRes.find(r => r.table === tableId);
    if (!res) return { color:"#22c55e", label:"Free" };
    if (res.status === "Pending")   return { color:"#f59e0b", label:res.name?.split(" ")[0] };
    return { color:"#ef4444", label:res.name?.split(" ")[0] };
  };

  const slotSummary = () => {
    const booked = dayRes.filter(r => inSession(r)).map(r => r.table);
    const unique  = [...new Set(booked)];
    return { booked: unique.length, free: TABLES.length - unique.length };
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0b0b14",color:"#a78bfa",flexDirection:"column",gap:16}}>
      <div style={{fontSize:32}}>⚡</div>
      <div style={{fontSize:14,color:"#64748b"}}>Loading reservations...</div>
    </div>
  );

  if (error) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0b0b14",color:"#ef4444",flexDirection:"column",gap:16}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontSize:14}}>{error}</div>
      <button onClick={fetchReservations} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer",fontSize:14}}>Retry</button>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:"#0b0b14",color:"#e2e8f0",fontFamily:"system-ui,sans-serif",overflow:"hidden",position:"relative"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:16,right:16,zIndex:999,background:toast.type==="ok"?"#0d2b1a":"#2b0a0a",border:`1px solid ${toast.type==="ok"?"#166534":"#991b1b"}`,color:toast.type==="ok"?"#22c55e":"#ef4444",borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:700,boxShadow:"0 8px 32px #0009"}}>
          {toast.msg}
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setDetail(null)}>
          <div style={{background:"#13131f",border:"1px solid #2a2a45",borderRadius:16,padding:28,width:400,boxShadow:"0 24px 64px #000a"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <span style={{fontWeight:800,fontSize:16}}>Reservation — {detail.res_id}</span>
              <button onClick={()=>setDetail(null)} style={{background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {[["Name",detail.name],["Phone",detail.phone],["Email",detail.email||"—"],["Date",detail.date],["Time",`${detail.start_time} → ${detail.end_time}`],["Guests",detail.guests],["Table",detail.table],["Notes",detail.notes||"—"],["Status",detail.status]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e1e3a",fontSize:13}}>
                <span style={{color:"#64748b"}}>{k}</span>
                <span style={{fontWeight:600,color:k==="Status"?SC[v]?.text:"#e2e8f0"}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>updateStatus(detail.id,"Confirmed")} style={{flex:1,background:"#166534",color:"#22c55e",border:"none",borderRadius:8,padding:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Confirm</button>
              <button onClick={()=>updateStatus(detail.id,"Cancelled")} style={{flex:1,background:"#991b1b",color:"#ef4444",border:"none",borderRadius:8,padding:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>✗ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{width:200,background:"#0f0f1c",borderRight:"1px solid #1a1a30",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 16px 16px",borderBottom:"1px solid #1a1a30"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#7c3aed,#4338ca)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:"#fff"}}>SignalCraft</div>
              <div style={{fontSize:9,color:"#7c3aed",fontWeight:700,letterSpacing:2}}>AI MANAGER</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:"12px 8px"}}>
          {[{id:"timeline",icon:"⏱",label:"Timeline"},{id:"list",icon:"📋",label:"Reservations"},{id:"floor",icon:"🪑",label:"Floor Map"}].map(item=>(
            <button key={item.id} onClick={()=>setView(item.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:3,background:view===item.id?"#7c3aed22":"transparent",color:view===item.id?"#a78bfa":"#64748b",fontWeight:view===item.id?700:400,fontSize:13,textAlign:"left",borderLeft:`2px solid ${view===item.id?"#7c3aed":"transparent"}`}}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 16px",borderTop:"1px solid #1a1a30"}}>
          <button onClick={fetchReservations} style={{width:"100%",background:"#1e1e3a",border:"none",color:"#94a3b8",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}}>🔄 Refresh</button>
          <div style={{fontSize:10,color:"#1e293b",marginTop:8}}>La Bella Roma · London</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Topbar */}
        <div style={{height:56,background:"#0f0f1c",borderBottom:"1px solid #1a1a30",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0}}>
          <div style={{display:"flex",gap:8}}>
            {DATES.map(d=>(
              <button key={d.val} onClick={()=>setDate(d.val)}
                style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${date===d.val?"#7c3aed":"#1a1a30"}`,background:date===d.val?"#7c3aed22":"transparent",color:date===d.val?"#a78bfa":"#64748b",fontWeight:date===d.val?700:400,fontSize:13,cursor:"pointer"}}>
                {d.label} <span style={{fontSize:11,opacity:0.6}}>{d.sub}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:"#475569"}}>🕐 {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
            <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#4338ca)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13}}>M</div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:20,display:"flex",flexDirection:"column",gap:16}}>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {[
              {label:"Total",     val:stats.total,     icon:"📅",color:"#818cf8"},
              {label:"Confirmed", val:stats.confirmed, icon:"✅",color:"#22c55e"},
              {label:"Pending",   val:stats.pending,   icon:"⏳",color:"#f59e0b"},
              {label:"Cancelled", val:stats.cancelled, icon:"❌",color:"#ef4444"},
            ].map((s,i)=>(
              <div key={i} style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:9,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
                <div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TIMELINE VIEW */}
          {view==="timeline" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:12,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #1a1a30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14}}>Timeline — {fmtDate(date)}</span>
                <div style={{display:"flex",gap:6}}>
                  {["lunch","dinner"].map(s=>(
                    <button key={s} onClick={()=>setSession(s)}
                      style={{padding:"5px 14px",borderRadius:7,border:`1px solid ${session===s?"#7c3aed":"#1a1a30"}`,background:session===s?"#7c3aed22":"transparent",color:session===s?"#a78bfa":"#64748b",fontWeight:session===s?700:400,fontSize:12,cursor:"pointer"}}>
                      {s==="lunch"?"☀️ Lunch":"🌙 Dinner"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{padding:"16px 18px",overflow:"auto"}}>
                <div style={{display:"flex",marginLeft:90,marginBottom:6}}>
                  {Array.from({length:7},(_,i)=>{
                    const m=sess.start+i*(sessW/6);
                    const h=Math.floor(m/60), min=m%60;
                    return <div key={i} style={{flex:1,fontSize:10,color:"#374151"}}>{String(h).padStart(2,"0")}:{String(Math.round(min)).padStart(2,"0")}</div>;
                  })}
                </div>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",inset:0,display:"flex",marginLeft:90,pointerEvents:"none"}}>
                    {Array.from({length:7},(_,i)=><div key={i} style={{flex:1,borderLeft:"1px solid #1a1a30"}}/>)}
                  </div>
                  {nowPct!==null && inSess && (
                    <div style={{position:"absolute",top:0,bottom:0,left:`calc(90px + ${nowPct}% * (100% - 90px) / 100)`,width:2,background:"#7c3aed",zIndex:10,pointerEvents:"none"}}>
                      <div style={{position:"absolute",top:-4,left:-16,fontSize:9,color:"#a78bfa",fontWeight:700,background:"#13131f",padding:"1px 4px",borderRadius:4}}>NOW</div>
                    </div>
                  )}
                  {TABLES.map(t=>{
                    const tRes=dayRes.filter(r=>r.table===t.id && inSession(r));
                    return (
                      <div key={t.id} style={{display:"flex",alignItems:"center",marginBottom:6,height:36}}>
                        <div style={{width:90,flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#a78bfa"}}>{t.id}</span>
                          <span style={{fontSize:10,color:"#374151"}}>{t.capacity}p</span>
                        </div>
                        <div style={{flex:1,position:"relative",height:30,background:"#0f0f1c",borderRadius:6,overflow:"hidden"}}>
                          <div style={{position:"absolute",inset:0,background:"#0d2b1a22",borderRadius:6}}/>
                          {tRes.map(r=>{
                            const lp=leftPct(r), wp=widthPct(r);
                            if(wp<=0) return null;
                            const sc=SC[r.status];
                            return (
                              <div key={r.id} onClick={()=>setDetail(r)}
                                title={`${r.name} · ${r.start_time}–${r.end_time} · ${r.guests} guests`}
                                style={{position:"absolute",top:2,height:"calc(100% - 4px)",left:`${lp}%`,width:`${wp}%`,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",paddingLeft:6,overflow:"hidden",minWidth:4}}>
                                <span style={{fontSize:10,fontWeight:600,color:sc.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                  {wp>8?r.name?.split(" ")[0]:""}
                                </span>
                              </div>
                            );
                          })}
                          {tRes.length===0 && (
                            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:8}}>
                              <span style={{fontSize:10,color:"#22c55e",fontWeight:600}}>Free all {session}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:"1px solid #1a1a30"}}>
                  {Object.entries(SC).map(([s,c])=>(
                    <div key={s} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                      <div style={{width:12,height:12,borderRadius:3,background:c.bg,border:`1px solid ${c.border}`}}/>
                      <span style={{color:c.text}}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {view==="list" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:12,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #1a1a30",fontWeight:700,fontSize:14}}>
                Reservations — {fmtDate(date)}
              </div>
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#0f0f1c"}}>
                      {["ID","Name","Time","Guests","Table","Status","Actions"].map(h=>(
                        <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,color:"#475569",fontWeight:700}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allDay.length===0 ? (
                      <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:"#374151",fontSize:14}}>No reservations for this day</td></tr>
                    ) : allDay.map((r,i)=>{
                      const sc=SC[r.status];
                      return (
                        <tr key={r.id} style={{borderTop:"1px solid #1a1a30",background:i%2===0?"transparent":"#0f0f1c08",cursor:"pointer"}} onClick={()=>setDetail(r)}>
                          <td style={{padding:"11px 14px",fontSize:12,color:"#64748b"}}>{r.res_id}</td>
                          <td style={{padding:"11px 14px",fontSize:13,fontWeight:600}}>{r.name}</td>
                          <td style={{padding:"11px 14px",fontSize:12,color:"#94a3b8"}}>{r.start_time} → {r.end_time}</td>
                          <td style={{padding:"11px 14px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>{r.guests}</td>
                          <td style={{padding:"11px 14px"}}><span style={{background:"#1e1e3a",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700,color:"#a78bfa"}}>{r.table}</span></td>
                          <td style={{padding:"11px 14px"}}><span style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>{r.status}</span></td>
                          <td style={{padding:"11px 14px"}}>
                            <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>updateStatus(r.id,"Confirmed")} style={{background:"#0d2b1a",color:"#22c55e",border:"1px solid #166534",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓</button>
                              <button onClick={()=>updateStatus(r.id,"Cancelled")} style={{background:"#2b0a0a",color:"#ef4444",border:"1px solid #991b1b",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✗</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FLOOR MAP */}
          {view==="floor" && (
            <div style={{background:"#13131f",border:"1px solid #1a1a30",borderRadius:12,overflow:"hidden",flex:1}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #1a1a30",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:14}}>Floor Map — {fmtDate(date)}</span>
                <div style={{display:"flex",gap:10}}>
                  {[["#22c55e","Free"],["#f59e0b","Pending"],["#ef4444","Occupied"]].map(([c,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:20}}>
                <div style={{textAlign:"center",fontSize:11,color:"#374151",background:"#1a1a30",borderRadius:6,padding:"5px",marginBottom:16,maxWidth:200,margin:"0 auto 16px"}}>🚪 Entrance</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,maxWidth:700,margin:"0 auto"}}>
                  {TABLES.map(t=>{
                    const fs=getFloorStatus(t.id);
                    const activeRes=dayRes.find(r=>r.table===t.id);
                    return (
                      <div key={t.id} onClick={()=>activeRes&&setDetail(activeRes)}
                        style={{background:fs.color+"15",border:`2px solid ${fs.color}44`,borderRadius:12,padding:"14px 10px",textAlign:"center",cursor:activeRes?"pointer":"default"}}>
                        <div style={{fontSize:20,marginBottom:4}}>
                          {t.capacity<=2?"🪑":t.capacity<=4?"🍽️":t.capacity<=6?"👥":"🏛️"}
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:fs.color}}>{t.id}</div>
                        <div style={{fontSize:10,color:"#475569",marginTop:2}}>{t.capacity}p · {t.location}</div>
                        {activeRes && (
                          <div style={{fontSize:9,color:fs.color,marginTop:4,fontWeight:600}}>
                            {activeRes.name?.split(" ")[0]}<br/>{activeRes.start_time}–{activeRes.end_time}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:16,padding:12,background:"#0f0f1c",borderRadius:8,maxWidth:700,margin:"16px auto 0"}}>
                  <div style={{fontSize:11,color:"#475569",marginBottom:6}}>Capacity</div>
                  {(()=>{
                    const {booked,free}=slotSummary();
                    const pct=Math.round((booked/TABLES.length)*100);
                    return (
                      <>
                        <div style={{height:6,background:"#1a1a30",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:pct>70?"#ef4444":pct>40?"#f59e0b":"#22c55e",borderRadius:3,transition:"width 0.4s"}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:5}}>
                          <span style={{color:"#22c55e"}}>{free} free</span>
                          <span style={{color:"#64748b"}}>{pct}% full</span>
                          <span style={{color:"#ef4444"}}>{booked} taken</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
