import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { DancingCharacterView } from "./DancingCharacterView";
import { LeaderboardPanel } from "./LeaderboardPanel";

const ADMIN_EMAIL = "khuzaimaq308@gmail.com";

interface MenuScreenProps {
  onStart:    () => void;
  highScore:  number;
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

      /* perspective rails */
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

      /* glow dots */
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
function WatchPlayButton({ onStart }: { onStart: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const size = 188;
  const pulse = hovered ? "0 0 0 12px rgba(255,215,0,0.12), 0 0 60px rgba(255,215,0,0.45), 0 0 100px rgba(255,100,50,0.25)" : "0 0 0 8px rgba(255,215,0,0.08), 0 0 40px rgba(255,215,0,0.28), 0 0 70px rgba(255,100,50,0.15)";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      {/* Crown lug */}
      <div style={{ width:22, height:12, borderRadius:"4px 4px 0 0", background:"linear-gradient(180deg,#C8A000,#9A7800)", boxShadow:"0 -2px 8px rgba(0,0,0,0.4)" }} />

      {/* Main watch bezel */}
      <button
        onClick={() => { setPressed(true); setTimeout(() => { setPressed(false); onStart(); }, 140); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:"relative", width:size, height:size,
          borderRadius:"50%", border:"none",
          background:"linear-gradient(145deg, #2a2a2a, #111)",
          cursor:"pointer", outline:"none", padding:0,
          transform: pressed ? "scale(0.94)" : hovered ? "scale(1.04)" : "scale(1)",
          transition:"transform 0.12s ease, box-shadow 0.22s ease",
          boxShadow: `0 0 0 5px #B8920A, 0 0 0 9px #8A6A00, ${pulse}`,
        }}
      >
        {/* Watch face */}
        <div style={{
          position:"absolute", inset:9, borderRadius:"50%",
          background:"radial-gradient(circle at 38% 35%, #1a1a3a, #07071a 70%)",
          overflow:"hidden",
        }}>
          {/* Tick marks */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const r = (size / 2 - 14) * 0.78;
            const cx = (size - 18) / 2, cy = (size - 18) / 2;
            const x1 = cx + Math.cos(angle) * r, y1 = cy + Math.sin(angle) * r;
            const x2 = cx + Math.cos(angle) * (r - (i % 3 === 0 ? 9 : 5));
            const y2 = cy + Math.sin(angle) * (r - (i % 3 === 0 ? 9 : 5));
            return (
              <svg key={i} style={{ position:"absolute", inset:0 }} width={size-18} height={size-18}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={i % 3 === 0 ? "#FFD700" : "rgba(255,215,0,0.35)"}
                  strokeWidth={i % 3 === 0 ? 2.2 : 1.2} strokeLinecap="round" />
              </svg>
            );
          })}

          {/* Centre glow */}
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"radial-gradient(circle at 38% 35%, rgba(255,215,0,0.06), transparent 65%)" }} />

          {/* Play triangle */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:"translate(-42%, -50%)",
            width:0, height:0,
            borderTop:"20px solid transparent",
            borderBottom:"20px solid transparent",
            borderLeft:`32px solid ${hovered ? "#FFD700" : "#E8B800"}`,
            filter:`drop-shadow(0 0 ${hovered ? 14 : 8}px rgba(255,215,0,0.9))`,
            transition:"border-left-color 0.2s, filter 0.2s",
          }} />

          {/* Label */}
          <div style={{
            position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)",
            color:"rgba(255,215,0,0.65)", fontSize:9, fontWeight:700,
            letterSpacing:2.5, fontFamily:"monospace", whiteSpace:"nowrap",
          }}>
            PLAY
          </div>

          {/* Crown crystal glint */}
          <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)", width:24, height:3, borderRadius:4, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" }} />
        </div>

        {/* Glint overlay */}
        <div style={{ position:"absolute", inset:9, borderRadius:"50%", background:"linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%)", pointerEvents:"none" }} />
      </button>

      {/* Lug bottom */}
      <div style={{ width:22, height:12, borderRadius:"0 0 4px 4px", background:"linear-gradient(180deg,#9A7800,#C8A000)", boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }} />
      {/* Strap bottom */}
      <div style={{ width:36, height:40, borderRadius:"0 0 8px 8px", background:"linear-gradient(180deg,#1a1a2e,#111122)", border:"1px solid rgba(255,215,0,0.15)" }} />
    </div>
  );
}

/* ── Small icon button ───────────────────────────────────────────── */
function IconBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={label}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:5,
        padding:"14px 22px", borderRadius:14,
        border:"1px solid rgba(255,255,255,0.13)",
        background: h ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color:"#fff", cursor:"pointer", outline:"none",
        transition:"background 0.15s, transform 0.12s",
        transform: h ? "translateY(-2px)" : "none",
        boxShadow: h ? "0 4px 18px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:600, letterSpacing:1, color:"rgba(255,255,255,0.6)", fontFamily:"system-ui,sans-serif", textTransform:"uppercase" }}>{label}</span>
    </button>
  );
}

/* ── Main menu ───────────────────────────────────────────────────── */
export function MenuScreen({ onStart, highScore }: MenuScreenProps) {
  const [soundOn, setSoundOn] = useState(true);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim() ?? "";
  const isAdmin   = userEmail === ADMIN_EMAIL.toLowerCase();

  const handleSound = () => {
    setSoundOn((v) => !v);
    /* The sound system uses the Web Audio context — suspending/resuming it
       acts as a global mute. The AudioContext is created lazily on first
       sound play, so we need to interact with it after it exists.         */
    const w = window as any;
    if (w.__audioCtx) {
      if (w.__audioCtx.state === "running") w.__audioCtx.suspend();
      else w.__audioCtx.resume();
    } else {
      /* Mark preference for when the context is created later */
      w.__audioMuted = soundOn; // will be muted next create
    }
  };

  return (
    <div style={{ position:"absolute", inset:0, zIndex:20, overflow:"hidden", fontFamily:"system-ui,sans-serif" }}>
      <BgCanvas />

      {/* Extra halo glows */}
      <div style={{ position:"fixed", top:"20%", right:"30%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,100,50,0.07) 0%, transparent 70%)", pointerEvents:"none", zIndex:1 }} />
      <div style={{ position:"fixed", bottom:"10%", left:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(40,80,255,0.08) 0%, transparent 70%)", pointerEvents:"none", zIndex:1 }} />

      {/* Main layout */}
      <div style={{
        position:"relative", zIndex:2,
        width:"100%", height:"100%",
        display:"flex", alignItems:"center", justifyContent:"center",
        gap:0, padding:"0 16px",
      }}>

        {/* ── Left: Dancing character ── */}
        <div style={{ flex:"0 0 30%", height:"100%", position:"relative", minWidth:0 }}>
          {/* Spotlight underneath character */}
          <div style={{ position:"absolute", bottom:"18%", left:"50%", transform:"translateX(-50%)", width:180, height:40, borderRadius:"50%", background:"rgba(255,215,0,0.10)", filter:"blur(12px)", zIndex:1, pointerEvents:"none" }} />
          <DancingCharacterView />
        </div>

        {/* ── Right: Controls ── */}
        <div style={{ flex:"0 0 52%", display:"flex", flexDirection:"column", alignItems:"center", gap:26, paddingRight:"4%" }}>

          {/* Title */}
          <div style={{ textAlign:"center" }}>
            <div style={{
              fontSize:48, fontWeight:900, color:"#fff", letterSpacing:"-1px",
              textShadow:"0 0 40px rgba(255,215,0,0.5), 0 2px 0 rgba(0,0,0,0.5)",
              lineHeight:1.1,
            }}>
              SUBWAY<br />
              <span style={{ color:"#FFD700" }}>RUNNER</span>
            </div>
            {highScore > 0 && (
              <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,215,0,0.10)", border:"1px solid rgba(255,215,0,0.25)", borderRadius:50, padding:"6px 18px" }}>
                <span style={{ fontSize:16 }}>🏆</span>
                <span style={{ color:"#FFD700", fontSize:14, fontWeight:700 }}>Best: {highScore.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Big watch play button */}
          <WatchPlayButton onStart={onStart} />

          {/* RANKS button */}
          <LeaderboardPanel />

          {/* Sub icon buttons */}
          <div style={{ display:"flex", gap:12 }}>
            <IconBtn
              label="Home"
              icon="🏠"
              onClick={() => window.location.reload()}
            />
            <IconBtn
              label={soundOn ? "Sound On" : "Sound Off"}
              icon={soundOn ? "🔊" : "🔇"}
              onClick={handleSound}
            />
            {isAdmin && (
              <IconBtn
                label="Admin"
                icon="⚙️"
                onClick={() => { window.location.href = "/admin"; }}
              />
            )}
          </div>
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
