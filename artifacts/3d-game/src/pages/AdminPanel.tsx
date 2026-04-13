import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";

const ADMIN_EMAIL = "khuzaimaq308@gmail.com";

/* ── Types ─────────────────────────────────────────────────────── */
interface UserRow {
  id: number; userId: string; email: string; username: string;
  totalWatches: number; totalScore: number; totalCoins: number;
  gamesPlayed: number; lastPlayed: string | null;
}
interface CompetitionData {
  id: number; competitionName: string; endDate: string;
  prize1: string; prize2: string; prize3: string; isActive: boolean;
}
interface MediaItem {
  id: number; title: string; mediaType: string; url: string;
  isActive: boolean; createdAt: string;
}

type TabKey = "players" | "competition" | "media";

/* ── Sub-components ─────────────────────────────────────────────── */
function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ background:"rgba(255,215,0,0.07)", border:"1px solid rgba(255,215,0,0.2)", borderRadius:12, padding:"16px 20px", minWidth:130 }}>
      <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
      <div style={{ color:"#FFD700", fontSize:20, fontWeight:800 }}>{value}</div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ── Players tab ─────────────────────────────────────────────────── */
function PlayersTab({ users, loading }: { users: UserRow[]; loading: boolean }) {
  const totalWatches = users.reduce((s, u) => s + u.totalWatches, 0);
  const totalGames   = users.reduce((s, u) => s + u.gamesPlayed, 0);
  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
        <StatCard icon="👥" label="Total Players"     value={users.length} />
        <StatCard icon="⌚" label="Watches Collected" value={totalWatches} />
        <StatCard icon="🎮" label="Games Played"      value={totalGames} />
        <StatCard icon="🏆" label="Top Player"        value={users[0]?.username ?? "—"} />
      </div>
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,215,0,0.1)", display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#FFD700", fontWeight:700, fontSize:14 }}>All Players</span>
          <span style={{ color:"rgba(255,255,255,0.3)", fontSize:11 }}>{users.length} registered</span>
        </div>
        {loading ? <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>Loading…</div>
          : users.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>No players yet.</div>
          : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"rgba(255,215,0,0.05)" }}>
                  {["Rank","Username","Email","Watches ⌚","Score","Coins","Games","Last Played"].map(h=>(
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:"rgba(255,215,0,0.6)", fontWeight:600, fontSize:11, letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.userId} style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,215,0,0.04)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <td style={{ padding:"10px 16px", color:i<3?["#FFD700","#C0C0C0","#CD7F32"][i]:"rgba(255,255,255,0.4)", fontWeight:700 }}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                    </td>
                    <td style={{ padding:"10px 16px", fontWeight:600 }}>{u.username}</td>
                    <td style={{ padding:"10px 16px", color:"rgba(255,255,255,0.45)", fontSize:12 }}>{u.email}</td>
                    <td style={{ padding:"10px 16px", color:"#FFD700", fontWeight:700 }}>{u.totalWatches}</td>
                    <td style={{ padding:"10px 16px", color:"#88EEAA" }}>{u.totalScore.toLocaleString()}</td>
                    <td style={{ padding:"10px 16px", color:"rgba(255,255,255,0.5)" }}>{u.totalCoins}</td>
                    <td style={{ padding:"10px 16px", color:"rgba(255,255,255,0.5)" }}>{u.gamesPlayed}</td>
                    <td style={{ padding:"10px 16px", color:"rgba(255,255,255,0.3)", fontSize:11 }}>
                      {u.lastPlayed ? new Date(u.lastPlayed).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Competition tab ─────────────────────────────────────────────── */
function CompetitionTab() {
  const [comp, setComp]   = useState<CompetitionData | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");

  // Form state
  const [name,  setName]   = useState("");
  const [p1,    setP1]     = useState("");
  const [p2,    setP2]     = useState("");
  const [p3,    setP3]     = useState("");
  const [days,  setDays]   = useState("45");
  const [useDate, setUseDate] = useState(false);
  const [dateVal, setDateVal] = useState("");

  useEffect(() => {
    fetch("/api/admin/competition", { credentials:"include" })
      .then(r => r.json()).then(j => {
        if (j.success && j.data) {
          const d = j.data;
          setComp(d);
          setName(d.competitionName);
          setP1(d.prize1); setP2(d.prize2); setP3(d.prize3);
          const endD = new Date(d.endDate);
          setDateVal(endD.toISOString().slice(0,10));
          const dLeft = Math.ceil((endD.getTime() - Date.now()) / 86400000);
          setDays(String(Math.max(1, dLeft)));
        }
      }).catch(()=>{});
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    const body: Record<string, unknown> = { competitionName: name, prize1: p1, prize2: p2, prize3: p3 };
    if (useDate) body.endDate = dateVal;
    else body.daysFromNow = Number(days);

    const r = await fetch("/api/admin/competition", {
      method:"PUT", credentials:"include",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    }).then(r=>r.json());
    setSaving(false);
    if (r.success) { setMsg("✅ Competition updated!"); setTimeout(()=>setMsg(""), 3000); }
    else setMsg("❌ " + r.error);
  };

  const daysLeft = comp ? Math.ceil((new Date(comp.endDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Current status */}
      {comp && (
        <div style={{ background:"rgba(255,215,0,0.07)", border:"1px solid rgba(255,215,0,0.2)", borderRadius:14, padding:"18px 22px" }}>
          <div style={{ color:"rgba(255,215,0,0.5)", fontSize:11, letterSpacing:1, marginBottom:8 }}>CURRENT COMPETITION</div>
          <div style={{ color:"#FFD700", fontSize:20, fontWeight:800 }}>{comp.competitionName}</div>
          <div style={{ display:"flex", gap:24, marginTop:10, flexWrap:"wrap" }}>
            <div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>Ends on</div>
              <div style={{ color:"#fff", fontWeight:600 }}>{new Date(comp.endDate).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</div>
            </div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>Days remaining</div>
              <div style={{ color: daysLeft && daysLeft > 7 ? "#88EEAA" : "#FF6655", fontWeight:700, fontSize:18 }}>
                {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : "Ended") : "—"}
              </div>
            </div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>Prizes</div>
              <div style={{ color:"#FFD700", fontWeight:600 }}>₨{comp.prize1} / ₨{comp.prize2} / ₨{comp.prize3}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit form */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,0.12)", borderRadius:14, padding:"22px 24px" }}>
        <div style={{ color:"rgba(255,215,0,0.6)", fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:18 }}>UPDATE COMPETITION</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Name */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Competition Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="e.g. Watch Hunt May 2026" />
          </div>
          {/* Prizes */}
          <div>
            <label style={lbl}>1st Prize (PKR)</label>
            <input value={p1} onChange={e=>setP1(e.target.value)} style={inp} placeholder="10,000" />
          </div>
          <div>
            <label style={lbl}>2nd Prize (PKR)</label>
            <input value={p2} onChange={e=>setP2(e.target.value)} style={inp} placeholder="5,000" />
          </div>
          <div>
            <label style={lbl}>3rd Prize (PKR)</label>
            <input value={p3} onChange={e=>setP3(e.target.value)} style={inp} placeholder="2,000" />
          </div>
          {/* End date */}
          <div>
            <label style={lbl}>End Date Method</label>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={()=>setUseDate(false)} style={{ ...tabBtn, background: !useDate ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)", borderColor: !useDate ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)" }}>Days from now</button>
              <button onClick={()=>setUseDate(true)} style={{ ...tabBtn, background: useDate ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)", borderColor: useDate ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)" }}>Specific date</button>
            </div>
          </div>
          <div>
            {!useDate ? (
              <>
                <label style={lbl}>Days from today</label>
                <input type="number" min="1" max="365" value={days} onChange={e=>setDays(e.target.value)} style={inp} />
              </>
            ) : (
              <>
                <label style={lbl}>End Date</label>
                <input type="date" value={dateVal} onChange={e=>setDateVal(e.target.value)} style={inp} />
              </>
            )}
          </div>
        </div>
        {msg && <div style={{ marginTop:12, padding:"8px 14px", borderRadius:8, background: msg.startsWith("✅") ? "rgba(80,200,80,0.1)" : "rgba(255,80,80,0.1)", color: msg.startsWith("✅") ? "#88FF88" : "#FF8888", fontSize:13 }}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{
          marginTop:18, padding:"12px 32px", borderRadius:10,
          background: saving ? "rgba(255,215,0,0.1)" : "linear-gradient(135deg,#FFB800,#FF8C00)",
          border:"none", color: saving ? "rgba(255,255,255,0.4)" : "#000",
          fontWeight:800, fontSize:14, cursor: saving ? "not-allowed" : "pointer",
        }}>
          {saving ? "Saving…" : "💾 Save Competition"}
        </button>
      </div>
    </div>
  );
}

/* ── Media tab ───────────────────────────────────────────────────── */
function MediaTab() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle]     = useState("");
  const [url,   setUrl]       = useState("");
  const [type,  setType]      = useState<"image"|"video"|"link">("image");
  const [adding, setAdding]   = useState(false);
  const [msg, setMsg]         = useState("");

  const fetchItems = () => {
    fetch("/api/admin/media", { credentials:"include" })
      .then(r=>r.json()).then(j=>{ if(j.success) setItems(j.data); })
      .catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ fetchItems(); }, []);

  const addItem = async () => {
    if (!title.trim() || !url.trim()) { setMsg("❌ Title and URL are required"); return; }
    setAdding(true); setMsg("");
    const r = await fetch("/api/admin/media", {
      method:"POST", credentials:"include",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ title, mediaType: type, url }),
    }).then(r=>r.json());
    setAdding(false);
    if (r.success) { setTitle(""); setUrl(""); setMsg("✅ Added!"); fetchItems(); setTimeout(()=>setMsg(""),2500); }
    else setMsg("❌ " + r.error);
  };

  const deleteItem = async (id: number) => {
    await fetch(`/api/admin/media/${id}`, { method:"DELETE", credentials:"include" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleItem = async (id: number) => {
    await fetch(`/api/admin/media/${id}/toggle`, { method:"PATCH", credentials:"include" });
    fetchItems();
  };

  const typeIcon: Record<string, string> = { image:"🖼️", video:"🎬", link:"🔗" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Add form */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,0.12)", borderRadius:14, padding:"22px 24px" }}>
        <div style={{ color:"rgba(255,215,0,0.6)", fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:18 }}>ADD MEDIA / ANNOUNCEMENT</div>
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          {(["image","video","link"] as const).map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{
              ...tabBtn, flex:1,
              background: type===t ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)",
              borderColor: type===t ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)",
              color: type===t ? "#FFD700" : "rgba(255,255,255,0.5)",
            }}>
              {typeIcon[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
          <div>
            <label style={lbl}>Title / Caption</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} style={inp} placeholder="e.g. Tournament Banner" />
          </div>
          <div>
            <label style={lbl}>{type==="link" ? "URL / Link" : type==="video" ? "Video URL (mp4, YouTube, etc.)" : "Image URL"}</label>
            <input value={url} onChange={e=>setUrl(e.target.value)} style={inp} placeholder={type==="image" ? "https://example.com/image.jpg" : type==="video" ? "https://example.com/video.mp4" : "https://example.com"} />
          </div>
        </div>
        {msg && <div style={{ marginTop:10, padding:"7px 12px", borderRadius:7, background: msg.startsWith("✅") ? "rgba(80,200,80,0.1)" : "rgba(255,80,80,0.1)", color: msg.startsWith("✅") ? "#88FF88" : "#FF8888", fontSize:13 }}>{msg}</div>}
        <button onClick={addItem} disabled={adding} style={{
          marginTop:14, padding:"11px 28px", borderRadius:10,
          background:"linear-gradient(135deg,#FFB800,#FF8C00)", border:"none",
          color:"#000", fontWeight:800, fontSize:13, cursor: adding ? "not-allowed" : "pointer",
        }}>
          {adding ? "Adding…" : "＋ Add Item"}
        </button>
      </div>

      {/* Items list */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,0.12)", borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,215,0,0.1)", color:"#FFD700", fontWeight:700, fontSize:14 }}>
          Media Library ({items.length})
        </div>
        {loading ? <div style={{ padding:30, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>Loading…</div>
          : items.length===0 ? <div style={{ padding:30, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>No media yet. Add something above.</div>
          : (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {items.map((item)=>(
              <div key={item.id} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,0.04)",
                opacity: item.isActive ? 1 : 0.45,
              }}>
                <span style={{ fontSize:22 }}>{typeIcon[item.mediaType] ?? "📄"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"#fff", fontWeight:600, fontSize:13 }}>{item.title}</div>
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ color:"rgba(255,215,0,0.5)", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", maxWidth:"100%" }}>
                    {item.url}
                  </a>
                  <div style={{ color:"rgba(255,255,255,0.25)", fontSize:10, marginTop:2 }}>
                    {new Date(item.createdAt).toLocaleDateString()} · {item.mediaType}
                  </div>
                </div>
                {/* Preview */}
                {item.mediaType==="image" && (
                  <img src={item.url} alt={item.title} style={{ width:56, height:40, objectFit:"cover", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)" }} onError={e=>((e.target as HTMLImageElement).style.display="none")} />
                )}
                {/* Toggle / Delete */}
                <button onClick={()=>toggleItem(item.id)} title={item.isActive ? "Deactivate" : "Activate"} style={{ ...actionBtn, background: item.isActive ? "rgba(255,215,0,0.1)" : "rgba(80,200,80,0.1)", border: `1px solid ${item.isActive ? "rgba(255,215,0,0.3)" : "rgba(80,200,80,0.3)"}` }}>
                  {item.isActive ? "⏸" : "▶"}
                </button>
                <button onClick={()=>deleteItem(item.id)} title="Delete" style={{ ...actionBtn, background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.3)" }}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Shared micro-styles ─────────────────────────────────────────── */
const lbl: React.CSSProperties = { display:"block", color:"rgba(255,255,255,0.45)", fontSize:11, fontWeight:600, letterSpacing:0.5, marginBottom:6 };
const inp: React.CSSProperties = { width:"100%", padding:"9px 12px", borderRadius:8, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,215,0,0.2)", color:"#fff", fontSize:13, outline:"none", boxSizing:"border-box" };
const tabBtn: React.CSSProperties = { padding:"8px 16px", borderRadius:8, border:"1px solid", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"system-ui", transition:"all 0.15s" };
const actionBtn: React.CSSProperties = { width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 };

/* ── Main AdminPanel ─────────────────────────────────────────────── */
export function AdminPanel() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabKey>("players");
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const detectedEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim() ?? "";
  const allEmails     = user?.emailAddresses?.map(e => e.emailAddress?.toLowerCase().trim()) ?? [];
  const isAdmin       = isLoaded && (
    detectedEmail === ADMIN_EMAIL.toLowerCase() ||
    allEmails.some(e => e === ADMIN_EMAIL.toLowerCase())
  );

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users", { credentials:"include" })
      .then(r=>r.json()).then(j=>{ if(j.success) setUsers(j.data); })
      .catch(()=>{}).finally(()=>setLoadingUsers(false));
  }, [isAdmin]);

  if (!isLoaded) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#060614", color:"#fff", fontFamily:"system-ui" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:36, marginBottom:12 }}>⌚</div><div>Loading…</div></div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#060614,#100820)", flexDirection:"column", gap:16, fontFamily:"system-ui" }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ color:"#FF4466", fontSize:22, fontWeight:700 }}>Please sign in first</div>
      <a href="/" style={{ color:"#FFD700", fontSize:13 }}>← Back to game</a>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#060614,#100820)", flexDirection:"column", gap:16, fontFamily:"system-ui", padding:40 }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ color:"#FF4466", fontSize:22, fontWeight:700 }}>Access Denied</div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, textAlign:"center" }}>This page is only for the admin account.</div>
      <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 20px", marginTop:8 }}>
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginBottom:4 }}>Logged in as:</div>
        <div style={{ color:"#fff", fontSize:14, fontWeight:600 }}>{user.fullName || user.username || "—"}</div>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{detectedEmail || "no email found"}</div>
        {allEmails.length > 1 && <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginTop:4 }}>All: {allEmails.join(", ")}</div>}
      </div>
      <a href="/" style={{ marginTop:8, color:"#FFD700", fontSize:13 }}>← Back to game</a>
    </div>
  );

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key:"players",     icon:"👥", label:"Players" },
    { key:"competition", icon:"🏆", label:"Competition" },
    { key:"media",       icon:"🎬", label:"Media" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#060614 0%,#100820 50%,#060e1e 100%)", fontFamily:"system-ui,sans-serif", color:"#fff", padding:"32px 40px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:36 }}>⌚</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:"#FFD700" }}>Admin Panel</h1>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginTop:2 }}>Subway Runner · {detectedEmail}</div>
          </div>
        </div>
        <a href="/" style={{ padding:"8px 20px", borderRadius:8, background:"rgba(255,215,0,0.1)", border:"1px solid rgba(255,215,0,0.3)", color:"#FFD700", textDecoration:"none", fontSize:13, fontWeight:600 }}>← Back to Game</a>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
            padding:"10px 22px", borderRadius:10, cursor:"pointer", border:"1px solid",
            borderColor: activeTab===t.key ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)",
            background: activeTab===t.key ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)",
            color: activeTab===t.key ? "#FFD700" : "rgba(255,255,255,0.55)",
            fontWeight:700, fontSize:13, transition:"all 0.15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab==="players"     && <PlayersTab users={users} loading={loadingUsers} />}
      {activeTab==="competition" && <CompetitionTab />}
      {activeTab==="media"       && <MediaTab />}
    </div>
  );
}
