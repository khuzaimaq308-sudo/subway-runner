interface MenuScreenProps {
  onStart: () => void;
  highScore: number;
}

export function MenuScreen({ onStart, highScore }: MenuScreenProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, rgba(10,10,26,0.85) 0%, rgba(20,10,40,0.9) 100%)",
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
          maxWidth: "480px",
          width: "90%",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "8px" }}>🏃</div>
        <h1
          style={{
            color: "#fff",
            fontSize: "42px",
            fontWeight: 900,
            margin: "0 0 4px",
            letterSpacing: "-1px",
            textShadow: "0 0 30px rgba(255,100,150,0.6)",
          }}
        >
          SUBWAY RUNNER
        </h1>
        <p style={{ color: "#FF4F5E", fontSize: "14px", letterSpacing: "3px", margin: "0 0 24px", textTransform: "uppercase" }}>
          Custom Character Edition
        </p>

        {highScore > 0 && (
          <div
            style={{
              background: "rgba(255,215,0,0.1)",
              border: "1px solid rgba(255,215,0,0.3)",
              borderRadius: "10px",
              padding: "10px 20px",
              marginBottom: "24px",
              color: "#FFD700",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            🏆 Best Score: {highScore.toLocaleString()}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {[
            { icon: "⬅️➡️", text: "Arrow keys or A/D to switch lanes" },
            { icon: "⬆️", text: "Space or W to jump over barriers" },
            { icon: "📱", text: "Swipe on mobile" },
            { icon: "🎤", text: "Voice reactions enabled" },
          ].map((tip, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "10px",
                padding: "10px 14px",
              }}
            >
              <span style={{ fontSize: "20px", minWidth: "32px" }}>{tip.icon}</span>
              <span style={{ color: "#ccc", fontSize: "14px" }}>{tip.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          style={{
            width: "100%",
            padding: "18px",
            background: "linear-gradient(135deg, #FF4F5E, #FF8C42)",
            border: "none",
            borderRadius: "14px",
            color: "#fff",
            fontSize: "20px",
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "2px",
            textTransform: "uppercase",
            boxShadow: "0 8px 32px rgba(255,79,94,0.4)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(255,79,94,0.55)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = "translateY(0)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(255,79,94,0.4)";
          }}
        >
          ▶ Play Now
        </button>
      </div>
    </div>
  );
}
