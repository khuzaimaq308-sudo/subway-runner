import { useState, useEffect } from "react";

interface LeaderEntry {
  rank: number;
  userId: string;
  username: string;
  totalWatches: number;
  totalScore: number;
  totalCoins: number;
  gamesPlayed: number;
  lastPlayed: string | null;
}

const PRIZES: Record<number, { pkr: string; color: string; medal: string; glow: string }> = {
  1: { pkr: "10,000", color: "#FFD700", medal: "🥇", glow: "rgba(255,215,0,0.5)" },
  2: { pkr: "5,000",  color: "#C0C0C0", medal: "🥈", glow: "rgba(192,192,192,0.4)" },
  3: { pkr: "2,000",  color: "#CD7F32", medal: "🥉", glow: "rgba(205,127,50,0.4)" },
};

/* ── Month display ─────────────────────────────────────────────── */
function getMonthLabel() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
  const days = end.getDate() - now.getDate();
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return { month: names[now.getMonth()], year: now.getFullYear(), daysLeft: days };
}

/* ── Top-3 podium card ─────────────────────────────────────────── */
function PodiumCard({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const p = PRIZES[rank];
  const heights = { 1: 90, 2: 70, 3: 55 };
  const order   = { 1: 2, 2: 1, 3: 3 };
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      order: order[rank as 1|2|3],
    }}>
      {/* Medal + name */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24 }}>{p.medal}</div>
        <div style={{
          color: "#fff", fontSize: 12, fontWeight: 700, maxWidth: 80,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textShadow: `0 0 10px ${p.glow}`,
        }}>
          {entry.username}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 2 }}>
          <span style={{ fontSize: 14 }}>⌚</span>
          <span style={{ color: p.color, fontSize: 13, fontWeight: 800 }}>{entry.totalWatches}</span>
        </div>
      </div>

      {/* Podium block */}
      <div style={{
        width: 72, height: heights[rank as 1|2|3],
        background: `linear-gradient(180deg, ${p.color}44 0%, ${p.color}22 100%)`,
        border: `1.5px solid ${p.color}66`,
        borderRadius: "8px 8px 0 0",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 3, boxShadow: `0 0 20px ${p.glow}`,
      }}>
        <span style={{ color: p.color, fontWeight: 900, fontSize: 15 }}>#{rank}</span>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: p.color, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>PRIZE</div>
          <div style={{ color: p.color, fontSize: 11, fontWeight: 800 }}>₨{p.pkr}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Row for rank 4+ ────────────────────────────────────────────── */
function LeaderRow({ entry }: { entry: LeaderEntry }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 12px", borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,215,0,0.08)",
    }}>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, minWidth: 22 }}>#{entry.rank}</span>
      <span style={{ flex: 1, color: "#ddd", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.username}</span>
      <span style={{ fontSize: 12 }}>⌚</span>
      <span style={{ color: "#FFD700", fontSize: 12, fontWeight: 800, minWidth: 28, textAlign: "right" }}>{entry.totalWatches}</span>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { month, year, daysLeft } = getMonthLabel();

  const fetchData = () => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setEntries(j.data);
          setLastUpdate(new Date());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, []);

  const top3   = entries.slice(0, 3);
  const rest   = entries.slice(3);

  return (
    <div style={{
      width: 260, maxHeight: "82vh",
      background: "linear-gradient(160deg, rgba(10,8,25,0.96) 0%, rgba(25,15,45,0.97) 100%)",
      border: "1px solid rgba(255,215,0,0.25)",
      borderRadius: 18,
      backdropFilter: "blur(24px)",
      overflow: "hidden",
      boxShadow: "0 0 60px rgba(255,215,0,0.12), 0 24px 60px rgba(0,0,0,0.6)",
      fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        background: "linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,100,50,0.06) 100%)",
        borderBottom: "1px solid rgba(255,215,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⌚</span>
          <div>
            <div style={{ color: "#FFD700", fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>WATCH HUNT</div>
            <div style={{ color: "rgba(255,215,0,0.55)", fontSize: 10, letterSpacing: 0.5 }}>LEADERBOARD</div>
          </div>
          {/* Live dot */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#44ff88", boxShadow: "0 0 6px #44ff88", animation: "livePulse 1.4s ease-in-out infinite" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>LIVE</span>
          </div>
        </div>

        {/* Event info */}
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 8,
          background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.15)",
        }}>
          <div style={{ color: "#FFD700", fontSize: 11, fontWeight: 700 }}>🏆 {month} {year} Event</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 2 }}>
            Collect the most watches to win prizes! {daysLeft > 0 ? `${daysLeft} days left` : "Ends today!"}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
            {[["1st","10K"],["2nd","5K"],["3rd","2K"]].map(([pos, amt]) => (
              <div key={pos} style={{ flex:1, textAlign:"center", background:"rgba(255,215,0,0.08)", borderRadius:5, padding:"3px 0" }}>
                <div style={{ color:"rgba(255,215,0,0.7)", fontSize:8 }}>{pos}</div>
                <div style={{ color:"#FFD700", fontSize:10, fontWeight:800 }}>₨{amt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 8px" }}>
        {loading ? (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", padding:"30px 0", fontSize:12 }}>
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⌚</div>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:12 }}>No players yet!</div>
            <div style={{ color:"rgba(255,255,255,0.2)", fontSize:10, marginTop:4 }}>Be the first to play</div>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:6, marginBottom:12, paddingTop:4 }}>
                {top3.map((e) => (
                  <PodiumCard key={e.userId} entry={e} rank={Number(e.rank)} />
                ))}
              </div>
            )}

            {/* Separator */}
            {rest.length > 0 && (
              <div style={{ height:1, background:"rgba(255,215,0,0.1)", marginBottom:8 }} />
            )}

            {/* Rest */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {rest.map((e) => <LeaderRow key={e.userId} entry={e} />)}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"6px 14px", borderTop:"1px solid rgba(255,215,0,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ color:"rgba(255,255,255,0.2)", fontSize:9 }}>
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : "Fetching…"}
        </span>
        <span style={{ color:"rgba(255,215,0,0.4)", fontSize:9 }}>PKR prizes</span>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity:1; transform:scale(1); }
          50%       { opacity:0.4; transform:scale(0.7); }
        }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,215,0,0.25); border-radius:4px; }
      `}</style>
    </div>
  );
}
