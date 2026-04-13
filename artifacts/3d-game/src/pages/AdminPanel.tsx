import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";

const ADMIN_EMAIL = "khuzaimaq308@gmail.com";

interface UserRow {
  id: number;
  userId: string;
  email: string;
  username: string;
  totalWatches: number;
  totalScore: number;
  totalCoins: number;
  gamesPlayed: number;
  lastPlayed: string | null;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{
      background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.2)",
      borderRadius: 12, padding: "16px 20px", minWidth: 130,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ color: "#FFD700", fontSize: 20, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function AdminPanel() {
  const { user, isLoaded } = useUser();
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = isLoaded && email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((j) => { if (j.success) setUsers(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isLoaded) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#060614", color:"#fff" }}>
      Loading…
    </div>
  );

  if (!isAdmin) return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#060614,#100820)",
      flexDirection:"column", gap:16, fontFamily:"system-ui",
    }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ color:"#FF4466", fontSize:22, fontWeight:700 }}>Access Denied</div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14 }}>This page is only for admins.</div>
      <a href="/" style={{ marginTop:8, color:"#FFD700", fontSize:13 }}>← Back to game</a>
    </div>
  );

  const totalWatches = users.reduce((s, u) => s + u.totalWatches, 0);
  const totalGames   = users.reduce((s, u) => s + u.gamesPlayed, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #060614 0%, #100820 50%, #060e1e 100%)",
      fontFamily: "system-ui, sans-serif", color: "#fff",
      padding: "32px 40px",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:36 }}>⌚</div>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:"#FFD700" }}>Admin Panel</h1>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginTop:2 }}>Subway Runner · Watch Hunt Event</div>
          </div>
        </div>
        <a href="/" style={{
          padding:"8px 20px", borderRadius:8, background:"rgba(255,215,0,0.1)",
          border:"1px solid rgba(255,215,0,0.3)", color:"#FFD700", textDecoration:"none",
          fontSize:13, fontWeight:600,
        }}>← Back to Game</a>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:16, marginBottom:32, flexWrap:"wrap" }}>
        <StatCard icon="👥" label="Total Players"  value={users.length} />
        <StatCard icon="⌚" label="Watches Collected" value={totalWatches} />
        <StatCard icon="🎮" label="Games Played"   value={totalGames} />
        <StatCard icon="🏆" label="Top Player" value={users[0]?.username ?? "—"} />
      </div>

      {/* Users table */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,215,0,0.15)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,215,0,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ color:"#FFD700", fontWeight:700, fontSize:14 }}>Player Leaderboard</div>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11 }}>{users.length} players</div>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.3)" }}>Loading players…</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"rgba(255,215,0,0.05)" }}>
                  {["Rank","Username","Email","Watches","Score","Coins","Games","Last Played"].map((h) => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:"rgba(255,215,0,0.6)", fontWeight:600, fontSize:11, letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.userId} style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding:"10px 16px", color: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : "rgba(255,255,255,0.4)", fontWeight:700 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td style={{ padding:"10px 16px", fontWeight:600 }}>{u.username}</td>
                    <td style={{ padding:"10px 16px", color:"rgba(255,255,255,0.45)", fontSize:12 }}>{u.email}</td>
                    <td style={{ padding:"10px 16px", color:"#FFD700", fontWeight:700 }}>{u.totalWatches} ⌚</td>
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

      <div style={{ marginTop:20, color:"rgba(255,255,255,0.15)", fontSize:11 }}>
        Admin: {email} · More management features coming soon
      </div>
    </div>
  );
}
