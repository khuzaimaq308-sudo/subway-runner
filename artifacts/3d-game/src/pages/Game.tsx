import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useGameStore, Lane } from "@/game/useGameStore";
import { useVoice } from "@/game/useVoice";
import { useInput } from "@/game/useInput";
import { Character } from "@/components/game/Character";
import { Track } from "@/components/game/Track";
import { Obstacles } from "@/components/game/Obstacles";
import { Coins } from "@/components/game/Coins";
import { Environment } from "@/components/game/Environment";
import { HUD } from "@/components/ui/HUD";
import { MenuScreen } from "@/components/ui/MenuScreen";
import { GameOverScreen } from "@/components/ui/GameOverScreen";

function GameScene() {
  const { gameState, speed, lane, addScore, addCoin, setLane, setSpeed, loseLife } = useGameStore();
  const { speak } = useVoice();

  const [isJumping, setIsJumping] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [playerY, setPlayerY] = useState(0);

  const playing = gameState === "playing";
  const scoreTimerRef = useRef(0);
  const milestoneRef = useRef(0);

  const handleInput = useCallback((action: "left" | "right" | "jump") => {
    if (!playing) return;
    const currentLane = useGameStore.getState().lane;
    if (action === "left") setLane(Math.max(-1, currentLane - 1) as Lane);
    if (action === "right") setLane(Math.min(1, currentLane + 1) as Lane);
    if (action === "jump" && !isJumping) setIsJumping(true);
  }, [playing, isJumping, setLane]);

  useInput(handleInput, playing);

  const handleHit = useCallback(() => {
    speak("hit");
    setIsHit(true);
    loseLife();
    setTimeout(() => setIsHit(false), 600);
  }, [speak, loseLife]);

  const handleCoin = useCallback(() => {
    speak("coin");
    addCoin();
  }, [speak, addCoin]);

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
      const newSpeed = Math.min(currentSpeed + 0.15, 22);
      setSpeed(newSpeed);
    }, 3000);
    return () => clearInterval(interval);
  }, [playing, setSpeed]);

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

  return (
    <>
      <color attach="background" args={["#87CEEB"]} />
      <ambientLight intensity={1.8} color="#FFFFFF" />
      <directionalLight
        position={[8, 20, 10]}
        intensity={2.5}
        color="#FFF9E6"
        castShadow={false}
      />
      <hemisphereLight args={["#87CEEB", "#7CFC00", 0.6]} />

      <PerspectiveCamera makeDefault position={[0, 4.5, 8]} fov={65} rotation={[-0.2, 0, 0]} />

      <Environment speed={speed} playing={playing} />
      <Track speed={speed} playing={playing} />

      <Character
        lane={lane}
        isJumping={isJumping}
        isHit={isHit}
        onJumpComplete={handleJumpComplete}
      />

      <Obstacles
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerJumping={isJumping}
        onHit={handleHit}
      />

      <Coins
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerY={playerY}
        onCollect={handleCoin}
      />
    </>
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

export function Game() {
  const { gameState, score, highScore, lives, coins, startGame, goToMenu } = useGameStore();
  const { speak } = useVoice();

  const handleStart = useCallback(() => {
    speak("start");
    startGame();
  }, [speak, startGame]);

  return (
    <WebGLCheck>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#87CEEB" }}>
        <Canvas
          shadows={false}
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            depth: true,
          }}
          frameloop="always"
          dpr={[1, 1.5]}
        >
          <GameScene />
        </Canvas>

        <HUD score={score} lives={lives} coins={coins} visible={gameState === "playing"} />

        {gameState === "menu" && <MenuScreen onStart={handleStart} highScore={highScore} />}
        {gameState === "gameover" && (
          <GameOverScreen
            score={score}
            highScore={highScore}
            coins={coins}
            onRestart={handleStart}
            onMenu={goToMenu}
          />
        )}
      </div>
    </WebGLCheck>
  );
}
