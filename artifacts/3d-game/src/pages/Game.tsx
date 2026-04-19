import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUser, useAuth } from "@clerk/react";
import { useGameStore, Lane } from "@/game/useGameStore";
import { useSound, startHipHopBeat, stopHipHopBeat } from "@/game/useSound";
import { useInput } from "@/game/useInput";
import { Character } from "@/components/game/Character";
import { Track } from "@/components/game/Track";
import { Obstacles } from "@/components/game/Obstacles";
import { Coins } from "@/components/game/Coins";
import { BigWatch } from "@/components/game/BigWatch";
import { Environment } from "@/components/game/Environment";
import { Police } from "@/components/game/Police";
import { Powerups } from "@/components/game/Powerups";
import { HUD } from "@/components/ui/HUD";
import { MenuScreen } from "@/components/ui/MenuScreen";
import { GameOverScreen } from "@/components/ui/GameOverScreen";
import { WatchesCornerPanel } from "@/components/ui/WatchesCornerPanel";

// ── Portrait overlay ───────────────────────────────────────────────────────
function PortraitOverlay() {
  const [portrait, setPortrait] = useState(() => window.innerWidth < window.innerHeight);
  useEffect(() => {
    const check = () => setPortrait(window.innerWidth < window.innerHeight);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);
  if (!portrait) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#060614",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui,sans-serif",
    }}>
      <div style={{ fontSize: 72, animation: "spin90 1.2s ease-in-out infinite alternate" }}>📱</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#FFD700", marginTop: 24, textAlign: "center", padding: "0 32px" }}>
        Phone Ghuma Lo!
      </div>
      <div style={{ fontSize: 14, color: "rgba(255,215,0,0.55)", marginTop: 10, textAlign: "center", lineHeight: 1.6, padding: "0 40px" }}>
        Subway Runner landscape mode mein khelta hai.<br />Please apna phone sideways karo.
      </div>
      <style>{`@keyframes spin90{0%{transform:rotate(-15deg)}100%{transform:rotate(15deg)}}`}</style>
    </div>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────
function CameraRig({ isJumping, speed, isDancing, isOnTrain, isJetpack }: { isJumping: boolean; speed: number; isDancing: boolean; isOnTrain: boolean; isJetpack: boolean }) {
  const { camera, size } = useThree();
  const camYRef    = useRef(4.4);
  const camZRef    = useRef(4.4);
  const camXRef    = useRef(0);
  const lookYRef   = useRef(0.5);
  const lookZRef   = useRef(-10);
  const baseFovRef = useRef(72);

  useEffect(() => {
    const aspect = size.width / size.height;
    // Wider FOV for narrow screens so all 3 lanes stay visible
    baseFovRef.current = aspect < 1.0 ? 105 : aspect < 1.3 ? 92 : aspect < 1.6 ? 80 : 72;
    camera.position.set(0, 4.4, 4.4);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov  = baseFovRef.current; pc.near = 0.1; pc.far = 1000;
    pc.updateProjectionMatrix();
    camera.lookAt(0, 0.5, -10);
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const smooth = Math.min(1, delta * 4);
    const base   = baseFovRef.current;

    if (isDancing) {
      camYRef.current  += (1.6 - camYRef.current)   * smooth;
      camZRef.current  += (2.8 - camZRef.current)   * smooth;
      camXRef.current  += (0   - camXRef.current)   * smooth;
      lookYRef.current += (1.1 - lookYRef.current)  * smooth;
      lookZRef.current += (0   - lookZRef.current)  * smooth;
      const pc = camera as THREE.PerspectiveCamera;
      pc.fov += ((base - 14) - pc.fov) * Math.min(1, delta * 3);
      pc.updateProjectionMatrix();
    } else if (isJetpack) {
      camYRef.current  += (9.5 - camYRef.current)  * Math.min(1, delta * 3.5);
      camZRef.current  += (5.5 - camZRef.current)  * smooth;
      camXRef.current  += (0   - camXRef.current)  * smooth;
      lookYRef.current += (5.5 - lookYRef.current) * smooth;
      lookZRef.current += (-10 - lookZRef.current) * smooth;
    } else {
      const targetY = isOnTrain ? 6.0 : (isJumping ? 5.0 : 4.4);
      camYRef.current  += (targetY - camYRef.current) * Math.min(1, delta * 5);
      camZRef.current  += (4.4 - camZRef.current)     * smooth;
      camXRef.current  += (0   - camXRef.current)     * smooth;
      lookYRef.current += ((isOnTrain ? 2.0 : 0.5) - lookYRef.current) * smooth;
      lookZRef.current += (-10 - lookZRef.current)    * smooth;
    }

    camera.position.set(camXRef.current, camYRef.current, camZRef.current);
    camera.lookAt(0, lookYRef.current, lookZRef.current);

    if (!isDancing) {
      const pc = camera as THREE.PerspectiveCamera;
      const targetFov = base + (speed - 8) * 0.5;
      pc.fov += (Math.min(base + 12, targetFov) - pc.fov) * Math.min(1, delta * 2);
      pc.updateProjectionMatrix();
    }
  });

  return null;
}

// ── Powerup ticker (runs inside Canvas so useFrame is available) ──────────
function PowerupTicker() {
  const { gameState, tickPowerup } = useGameStore();
  const playing = gameState === "playing";
  useFrame((_, delta) => {
    if (playing) tickPowerup(delta);
  });
  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────
interface GameSceneProps {
  onHit: () => void;
  onCoin: () => void;
  onTrainHorn: () => void;
  onBigWatch: () => void;
  onDanceEnd: () => void;
  onMountTrain: (lane: number) => void;
  onDismountTrain: () => void;
  isJumping: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
  isHit: boolean;
}

function GameScene({
  onHit, onCoin, onTrainHorn, onBigWatch, onDanceEnd,
  onMountTrain, onDismountTrain,
  isJumping, isSliding, onJumpComplete, isHit,
}: GameSceneProps) {
  const { gameState, speed, lane, powerup, onTrain } = useGameStore();
  const playing  = gameState === "playing";
  const dancing  = gameState === "dancing";
  const dying    = gameState === "dying";
  const active   = playing || dancing || dying;

  const isJetpack = powerup === "jetpack";

  return (
    <>
      <color attach="background" args={["#87CEEB"]} />
      <ambientLight intensity={2.2} color="#FFFFFF" />
      <directionalLight position={[5, 14, 8]}  intensity={3.2} color="#FFF8E0" castShadow={false} />
      <directionalLight position={[-4, 8, 6]}  intensity={1.5} color="#FFFFFF" castShadow={false} />
      <hemisphereLight args={["#87CEEB", "#4aaa30", 1.0]} />

      <PowerupTicker />
      <CameraRig isJumping={isJumping} speed={speed} isDancing={dancing} isOnTrain={onTrain} isJetpack={isJetpack} />
      <Environment speed={speed} playing={playing} />
      <Track speed={speed} playing={playing} />

      <Character
        lane={lane}
        isJumping={isJumping}
        isSliding={isSliding}
        isHit={isHit}
        isDancing={dancing}
        isDying={dying}
        isJetpack={isJetpack}
        isOnTrain={onTrain}
        onJumpComplete={onJumpComplete}
        onDanceEnd={onDanceEnd}
      />

      <Police playerLane={lane} playing={playing} />

      <Obstacles
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerJumping={isJumping}
        playerSliding={isSliding}
        playerOnTrain={onTrain}
        playerJetpack={isJetpack}
        onHit={onHit}
        onCoin={onCoin}
        onTrainHorn={onTrainHorn}
        onMountTrain={onMountTrain}
        onDismountTrain={onDismountTrain}
      />

      <Coins
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        onCollect={onCoin}
      />

      {playing && (
        <Powerups
          speed={speed}
          playing={playing}
          playerLane={lane + 1}
        />
      )}

      {active && !isJetpack && (
        <BigWatch
          speed={speed}
          playing={playing}
          playerLane={lane + 1}
          onCollect={onBigWatch}
        />
      )}
    </>
  );
}

// ── WebGL guard ───────────────────────────────────────────────────────────
function WebGLCheck({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const cvs = document.createElement("canvas");
    setOk(!!(cvs.getContext("webgl") || cvs.getContext("experimental-webgl")));
  }, []);
  if (ok === null) return null;
  if (!ok) return (
    <div style={{ position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#87CEEB",color:"#333",fontFamily:"system-ui",textAlign:"center",padding:"40px" }}>
      <div><div style={{fontSize:"48px",marginBottom:"16px"}}>⚠️</div><h2>WebGL Required</h2><p style={{color:"#555"}}>Please open in Chrome or Firefox with hardware acceleration enabled.</p></div>
    </div>
  );
  return <>{children}</>;
}

// ── Score ticker ──────────────────────────────────────────────────────────
function ScoreLoop() {
  const { gameState, addScore } = useGameStore();
  const playing = gameState === "playing";
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!playing) { t.current = 0; return; }
    t.current += delta;
    if (t.current >= 0.1) { t.current = 0; addScore(1); }
  });
  return null;
}

// ── Footstep sound ────────────────────────────────────────────────────────
function FootstepLoop({ isJumping, isSliding, onStep }: { isJumping: boolean; isSliding: boolean; onStep: () => void }) {
  const { gameState, speed } = useGameStore();
  const playing = gameState === "playing";
  const t = useRef(0);
  const cb = useRef(onStep); cb.current = onStep;
  useFrame((_, delta) => {
    if (!playing || isJumping || isSliding) { t.current = 0; return; }
    t.current += delta;
    const interval = Math.max(0.17, 0.42 - speed * 0.012);
    if (t.current >= interval) { t.current = 0; cb.current(); }
  });
  return null;
}

// ── Root component ────────────────────────────────────────────────────────
export function Game() {
  const { gameState, score, highScore, coins, watches, speed, lane, startGame, goToMenu, setSpeed, startDance, endDance, endGame, setOnTrain, addWatch } =
    useGameStore();
  const { play: playSound } = useSound();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [isJumping, setIsJumping]   = useState(false);
  const [isSliding, setIsSliding]   = useState(false);
  const [isHit,     setIsHit]       = useState(false);
  const slideTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dyingTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = gameState === "playing";
  const dancing = gameState === "dancing";
  const dying   = gameState === "dying";

  const handleInput = useCallback(
    (action: "left" | "right" | "jump" | "slide") => {
      if (!playing) return;
      const cur = useGameStore.getState().lane;
      if (action === "left") {
        const next = Math.max(-1, cur - 1) as Lane;
        if (next !== cur) { playSound("slide"); useGameStore.getState().setLane(next); }
      }
      if (action === "right") {
        const next = Math.min(1, cur + 1) as Lane;
        if (next !== cur) { playSound("slide"); useGameStore.getState().setLane(next); }
      }
      if (action === "jump" && !isJumping && !isSliding) {
        playSound("jump"); setIsJumping(true);
      }
      if (action === "slide" && !isJumping && !isSliding) {
        playSound("slide"); setIsSliding(true);
        if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
        slideTimerRef.current = setTimeout(() => setIsSliding(false), 900);
      }
    },
    [playing, isJumping, isSliding, playSound],
  );

  useInput(handleInput, playing);

  const handleHit = useCallback(() => {
    if (useGameStore.getState().gameState !== "playing") return;
    playSound("hit");
    setIsHit(true);
    useGameStore.getState().loseLife();
    setTimeout(() => setIsHit(false), 600);
  }, [playSound]);

  const handleCoin = useCallback(() => {
    playSound("coin");
    useGameStore.getState().addCoin();
  }, [playSound]);

  const handleTrainHorn = useCallback(() => { playSound("trainhorn"); }, [playSound]);
  const handleJumpComplete = useCallback(() => { setIsJumping(false); }, []);

  const handleBigWatch = useCallback(() => {
    playSound("coin");
    useGameStore.getState().addScore(200);
    useGameStore.getState().addWatch();
    startDance();
    startHipHopBeat();
  }, [playSound, startDance]);

  const handleDanceEnd = useCallback(() => {
    stopHipHopBeat();
    endDance();
  }, [endDance]);

  const handleMountTrain = useCallback((_trainLane: number) => {
    setOnTrain(true);
    playSound("jump");
  }, [setOnTrain, playSound]);

  const handleDismountTrain = useCallback(() => {
    setOnTrain(false);
  }, [setOnTrain]);

  // Reset local states on new game
  useEffect(() => {
    if (playing) {
      setIsJumping(false);
      setIsSliding(false);
      setIsHit(false);
      if (slideTimerRef.current) { clearTimeout(slideTimerRef.current); slideTimerRef.current = null; }
      if (dyingTimerRef.current) { clearTimeout(dyingTimerRef.current); dyingTimerRef.current = null; }
    }
  }, [playing]);

  // Dying → game over after 1.2s
  useEffect(() => {
    if (dying) {
      if (dyingTimerRef.current) clearTimeout(dyingTimerRef.current);
      dyingTimerRef.current = setTimeout(() => { endGame(); }, 1200);
    }
    return () => {
      if (dyingTimerRef.current) { clearTimeout(dyingTimerRef.current); dyingTimerRef.current = null; }
    };
  }, [dying, endGame]);

  // Submit score to leaderboard when game ends
  useEffect(() => {
    if (gameState !== "gameover") return;
    if (!user) return;
    const st = useGameStore.getState();
    const email    = user.primaryEmailAddress?.emailAddress ?? "";
    const username = user.fullName || user.username || email.split("@")[0] || "Player";
    (async () => {
      try {
        const token = await getToken();
        await fetch("/api/leaderboard/score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            username,
            watchesCollected: st.coins,   // coins = gold watches picked up during gameplay
            score:            st.score,
            coins:            st.coins,
          }),
        });
      } catch {}
    })();
  }, [gameState, user]);

  // Speed ramp
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const s = useGameStore.getState().speed;
      setSpeed(Math.min(s + 0.15, 22));
    }, 3000);
    return () => clearInterval(id);
  }, [playing, setSpeed]);

  return (
    <WebGLCheck>
      <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", background: "#87CEEB", position: "fixed", inset: 0 }}>
        <Canvas
          shadows={false}
          gl={{ antialias: false, powerPreference: "high-performance", depth: true }}
          dpr={[1, 1.5]}
        >
          <ScoreLoop />
          <FootstepLoop isJumping={isJumping} isSliding={isSliding} onStep={() => playSound("footstep")} />
          <GameScene
            onHit={handleHit}
            onCoin={handleCoin}
            onTrainHorn={handleTrainHorn}
            onBigWatch={handleBigWatch}
            onDanceEnd={handleDanceEnd}
            onMountTrain={handleMountTrain}
            onDismountTrain={handleDismountTrain}
            isJumping={isJumping}
            isSliding={isSliding}
            onJumpComplete={handleJumpComplete}
            isHit={isHit}
          />
        </Canvas>

        <HUD score={score} coins={coins} watches={watches} visible={playing || dancing} />

        {gameState === "menu" && (
          <>
            <WatchesCornerPanel />
            <MenuScreen onStart={startGame} highScore={highScore} />
          </>
        )}
        {gameState === "gameover" && (
          <GameOverScreen score={score} highScore={highScore} coins={coins} onRestart={startGame} onMenu={goToMenu} />
        )}
      </div>
      <PortraitOverlay />
    </WebGLCheck>
  );
}
