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

const PRIZES: Record<number, { pkr: string; color: string; medal: string; glow: string; label: string }> = {
  1: { pkr: "10,000", color: "#FFD700", medal: "🥇", glow: "#FFD700", label: "1st Place" },
  2: { pkr: "5,000",  color: "#C8C8D4", medal: "🥈", glow: "#C0C0C0", label: "2nd Place" },
  3: { pkr: "2,000",  color: "#E8A070", medal: "🥉", glow: "#CD7F32", label: "3rd Place" },
};

interface CompetitionInfo {
  competitionName: string;
  endDate: string;
  prize1: string;
  prize2: string;
  prize3: string;
}

/* ─── Animated glowing box for top-3 ──────────────────────────────────── */
function TopThreeCard({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const p       = PRIZES[rank];
  const isFirst = rank === 1;
  const sizes   = { 1: { h: 220, avatarSize: 70 }, 2: { h: 185, avatarSize: 58 }, 3: { h: 165, avatarSize: 52 } };
  const sz      = sizes[rank as 1|2|3];

  /* Pulsing glow keyframe injected once */
  const kfName = `glow${rank}`;

  return (
    <>
      <style>{`
        @keyframes ${kfName} {
          0%,100% { box-shadow: 0 0 18px 4px ${p.glow}55, 0 0 40px 8px ${p.glow}22; }
          50%      { box-shadow: 0 0 30px 8px ${p.glow}88, 0 0 60px 14px ${p.glow}44; }
        }
        @keyframes floatCard${rank} {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(${isFirst ? "-6px" : "-4px"}); }
        }
        @keyframes watchSpin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
      `}</style>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        flex: isFirst ? "0 0 220px" : "0 0 180px",
        animation: `floatCard${rank} ${isFirst ? 3 : 3.8}s ease-in-out infinite`,
        order: rank === 2 ? 1 : rank === 1 ? 2 : 3,
        position: "relative",
      }}>
        {/* "WINNER" crown for rank 1 */}
        {isFirst && (
          <div style={{ fontSize: 28, filter: "drop-shadow(0 0 10px #FFD700)", marginBottom: -4 }}>👑</div>
        )}

        {/* Main card */}
        <div style={{
          width: "100%", minHeight: sz.h,
          background: `linear-gradient(165deg, ${p.glow}18 0%, rgba(10,8,25,0.97) 50%, ${p.glow}10 100%)`,
          border: `2px solid ${p.glow}99`,
          borderRadius: 20,
          animation: `${kfName} ${isFirst ? 2 : 2.6}s ease-in-out infinite`,
          padding: "20px 16px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          position: "relative", overflow: "hidden",
        }}>
          {/* Corner shimmer */}
          <div style={{
            position: "absolute", top: -1, left: -1, right: -1, height: 2,
            background: `linear-gradient(90deg, transparent, ${p.glow}, transparent)`,
          }} />

          {/* Medal */}
          <div style={{ fontSize: isFirst ? 36 : 28 }}>{p.medal}</div>

          {/* Avatar circle */}
          <div style={{
            width: sz.avatarSize, height: sz.avatarSize, borderRadius: "50%",
            background: `radial-gradient(circle, ${p.glow}33 0%, ${p.glow}11 100%)`,
            border: `2px solid ${p.glow}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isFirst ? 28 : 22,
          }}>
            {entry.username.charAt(0).toUpperCase()}
          </div>

          {/* Name */}
          <div style={{
            color: "#fff", fontWeight: 800, fontSize: isFirst ? 15 : 13,
            textAlign: "center", maxWidth: "100%",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textShadow: `0 0 12px ${p.glow}88`,
          }}>{entry.username}</div>

          {/* Watch count */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: `${p.glow}18`, border: `1px solid ${p.glow}44`,
            borderRadius: 50, padding: "5px 14px",
          }}>
            <span style={{ fontSize: 16 }}>⌚</span>
            <span style={{ color: p.color, fontWeight: 900, fontSize: isFirst ? 20 : 16 }}>
              {entry.totalWatches}
            </span>
          </div>

          {/* Prize */}
          <div style={{
            width: "100%", borderTop: `1px solid ${p.glow}33`,
            paddingTop: 10, textAlign: "center",
          }}>
            <div style={{ color: `${p.color}99`, fontSize: 10, fontWeight: 600, letterSpacing: 1.5 }}>
              PRIZE
            </div>
            <div style={{ color: p.color, fontWeight: 900, fontSize: isFirst ? 20 : 16, marginTop: 2 }}>
              ₨{p.pkr}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Row for rank 4+ ─────────────────────────────────────────────────── */
function LeaderRow({ entry }: { entry: LeaderEntry }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 16px", borderRadius: 10,
        background: hov ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.15s",
      }}>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, minWidth: 28 }}>
        #{entry.rank}
      </span>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#FFD700", fontWeight: 700, fontSize: 13,
      }}>
        {String(entry.username).charAt(0).toUpperCase()}
      </div>
      <span style={{ flex: 1, color: "#ddd", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entry.username}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 14 }}>⌚</span>
        <span style={{ color: "#FFD700", fontSize: 14, fontWeight: 800, minWidth: 28, textAlign: "right" }}>
          {entry.totalWatches}
        </span>
      </div>
    </div>
  );
}

/* ─── The modal itself ────────────────────────────────────────────────── */
function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpd, setLastUpd]   = useState<Date | null>(null);
  const [comp, setComp]         = useState<CompetitionInfo | null>(null);

  const daysLeft = comp ? Math.ceil((new Date(comp.endDate).getTime() - Date.now()) / 86400000) : null;
  const compName = comp?.competitionName ?? "Watch Hunt";

  const fetchData = () => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(j => { if (j.success) { setEntries(j.data); setLastUpd(new Date()); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    fetch("/api/competition").then(r=>r.json()).then(j=>{ if(j.success && j.data) setComp(j.data); }).catch(()=>{});
    const id = setInterval(fetchData, 8000);
    return () => clearInterval(id);
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.94) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.3; transform:scale(0.6); }
        }
        @keyframes bgStars {
          from { background-position: 0 0; }
          to   { background-position: 100px 100px; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        {/* Modal card — stop propagation so clicking inside doesn't close */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "min(820px, 98vw)", maxHeight: "90vh",
            background: "linear-gradient(160deg, #0a0818 0%, #120922 50%, #070e1c 100%)",
            border: "1.5px solid rgba(255,215,0,0.3)",
            borderRadius: 24,
            boxShadow: "0 0 80px rgba(255,215,0,0.18), 0 40px 80px rgba(0,0,0,0.7)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            animation: "modalIn 0.28s cubic-bezier(0.16,1,0.3,1)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: "18px 24px",
            background: "linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(255,80,80,0.06) 100%)",
            borderBottom: "1px solid rgba(255,215,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28, filter: "drop-shadow(0 0 10px #FFD700)" }}>⌚</span>
              <div>
                <div style={{ color: "#FFD700", fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>
                  {compName.toUpperCase()}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>
                  {daysLeft !== null
                    ? daysLeft > 0 ? `${daysLeft} days remaining · Top 20 players` : "Competition ended!"
                    : "Top 20 players"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Live indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#44ff88", boxShadow: "0 0 8px #44ff88", animation: "livePulse 1.5s ease-in-out infinite" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600 }}>LIVE</span>
              </div>
              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>
          </div>

          {/* ── Prize strip ── */}
          <div style={{
            display: "flex", gap: 0,
            borderBottom: "1px solid rgba(255,215,0,0.1)",
          }}>
            {[
              { pos: "1st", amt: `₨${comp?.prize1 ?? "10,000"}`, col: "#FFD700", bg: "rgba(255,215,0,0.08)" },
              { pos: "2nd", amt: `₨${comp?.prize2 ?? "5,000"}`,  col: "#C0C0C0", bg: "rgba(192,192,192,0.05)" },
              { pos: "3rd", amt: `₨${comp?.prize3 ?? "2,000"}`,  col: "#CD7F32", bg: "rgba(205,127,50,0.06)" },
            ].map(({ pos, amt, col, bg }) => (
              <div key={pos} style={{ flex: 1, textAlign: "center", padding: "8px 0", background: bg, borderRight: "1px solid rgba(255,215,0,0.06)" }}>
                <div style={{ color: `${col}88`, fontSize: 10, fontWeight: 600 }}>{pos} PLACE</div>
                <div style={{ color: col, fontSize: 14, fontWeight: 800 }}>{amt}</div>
              </div>
            ))}
          </div>

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {loading ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "60px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⌚</div>
                <div style={{ fontSize: 14 }}>Loading rankings…</div>
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⌚</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, fontWeight: 600 }}>No players yet!</div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 8 }}>
                  Be the first to play and collect watches
                </div>
              </div>
            ) : (
              <>
                {/* Top 3 podium */}
                {top3.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ color: "rgba(255,215,0,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>
                      — TOP PLAYERS —
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16 }}>
                      {top3.map((e) => (
                        <TopThreeCard key={e.userId} entry={e} rank={Number(e.rank)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Rest */}
                {rest.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.2), transparent)", margin: "0 0 16px" }} />
                    <div style={{ color: "rgba(255,215,0,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>
                      — RANKINGS 4–{Math.min(20, entries.length)} —
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {rest.map((e) => <LeaderRow key={e.userId} entry={e} />)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "10px 24px",
            borderTop: "1px solid rgba(255,215,0,0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>
              {lastUpd ? `Updated ${lastUpd.toLocaleTimeString()}` : "Fetching…"}
            </span>
            <span style={{ color: "rgba(255,215,0,0.35)", fontSize: 10 }}>
              Collect watches in-game to climb the rankings
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Trigger button + optional open modal ────────────────────────────── */
export function LeaderboardPanel() {
  const [open, setOpen] = useState(false);
  const [hov,  setHov]  = useState(false);

  return (
    <>
      <style>{`
        @keyframes ranksBtnPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(255,215,0,0); }
        }
      `}</style>

      <button
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 28px",
          background: hov
            ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,50,0.15))"
            : "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,50,0.08))",
          border: `2px solid ${hov ? "rgba(255,215,0,0.7)" : "rgba(255,215,0,0.35)"}`,
          borderRadius: 14, cursor: "pointer", outline: "none",
          transform: hov ? "translateY(-2px) scale(1.03)" : "none",
          transition: "all 0.18s ease",
          animation: "ranksBtnPulse 2.2s ease-in-out infinite",
          boxShadow: hov ? "0 8px 28px rgba(255,215,0,0.3)" : "0 4px 14px rgba(255,215,0,0.12)",
        }}
      >
        <span style={{ fontSize: 22 }}>🏆</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#FFD700", fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>RANKS</div>
          <div style={{ color: "rgba(255,215,0,0.55)", fontSize: 10, fontWeight: 500 }}>Top 20 Watch Hunters</div>
        </div>
        <span style={{ color: "rgba(255,215,0,0.5)", fontSize: 16, marginLeft: 4 }}>▶</span>
      </button>

      {open && <LeaderboardModal onClose={() => setOpen(false)} />}
    </>
  );
}
