import { useEffect, useRef, useState } from "react";
import { useSignIn } from "@clerk/react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── tiny animated canvas background ────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    /* rails — static lines that scroll */
    const RAILS = [
      { x: 0.38, color: "#FFD70033" },
      { x: 0.50, color: "#FF224433" },
      { x: 0.62, color: "#2255FF33" },
    ];

    /* floating coins / stars */
    interface Particle { x: number; y: number; r: number; vy: number; opacity: number; hue: number }
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.5 + Math.random() * 3,
      vy: 0.00025 + Math.random() * 0.00045,
      opacity: 0.25 + Math.random() * 0.55,
      hue: Math.random() * 360,
    }));

    /* scrolling lane lines */
    let railY = 0;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* deep gradient sky */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   "#07071a");
      bg.addColorStop(0.5, "#130824");
      bg.addColorStop(1,   "#091427");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* perspective rails */
      railY = (railY + 0.55) % H;
      ctx.save();
      ctx.globalAlpha = 0.18;
      for (const rail of RAILS) {
        const rx = W * rail.x;
        ctx.strokeStyle = rail.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 14]);
        ctx.lineDashOffset = -railY;
        ctx.beginPath();
        ctx.moveTo(W * 0.5, H * 0.42); // vanishing point
        ctx.lineTo(rx, H + 60);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      /* floating glowing dots */
      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -0.02) p.y = 1.02;

        const px = p.x * W, py = p.y * H;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3);
        grd.addColorStop(0,   `hsla(${p.hue},100%,75%,${p.opacity})`);
        grd.addColorStop(1,   `hsla(${p.hue},100%,60%,0)`);
        ctx.beginPath();
        ctx.arc(px, py, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
}

/* ── main component ──────────────────────────────────────────────── */
export function LoginScreen() {
  const { signIn, isLoaded } = useSignIn();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleGoogle = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      await signIn.authenticateWithRedirect({
        strategy:         "oauth_google",
        redirectUrl:      `${window.location.origin}${BASE}/sign-in/sso-callback`,
        redirectUrlComplete: `${window.location.origin}${BASE}/`,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const goSignUp = () => setLocation("/sign-up");

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <ParticleCanvas />

      {/* glow halos */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,50,80,0.10) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />
      <div style={{ position: "fixed", bottom: "20%", left: "30%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(40,80,255,0.10) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />

      {/* card */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: 420,
        margin: "0 16px",
        background: "rgba(10,10,30,0.72)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        padding: "44px 40px 40px",
        boxShadow: "0 8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset",
      }}>

        {/* logo / title */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {/* watch icon */}
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#FFD700,#FF8C00)", boxShadow: "0 0 32px rgba(255,215,0,0.45)", marginBottom: 18 }}>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="13" stroke="#fff" strokeWidth="2.5" fill="none"/>
              <circle cx="19" cy="19" r="9" fill="rgba(255,255,255,0.15)"/>
              <line x1="19" y1="12" x2="19" y2="19" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <line x1="19" y1="19" x2="24" y2="22" stroke="#FF8C00" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="15" y="5" width="8" height="4" rx="2" fill="rgba(255,255,255,0.25)"/>
              <rect x="15" y="29" width="8" height="4" rx="2" fill="rgba(255,255,255,0.25)"/>
            </svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1, fontFamily: "system-ui,sans-serif" }}>
            Subway Runner
          </div>
          <div style={{ marginTop: 8, fontSize: 13.5, color: "rgba(255,255,255,0.45)", fontFamily: "system-ui,sans-serif" }}>
            Sign in to save your scores &amp; compete
          </div>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={!isLoaded || loading}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "14px 20px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: 15.5, fontWeight: 600,
            fontFamily: "system-ui,sans-serif",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.18s, transform 0.12s",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
            outline: "none",
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"; }}
        >
          {loading ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
              <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
              <path d="M11 2a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C37 37.4 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {/* divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 20px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.10)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "system-ui,sans-serif" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.10)" }} />
        </div>

        {/* sign up button */}
        <button
          onClick={goSignUp}
          style={{
            width: "100%",
            padding: "13px 20px",
            borderRadius: 14,
            border: "1px solid rgba(255,215,0,0.35)",
            background: "linear-gradient(135deg,rgba(255,215,0,0.10),rgba(255,140,0,0.10))",
            color: "#FFD700",
            fontSize: 15, fontWeight: 600,
            fontFamily: "system-ui,sans-serif",
            cursor: "pointer",
            transition: "background 0.18s",
            outline: "none",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg,rgba(255,215,0,0.20),rgba(255,140,0,0.20))"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg,rgba(255,215,0,0.10),rgba(255,140,0,0.10))"; }}
        >
          Create account
        </button>

        {/* error */}
        {error && (
          <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#FF6B6B", fontFamily: "system-ui,sans-serif" }}>{error}</p>
        )}

        {/* footer */}
        <p style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.22)", fontFamily: "system-ui,sans-serif" }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
