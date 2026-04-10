interface HUDProps {
  score: number;
  lives: number;
  coins: number;
  visible: boolean;
}

export function HUD({ score, lives, coins, visible }: HUDProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        zIndex: 10,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          borderRadius: "14px",
          padding: "10px 18px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ color: "#aaa", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase" }}>
          Score
        </div>
        <div style={{ color: "#fff", fontSize: "32px", fontWeight: 800, lineHeight: 1.1 }}>
          {score.toLocaleString()}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            borderRadius: "14px",
            padding: "10px 18px",
            border: "1px solid rgba(255,215,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⌚</span>
          <span style={{ color: "#FFD700", fontSize: "22px", fontWeight: 700 }}>{coins}</span>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            borderRadius: "14px",
            padding: "10px 18px",
            border: "1px solid rgba(255,80,80,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: "22px",
                opacity: i < lives ? 1 : 0.25,
                transition: "opacity 0.3s",
              }}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
