import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { LeaderboardPanel } from "./LeaderboardPanel";

const ADMIN_EMAIL = "khuzaimaq308@gmail.com";

interface MenuScreenProps {
  onStart:    () => void;
  highScore:  number;
}

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update); };
  }, []);
  return size;
}

/* ── Animated particle background ────────────────────────────────── */
function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf: number;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);

    interface P { x: number; y: number; r: number; vy: number; o: number; h: number; }
    const pts: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 3.5,
      vy: 0.0002 + Math.random() * 0.0004,
      o: 0.2 + Math.random() * 0.6,
      h: Math.random() * 360,
    }));

    let ry = 0;
    const draw = () => {
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   "#06061a");
      bg.addColorStop(0.5, "#0f0520");
      bg.addColorStop(1,   "#060e1e");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      ry = (ry + 0.6) % H;
      ctx.save(); ctx.globalAlpha = 0.14;
      for (const [rx, col] of [
        [W * 0.35, "#FF2244"], [W * 0.50, "#FFD700"], [W * 0.65, "#2255FF"],
      ] as [number, string][]) {
        ctx.strokeStyle = col; ctx.lineWidth = 1.8;
        ctx.setLineDash([16, 12]); ctx.lineDashOffset = -ry;
        ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.44); ctx.lineTo(rx, H + 60); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();

      for (const p of pts) {
        p.y -= p.vy; if (p.y < -0.02) p.y = 1.02;
        const px = p.x * W, py = p.y * H;
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.5);
        g.addColorStop(0, `hsla(${p.h},100%,78%,${p.o})`);
        g.addColorStop(1, `hsla(${p.h},100%,60%,0)`);
        ctx.beginPath(); ctx.arc(px, py, p.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, width:"100%", height:"100%", zIndex:0 }} />;
}

/* ── Watch-style play button ─────────────────────────────────────── */
function WatchPlayButton({ onStart, size: btnSize }: { onStart: () => void; size: number }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const size = btnSize;
  const pulse = hovered
    ? "0 0 0 12px rgba(255,215,0,0.12), 0 0 60px rgba(255,215,0,0.45), 0 0 100px rgba(255,100,50,0.25)"
    : "0 0 0 8px rgba(255,215,0,0.08), 0 0 40px rgba(255,215,0,0.28), 0 0 70px rgba(255,100,50,0.15)";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: Math.round(size * 0.04) }}>
      <div style={{ width: Math.round(size*0.12), height: Math.round(size*0.065), borderRadius:"4px 4px 0 0", background:"linear-gradient(180deg,#C8A000,#9A7800)", boxShadow:"0 -2px 8px rgba(0,0,0,0.4)" }} />
      <button
        onClick={() => { setPressed(true); setTimeout(() => { setPressed(false); onStart(); }, 140); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setHovered(false)}
        style={{
          position:"relative", width:size, height:size,
          borderRadius:"50%", border:"none",
          background:"linear-gradient(145deg, #2a2a2a, #111)",
          cursor:"pointer", outline:"none", padding:0,
          transform: pressed ? "scale(0.94)" : hovered ? "scale(1.04)" : "scale(1)",
          transition:"transform 0.12s ease, box-shadow 0.22s ease",
          boxShadow: `0 0 0 ${Math.round(size*0.027)}px #B8920A, 0 0 0 ${Math.round(size*0.049)}px #8A6A00, ${pulse}`,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{
          position:"absolute", inset: Math.round(size*0.05), borderRadius:"50%",
          background:"radial-gradient(circle at 38% 35%, #1a1a3a, #07071a 70%)",
          overflow:"hidden",
        }}>
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const r = (size / 2 - size*0.077) * 0.78;
            const cx = (size - size*0.1) / 2, cy = (size - size*0.1) / 2;
            const x1 = cx + Math.cos(angle) * r, y1 = cy + Math.sin(angle) * r;
            const x2 = cx + Math.cos(angle) * (r - (i % 3 === 0 ? size*0.049 : size*0.027));
            const y2 = cy + Math.sin(angle) * (r - (i % 3 === 0 ? size*0.049 : size*0.027));
            return (
              <svg key={i} style={{ position:"absolute", inset:0 }} width={size-size*0.1} height={size-size*0.1}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={i % 3 === 0 ? "#FFD700" : "rgba(255,215,0,0.35)"}
                  strokeWidth={i % 3 === 0 ? 2.2 : 1.2} strokeLinecap="round" />
              </svg>
            );
          })}
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"radial-gradient(circle at 38% 35%, rgba(255,215,0,0.06), transparent 65%)" }} />
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-42%, -50%)",
            width:0, height:0,
            borderTop:`${Math.round(size*0.107)}px solid transparent`,
            borderBottom:`${Math.round(size*0.107)}px solid transparent`,
            borderLeft:`${Math.round(size*0.171)}px solid ${hovered ? "#FFD700" : "#E8B800"}`,
            filter:`drop-shadow(0 0 ${hovered ? 14 : 8}px rgba(255,215,0,0.9))`,
            transition:"border-left-color 0.2s, filter 0.2s",
          }} />
          <div style={{
            position:"absolute", bottom: Math.round(size*0.086), left:"50%", transform:"translateX(-50%)",
            color:"rgba(255,215,0,0.65)", fontSize: Math.max(7, Math.round(size*0.049)), fontWeight:700,
            letterSpacing:2.5, fontFamily:"monospace", whiteSpace:"nowrap",
          }}>
            PLAY
          </div>
          <div style={{ position:"absolute", top: Math.round(size*0.033), left:"50%", transform:"translateX(-50%)", width: Math.round(size*0.13), height:3, borderRadius:4, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" }} />
        </div>
        <div style={{ position:"absolute", inset: Math.round(size*0.05), borderRadius:"50%", background:"linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%)", pointerEvents:"none" }} />
      </button>
      <div style={{ width: Math.round(size*0.12), height: Math.round(size*0.065), borderRadius:"0 0 4px 4px", background:"linear-gradient(180deg,#9A7800,#C8A000)", boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }} />
      <div style={{ width: Math.round(size*0.195), height: Math.round(size*0.22), borderRadius:"0 0 8px 8px", background:"linear-gradient(180deg,#1a1a2e,#111122)", border:"1px solid rgba(255,215,0,0.15)" }} />
    </div>
  );
}

/* ── Small icon button ───────────────────────────────────────────── */
function IconBtn({ label, icon, onClick, small }: { label: string; icon: React.ReactNode; onClick: () => void; small?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onTouchStart={() => setH(true)}
      onTouchEnd={() => setH(false)}
      title={label}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap: small ? 3 : 5,
        padding: small ? "10px 14px" : "14px 22px", borderRadius:14,
        border:"1px solid rgba(255,255,255,0.13)",
        background: h ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color:"#fff", cursor:"pointer", outline:"none",
        transition:"background 0.15s, transform 0.12s",
        transform: h ? "translateY(-2px)" : "none",
        boxShadow: h ? "0 4px 18px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.25)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ fontSize: small ? 18 : 22 }}>{icon}</span>
      <span style={{ fontSize: small ? 9 : 11, fontWeight:600, letterSpacing:1, color:"rgba(255,255,255,0.6)", fontFamily:"system-ui,sans-serif", textTransform:"uppercase" }}>{label}</span>
    </button>
  );
}

/* ── Main menu ───────────────────────────────────────────────────── */
export function MenuScreen({ onStart, highScore }: MenuScreenProps) {
  const [soundOn, setSoundOn] = useState(true);
  const { user } = useUser();
  const { w, h } = useWindowSize();

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim() ?? "";
  const isAdmin   = userEmail === ADMIN_EMAIL.toLowerCase();

  // Responsive breakpoints
  const isSmall  = w < 680;   // small mobile landscape (e.g. iPhone SE landscape)
  const isTiny   = w < 500;   // very small

  // Watch sized to fit available height — landscape phones are short
  const watchBtnSize = Math.min(
    isTiny ? 100 : isSmall ? 130 : 170,
    Math.round(h * 0.55),
  );
  const titleSize    = isTiny ? 18 : isSmall ? 22 : 30;

  const handleSound = () => {
    setSoundOn((v) => !v);
    const w2 = window as any;
    if (w2.__audioCtx) {
      if (w2.__audioCtx.state === "running") w2.__audioCtx.suspend();
      else w2.__audioCtx.resume();
    } else {
      w2.__audioMuted = soundOn;
    }
  };

  return (
    <div style={{ position:"absolute", inset:0, zIndex:20, overflow:"hidden", fontFamily:"system-ui,sans-serif" }}>
      <BgCanvas />

      <div style={{ position:"fixed", top:"20%", right:"30%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,100,50,0.07) 0%, transparent 70%)", pointerEvents:"none", zIndex:1 }} />
      <div style={{ position:"fixed", bottom:"10%", left:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(40,80,255,0.08) 0%, transparent 70%)", pointerEvents:"none", zIndex:1 }} />

      {/* Title — elegantly positioned with gradient + glow */}
      <div style={{
        position:"absolute",
        top: isSmall ? "12%" : "14%",
        left:0, right:0,
        textAlign:"center", zIndex:3, pointerEvents:"none",
      }}>
        <div style={{
          display:"inline-flex", alignItems:"center", justifyContent:"center", gap: isSmall ? 10 : 16,
        }}>
          <span style={{ height: 2, width: isSmall ? 28 : 50, background:"linear-gradient(90deg,transparent,rgba(255,215,0,0.6))" }} />
          <div style={{
            fontSize: titleSize, fontWeight:900, letterSpacing: isSmall ? 1.5 : 3,
            lineHeight:1,
            background: "linear-gradient(180deg,#FFF7C2 0%,#FFD700 45%,#C8930A 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            textShadow:"0 0 24px rgba(255,215,0,0.45)",
            filter:"drop-shadow(0 2px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(255,180,40,0.35))",
            fontFamily:"'Impact','Arial Black',system-ui,sans-serif",
          }}>
            SUBWAY&nbsp;RUNNER
          </div>
          <span style={{ height: 2, width: isSmall ? 28 : 50, background:"linear-gradient(90deg,rgba(255,215,0,0.6),transparent)" }} />
        </div>
        {highScore > 0 && (
          <div style={{ marginTop: 8, display:"flex", justifyContent:"center" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,215,0,0.10)", border:"1px solid rgba(255,215,0,0.25)", borderRadius:50, padding: "3px 12px", backdropFilter:"blur(4px)" }}>
              <span style={{ fontSize: 11 }}>🏆</span>
              <span style={{ color:"#FFD700", fontSize: 11, fontWeight:700, letterSpacing: 0.5 }}>Best: {highScore.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main horizontal landscape layout: PLAY watch | RANKS | HOME/SOUND */}
      <div style={{
        position:"relative", zIndex:2,
        width:"100%", height:"100%",
        display:"flex", flexDirection:"row",
        alignItems:"center", justifyContent:"center",
        gap: isTiny ? 18 : isSmall ? 28 : 44,
        padding: isTiny ? "0 10px" : "0 20px",
        boxSizing:"border-box",
      }}>

        {/* ── PLAY watch button ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <WatchPlayButton onStart={onStart} size={watchBtnSize} />
        </div>

        {/* ── RANKS button ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <LeaderboardPanel />
        </div>

        {/* ── HOME / SOUND / ADMIN icon buttons (column on right) ── */}
        <div style={{
          display:"flex", flexDirection:"column",
          gap: isSmall ? 8 : 10,
          alignItems:"center", justifyContent:"center",
        }}>
          <IconBtn
            label="Home"
            icon="🏠"
            onClick={() => window.location.reload()}
            small={true}
          />
          <IconBtn
            label={soundOn ? "Sound" : "Mute"}
            icon={soundOn ? "🔊" : "🔇"}
            onClick={handleSound}
            small={true}
          />
          {isAdmin && (
            <IconBtn
              label="Admin"
              icon="⚙️"
              onClick={() => { window.location.href = "/admin"; }}
              small={true}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes watchPulse {
          0%, 100% { box-shadow: 0 0 0 5px #B8920A, 0 0 0 9px #8A6A00, 0 0 40px rgba(255,215,0,0.28); }
          50%       { box-shadow: 0 0 0 5px #D4A800, 0 0 0 9px #A07A00, 0 0 60px rgba(255,215,0,0.42); }
        }
      `}</style>
    </div>
  );
}
