import { useGameStore } from "@/game/useGameStore";

interface HUDProps {
  score: number;
  coins: number;
  visible: boolean;
}

export function HUD({ score, coins, visible }: HUDProps) {
  const { powerup, powerupTime } = useGameStore();

  if (!visible) return null;

  const powerupMax  = powerup === "jetpack" ? 20 : 10;
  const powerupFrac = powerup ? Math.min(1, powerupTime / powerupMax) : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        zIndex: 10,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Score */}
      <div style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", borderRadius:"14px", padding:"10px 18px", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ color:"#aaa", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase" }}>Score</div>
        <div style={{ color:"#fff", fontSize:"32px", fontWeight:800, lineHeight:1.1 }}>{score.toLocaleString()}</div>
      </div>

      {/* Powerup bar — centre */}
      {powerup && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
          <div style={{ fontSize:"28px" }}>{powerup === "magnet" ? "🧲" : "🚀"}</div>
          <div style={{ width:"130px", height:"10px", background:"rgba(0,0,0,0.5)", borderRadius:"6px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.2)" }}>
            <div style={{
              height:"100%",
              width:`${powerupFrac * 100}%`,
              background: powerup === "magnet" ? "linear-gradient(90deg,#FF4444,#FF8888)" : "linear-gradient(90deg,#2288FF,#88CCFF)",
              borderRadius:"6px",
              transition:"width 0.1s",
            }} />
          </div>
          <div style={{ color:"#fff", fontSize:"13px", fontWeight:700, textShadow:"0 1px 4px #000" }}>
            {powerup === "magnet" ? "MAGNET" : "JETPACK"} {Math.ceil(powerupTime)}s
          </div>
        </div>
      )}

      {/* Coins */}
      <div style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", borderRadius:"14px", padding:"10px 18px", border:"1px solid rgba(255,215,0,0.3)", display:"flex", alignItems:"center", gap:"6px" }}>
        <span style={{ fontSize:"20px" }}>⌚</span>
        <span style={{ color:"#FFD700", fontSize:"22px", fontWeight:700 }}>{coins}</span>
      </div>
    </div>
  );
}
