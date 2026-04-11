import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore, Lane } from "@/game/useGameStore";
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

/**
 * Camera sits higher and closer than before, uses lookAt so you always
 * see the track well ahead of the character.
 * Rises slightly when the player jumps for a sense of height.
 */
function CameraRig({ isJumping, speed }: { isJumping: boolean; speed: number }) {
  const { camera } = useThree();
  const camYRef = useRef(4.4);

  useEffect(() => {
    camera.position.set(0, 4.4, 4.4);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov  = 72;
    pc.near = 0.1;
    pc.far  = 1000;
    pc.updateProjectionMatrix();
    camera.lookAt(0, 0.5, -10);
  }, [camera]);

  useFrame((_, delta) => {
    const targetY = isJumping ? 5.0 : 4.4;
    camYRef.current += (targetY - camYRef.current) * Math.min(1, delta * 5);
    camera.position.y = camYRef.current;
    // lookAt a fixed world point so the view always shows what's ahead
    camera.lookAt(0, 0.5, -10);

    // FOV widens slightly at high speed for a rush feeling
    const pc = camera as THREE.PerspectiveCamera;
    const targetFov = 72 + (speed - 8) * 0.5;
    pc.fov += (Math.min(84, targetFov) - pc.fov) * Math.min(1, delta * 2);
    pc.updateProjectionMatrix();
  });

  return null;
}

interface GameSceneProps {
  onHit: () => void;
  onCoin: () => void;
  onTrainHorn: () => void;
  isJumping: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
  isHit: boolean;
}

function GameScene({
  onHit, onCoin, onTrainHorn, isJumping, isSliding, onJumpComplete, isHit,
}: GameSceneProps) {
  const { gameState, speed, lane } = useGameStore();
  const playing = gameState === "playing";

  return (
    <>
      <color attach="background" args={["#111118"]} />
      <ambientLight intensity={1.8} color="#dde0ff" />
      <directionalLight position={[0, 10, 4]} intensity={3.0} color="#FFFFFF" castShadow={false} />
      <pointLight position={[-4, 3, -4]} intensity={2.5} color="#FF5533" distance={20} />
      <pointLight position={[ 4, 3, -8]} intensity={2.5} color="#33AAFF" distance={20} />

      <CameraRig isJumping={isJumping} speed={speed} />
      <Environment speed={speed} playing={playing} />
      <Track speed={speed} playing={playing} />

      <Character
        lane={lane}
        isJumping={isJumping}
        isSliding={isSliding}
        isHit={isHit}
        onJumpComplete={onJumpComplete}
      />

      {/* Police appears briefly at game start then disappears */}
      <Police playerLane={lane} playing={playing} />

      <Obstacles
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        playerJumping={isJumping}
        playerSliding={isSliding}
        onHit={onHit}
        onTrainHorn={onTrainHorn}
      />

      <Coins
        speed={speed}
        playing={playing}
        playerLane={lane + 1}
        onCollect={onCoin}
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
        position: "fixed", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", background: "#87CEEB", color: "#333",
        fontFamily: "system-ui", textAlign: "center", padding: "40px",
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
  const { gameState, addScore } = useGameStore();
  const playing = gameState === "playing";
  const timerRef = useRef(0);

  useFrame((_, delta) => {
    if (!playing) { timerRef.current = 0; return; }
    timerRef.current += delta;
    if (timerRef.current >= 0.1) { timerRef.current = 0; addScore(1); }
  });

  return null;
}

/** Fires footstep sounds rhythmically while the character is running on the ground */
function FootstepLoop({
  isJumping,
  isSliding,
  onStep,
}: {
  isJumping: boolean;
  isSliding: boolean;
  onStep: () => void;
}) {
  const { gameState, speed } = useGameStore();
  const playing = gameState === "playing";
  const stepTimerRef = useRef(0);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  useFrame((_, delta) => {
    if (!playing || isJumping || isSliding) {
      stepTimerRef.current = 0;
      return;
    }
    stepTimerRef.current += delta;
    // Step interval: ~0.38s at normal speed, shrinks as player speeds up
    const interval = Math.max(0.17, 0.42 - speed * 0.012);
    if (stepTimerRef.current >= interval) {
      stepTimerRef.current = 0;
      onStepRef.current();
    }
  });

  return null;
}

export function Game() {
  const { gameState, score, highScore, lives, coins, speed, lane, startGame, goToMenu, setSpeed } =
    useGameStore();
  const { play: playSound } = useSound();

  const [isJumping, setIsJumping] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = gameState === "playing";

  const handleInput = useCallback(
    (action: "left" | "right" | "jump" | "slide") => {
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
      if (action === "jump" && !isJumping && !isSliding) {
        playSound("jump");
        setIsJumping(true);
      }
      if (action === "slide" && !isJumping && !isSliding) {
        playSound("slide");
        setIsSliding(true);
        if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
        slideTimerRef.current = setTimeout(() => setIsSliding(false), 900);
      }
    },
    [playing, isJumping, isSliding, playSound],
  );

  useInput(handleInput, playing);

  const handleHit = useCallback(() => {
    playSound("hit");
    setIsHit(true);
    useGameStore.getState().loseLife();
    setTimeout(() => setIsHit(false), 600);
  }, [playSound]);

  const handleCoin = useCallback(() => {
    playSound("coin");
    useGameStore.getState().addCoin();
  }, [playSound]);

  // Keep the train horn sound, just no visual popup
  const handleTrainHorn = useCallback(() => {
    playSound("trainhorn");
  }, [playSound]);

  const handleJumpComplete = useCallback(() => {
    setIsJumping(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const s = useGameStore.getState().speed;
      setSpeed(Math.min(s + 0.15, 22));
    }, 3000);
    return () => clearInterval(interval);
  }, [playing, setSpeed]);

  const handleStart = useCallback(() => { startGame(); }, [startGame]);

  return (
    <WebGLCheck>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#87CEEB" }}>
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
            isJumping={isJumping}
            isSliding={isSliding}
            onJumpComplete={handleJumpComplete}
            isHit={isHit}
          />
        </Canvas>

        <HUD score={score} lives={lives} coins={coins} visible={playing} />

        {gameState === "menu" && (
          <MenuScreen onStart={handleStart} highScore={highScore} />
        )}
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
