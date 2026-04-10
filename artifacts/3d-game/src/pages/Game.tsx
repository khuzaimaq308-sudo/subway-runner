import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Stars } from "@react-three/drei";
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
  const jumpYRef = useRef(0);

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
    jumpYRef.current = 0;
    setPlayerY(0);
  }, []);

  useEffect(() => {
    if (isJumping) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        const y = Math.sin(progress * Math.PI) * 2.8;
        jumpYRef.current = y;
        setPlayerY(y);
        if (progress >= 1) {
          clearInterval(interval);
          jumpYRef.current = 0;
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
      <color attach="background" args={["#0A0A1A"]} />
      <fog attach="fog" color="#0A0A1A" near={30} far={80} />
      <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <ambientLight intensity={0.3} color="#4060AA" />
      <directionalLight
        position={[5, 12, -5]}
        intensity={1.2}
        color="#FFEECC"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 8, 5]} color="#FF6688" intensity={1.5} distance={25} />
      <pointLight position={[0, 5, -20]} color="#4488FF" intensity={1} distance={30} />

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
        background: "#0A0A1A", color: "#fff", fontFamily: "system-ui", textAlign: "center", padding: "40px"
      }}>
        <div>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ marginBottom: "8px" }}>WebGL Required</h2>
          <p style={{ color: "#aaa" }}>Your browser or device needs WebGL support to run this game. Try opening this in Chrome or Firefox.</p>
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
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0A0A1A" }}>
        <Canvas shadows gl={{ antialias: true, powerPreference: "high-performance" }}>
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
