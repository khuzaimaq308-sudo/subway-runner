import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useGameStore, Lane } from "@/game/useGameStore";
import { useVoice } from "@/game/useVoice";
import { useSound } from "@/game/useSound";
import { useInput } from "@/game/useInput";
import { Character } from "@/components/game/Character";
import { Track } from "@/components/game/Track";
import { Obstacles } from "@/components/game/Obstacles";
import { Coins } from "@/components/game/Coins";
import { Environment } from "@/components/game/Environment";
import { Police } from "@/components/game/Police";
import { HUD } from "@/components/ui/HUD";
import { MenuScreen } from "@/components/ui/MenuScreen";
import { GameOverScreen } from "@/components/ui/GameOverScreen";

interface GameSceneProps {
  onHit: () => void;
  onCoin: () => void;
  onTrainHorn: () => void;
  isJumping: boolean;
  playerY: number;
  onJumpComplete: () => void;
  isHit: boolean;
}

function GameScene({ onHit, onCoin, onTrainHorn, isJumping, playerY, onJumpComplete, isHit }: GameSceneProps) {
  const { gameState, speed, lane } = useGameStore();
  const playing = gameState === "playing";

  return (
    <>
      <color attach="background" args={["#87CEEB"]} />
      <ambientLight intensity={1.8} color="#FFFFFF" />
      <directionalLight position={[8, 20, 10]} intensity={2.5} color="#FFF9E6" castShadow={false} />
      <hemisphereLight args={["#87CEEB", "#7CFC00", 0.6]} />
      <PerspectiveCamera makeDefault position={[0, 4.5, 8]} fov={65} rotation={[-0.2, 0, 0]} />

      <Environment speed={speed} playing={playing} />
      <Track speed={speed} playing={playing} />

      <Character lane={lane} isJumping={isJumping} isHit={isHit} onJumpComplete={onJumpComplete} />

      <Police playerLane={lane} playing={playing} speed={speed} />

      <Obstacles
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerJumping={isJumping}
        playerY={playerY}
        onHit={onHit}
        onTrainHorn={onTrainHorn}
      />

      <Coins
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerY={playerY}
        onCollect={onCoin}
      />
    </>
  );
}

function TrainWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "rgba(200,0,0,0.85)",
      color: "#fff", fontFamily: "system-ui", fontWeight: 900,
      fontSize: "28px", letterSpacing: "3px",
      padding: "14px 32px", borderRadius: "10px",
      animation: "pulse 0.4s ease-in-out infinite alternate",
      pointerEvents: "none", zIndex: 30,
      textShadow: "0 0 10px rgba(255,100,100,0.8)",
      border: "2px solid rgba(255,255,255,0.5)",
    }}>
      ⚠️ TRAIN INCOMING!
    </div>
  );
}

function WebGLCheck({ children }: { children: React.ReactNode }) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    setWebglAvailable(!!gl);
  }, []);

  if (webglAvailable === null) return null;

  if (!webglAvailable) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#87CEEB", color: "#333", fontFamily: "system-ui", textAlign: "center", padding: "40px"
      }}>
        <div>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ marginBottom: "8px" }}>WebGL Required</h2>
          <p style={{ color: "#555" }}>Please open this in Chrome or Firefox with hardware acceleration enabled.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ScoreLoop() {
  const { gameState, addScore, speed } = useGameStore();
  const playing = gameState === "playing";
  const scoreTimerRef = useRef(0);
  const milestoneRef = useRef(0);
  const { speak } = useVoice();

  useFrame((_, delta) => {
    if (!playing) return;
    scoreTimerRef.current += delta;
    if (scoreTimerRef.current >= 0.1) {
      scoreTimerRef.current = 0;
      addScore(1);
      const score = useGameStore.getState().score;
      const milestone = Math.floor(score / 500);
      if (milestone > milestoneRef.current) {
        milestoneRef.current = milestone;
        speak("milestone");
      }
    }
  });

  useEffect(() => {
    if (!playing) {
      milestoneRef.current = 0;
      scoreTimerRef.current = 0;
    }
  }, [playing]);

  return null;
}

export function Game() {
  const { gameState, score, highScore, lives, coins, speed, lane, startGame, goToMenu, setSpeed } = useGameStore();
  const { speak } = useVoice();
  const { play: playSound } = useSound();

  const [isJumping, setIsJumping] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [playerY, setPlayerY] = useState(0);
  const [trainWarning, setTrainWarning] = useState(false);

  const playing = gameState === "playing";

  const handleInput = useCallback((action: "left" | "right" | "jump") => {
    if (!playing) return;
    const currentLane = useGameStore.getState().lane;
    if (action === "left") {
      const next = Math.max(-1, currentLane - 1) as Lane;
      if (next !== currentLane) { playSound("slide"); useGameStore.getState().setLane(next); }
    }
    if (action === "right") {
      const next = Math.min(1, currentLane + 1) as Lane;
      if (next !== currentLane) { playSound("slide"); useGameStore.getState().setLane(next); }
    }
    if (action === "jump" && !isJumping) {
      playSound("jump");
      setIsJumping(true);
    }
  }, [playing, isJumping, playSound]);

  useInput(handleInput, playing);

  const handleHit = useCallback(() => {
    playSound("hit");
    speak("hit");
    setIsHit(true);
    useGameStore.getState().loseLife();
    setTimeout(() => setIsHit(false), 600);
  }, [playSound, speak]);

  const handleCoin = useCallback(() => {
    playSound("coin");
    speak("coin");
    useGameStore.getState().addCoin();
  }, [playSound, speak]);

  const handleTrainHorn = useCallback(() => {
    playSound("trainhorn");
    setTrainWarning(true);
    setTimeout(() => setTrainWarning(false), 2500);
  }, [playSound]);

  const handleJumpComplete = useCallback(() => {
    setIsJumping(false);
    setPlayerY(0);
  }, []);

  useEffect(() => {
    if (isJumping) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        const y = Math.sin(progress * Math.PI) * 2.8;
        setPlayerY(y);
        if (progress >= 1) {
          clearInterval(interval);
          setPlayerY(0);
        }
      }, 16);
      return () => clearInterval(interval);
    }
  }, [isJumping]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const currentSpeed = useGameStore.getState().speed;
      setSpeed(Math.min(currentSpeed + 0.15, 22));
    }, 3000);
    return () => clearInterval(interval);
  }, [playing, setSpeed]);

  const handleStart = useCallback(() => {
    speak("start");
    startGame();
  }, [speak, startGame]);

  return (
    <WebGLCheck>
      <style>{`
        @keyframes pulse {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0.8; transform: translate(-50%, -50%) scale(1.04); }
        }
      `}</style>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#87CEEB" }}>
        <Canvas
          shadows={false}
          gl={{ antialias: false, powerPreference: "high-performance", depth: true }}
          dpr={[1, 1.5]}
        >
          <ScoreLoop />
          <GameScene
            onHit={handleHit}
            onCoin={handleCoin}
            onTrainHorn={handleTrainHorn}
            isJumping={isJumping}
            playerY={playerY}
            onJumpComplete={handleJumpComplete}
            isHit={isHit}
          />
        </Canvas>

        <HUD score={score} lives={lives} coins={coins} visible={playing} />
        <TrainWarning visible={trainWarning && playing} />

        {gameState === "menu" && <MenuScreen onStart={handleStart} highScore={highScore} />}
        {gameState === "gameover" && (
          <GameOverScreen score={score} highScore={highScore} coins={coins} onRestart={handleStart} onMenu={goToMenu} />
        )}
      </div>
    </WebGLCheck>
  );
}
