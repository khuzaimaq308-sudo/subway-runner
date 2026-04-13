import { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";

interface UserStats {
  totalWatches: number;
  totalScore: number;
  gamesPlayed: number;
}

export function WatchesCornerPanel() {
  const { user, isLoaded } = useUser();
  const { getToken }       = useAuth();
  const [stats, setStats]  = useState<UserStats | null>(null);
  const [pop, setPop]      = useState(false);
  const prevWatches        = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const fetchStats = async () => {
      try {
        const token = await getToken();
        const r = await fetch("/api/user/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (j.success && j.data) {
          const w = j.data.totalWatches ?? 0;
          if (prevWatches.current !== null && w > prevWatches.current) {
            setPop(true);
            setTimeout(() => setPop(false), 600);
          }
          prevWatches.current = w;
          setStats({ totalWatches: w, totalScore: j.data.totalScore ?? 0, gamesPlayed: j.data.gamesPlayed ?? 0 });
        }
      } catch {}
    };
    // Fetch immediately on mount, then again after 2s (catches freshly submitted scores)
    // and then every 12s
    fetchStats();
    const quick = setTimeout(fetchStats, 2000);
    const id    = setInterval(fetchStats, 12000);
    return () => { clearTimeout(quick); clearInterval(id); };
  }, [isLoaded, user]);

  if (!isLoaded || !user) return null;

  const w = stats?.totalWatches ?? 0;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 30,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(10,8,22,0.88)", backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(255,215,0,0.35)",
        borderRadius: 14, padding: "9px 16px",
        boxShadow: "0 0 20px rgba(255,215,0,0.18), 0 4px 16px rgba(0,0,0,0.5)",
        transform: pop ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <span style={{
          fontSize: 20,
          filter: pop ? "drop-shadow(0 0 8px #FFD700)" : "none",
          transition: "filter 0.18s",
        }}>⌚</span>
        <div>
          <div style={{ color: "rgba(255,215,0,0.55)", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, lineHeight: 1, fontFamily: "system-ui" }}>
            TOTAL WATCHES
          </div>
          <div style={{
            color: "#FFD700", fontSize: 22, fontWeight: 900, lineHeight: 1.1,
            fontFamily: "system-ui",
            textShadow: pop ? "0 0 14px #FFD700" : "none",
            transition: "text-shadow 0.2s",
          }}>
            {w.toLocaleString()}
          </div>
        </div>
      </div>
      {stats && stats.gamesPlayed > 0 && (
        <div style={{
          color: "rgba(255,215,0,0.4)", fontSize: 10, fontWeight: 600,
          fontFamily: "system-ui", paddingRight: 4,
        }}>
          {stats.gamesPlayed} {stats.gamesPlayed === 1 ? "game" : "games"} played
        </div>
      )}
    </div>
  );
}
