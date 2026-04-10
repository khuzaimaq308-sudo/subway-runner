interface GameOverScreenProps {
  score: number;
  highScore: number;
  coins: number;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ score, highScore, coins, onRestart, onMenu }: GameOverScreenProps) {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,5,15,0.88)",
        backdropFilter: "blur(6px)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        zIndex: 20,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px 48px",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxWidth: "440px",
          width: "90%",
        }}
      >
        <div style={{ fontSize: "56px", marginBottom: "12px" }}>
          {isNewRecord ? "🏆" : "💀"}
        </div>

        <h2
          style={{
            color: isNewRecord ? "#FFD700" : "#FF4F5E",
            fontSize: "36px",
            fontWeight: 900,
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
          }}
        >
          {isNewRecord ? "NEW RECORD!" : "GAME OVER"}
        </h2>

        {isNewRecord && (
          <p style={{ color: "#FFD700", opacity: 0.7, fontSize: "13px", letterSpacing: "2px", margin: "0 0 20px" }}>
            AMAZING RUN!
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            margin: "20px 0 28px",
          }}
        >
          {[
            { label: "Score", value: score.toLocaleString(), color: "#fff" },
            { label: "Best", value: highScore.toLocaleString(), color: "#FFD700" },
            { label: "Coins", value: `🪙 ${coins}`, color: "#FFD700" },
            { label: "Rank", value: score > 1000 ? "S" : score > 500 ? "A" : score > 200 ? "B" : "C", color: score > 1000 ? "#FF4F5E" : "#aaa" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div style={{ color: "#888", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>
                {stat.label}
              </div>
              <div style={{ color: stat.color, fontSize: "24px", fontWeight: 800 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onRestart}
            style={{
              flex: 1,
              padding: "16px",
              background: "linear-gradient(135deg, #FF4F5E, #FF8C42)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(255,79,94,0.35)",
            }}
          >
            ▶ Play Again
          </button>
          <button
            onClick={onMenu}
            style={{
              flex: 1,
              padding: "16px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              color: "#ccc",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🏠 Menu
          </button>
        </div>
      </div>
    </div>
  );
}
