import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LANE_X = [-2.5, 0, 2.5];
const VISIBLE_SECS = 3.0;   // how long the police appears
const START_Z     = 3.2;    // just behind character from camera's view
const FALL_SPEED  = 3.5;    // how fast it falls off screen after VISIBLE_SECS

interface PoliceProps {
  playerLane: number;
  playing: boolean;
}

export function Police({ playerLane, playing }: PoliceProps) {
  const groupRef     = useRef<THREE.Group>(null);
  const leftArmRef   = useRef<THREE.Group>(null);
  const rightArmRef  = useRef<THREE.Group>(null);
  const leftLegRef   = useRef<THREE.Group>(null);
  const rightLegRef  = useRef<THREE.Group>(null);
  const runCycleRef  = useRef(0);
  const timeRef      = useRef(0);
  const currentXRef  = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    if (!playing) {
      // Reset so next game the police appears fresh
      timeRef.current    = 0;
      runCycleRef.current = 0;
      g.visible = false;
      return;
    }

    timeRef.current += delta;
    const t = timeRef.current;

    // Smooth X lane follow
    const targetX = LANE_X[playerLane + 1] ?? 0;
    currentXRef.current += (targetX - currentXRef.current) * Math.min(1, delta * 5);
    g.position.x = currentXRef.current;

    if (t < VISIBLE_SECS) {
      g.visible = true;
      runCycleRef.current += delta * 10;
      // Sit just behind the player within camera frustum
      g.position.z = START_Z;
      g.position.y = Math.abs(Math.sin(runCycleRef.current * 0.5)) * 0.1;
    } else {
      // Drift back past camera near-plane → automatic clip
      const behind = (t - VISIBLE_SECS) * FALL_SPEED;
      g.position.z = START_Z + behind;
      g.position.y = 0;
      // Hide once well past camera (camera near = 0.1, camera Z ≈ 4.5)
      if (g.position.z > 6.5) g.visible = false;
    }

    // Running arm/leg swing
    const swing = t < VISIBLE_SECS ? Math.sin(runCycleRef.current) * 0.55 : 0;
    if (leftArmRef.current)  leftArmRef.current.rotation.x  =  swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current)  leftLegRef.current.rotation.x  = -swing * 0.8;
    if (rightLegRef.current) rightLegRef.current.rotation.x =  swing * 0.8;
  });

  return (
    <group ref={groupRef} position={[0, 0, START_Z]} visible={false}>
      {/* Torso */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.3]} />
        <meshLambertMaterial color="#1A3A7A" />
      </mesh>

      {/* Belt */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.57, 0.12, 0.32]} />
        <meshLambertMaterial color="#0A2050" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.42]} />
        <meshLambertMaterial color="#F5C5A0" />
      </mesh>

      {/* Cap */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.54, 0.22, 0.48]} />
        <meshLambertMaterial color="#111133" />
      </mesh>
      <mesh position={[0, 1.52, 0.12]}>
        <boxGeometry args={[0.54, 0.06, 0.12]} />
        <meshLambertMaterial color="#111133" />
      </mesh>

      {/* Badge */}
      <mesh position={[0.12, 0.78, 0.16]}>
        <boxGeometry args={[0.14, 0.12, 0.05]} />
        <meshLambertMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.4} />
      </mesh>

      {/* Whistle (right hand) */}
      <mesh position={[0.42, 0.95, 0.1]}>
        <boxGeometry args={[0.06, 0.06, 0.14]} />
        <meshLambertMaterial color="#888888" />
      </mesh>

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.38, 0.72, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <meshLambertMaterial color="#1A3A7A" />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshLambertMaterial color="#F5C5A0" />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.38, 0.72, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <meshLambertMaterial color="#1A3A7A" />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshLambertMaterial color="#F5C5A0" />
        </mesh>
      </group>

      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.14, 0.3, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.22, 0.55, 0.22]} />
          <meshLambertMaterial color="#0A1A4A" />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.3]} />
          <meshLambertMaterial color="#111111" />
        </mesh>
      </group>

      {/* Right leg */}
      <group ref={rightLegRef} position={[0.14, 0.3, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.22, 0.55, 0.22]} />
          <meshLambertMaterial color="#0A1A4A" />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.3]} />
          <meshLambertMaterial color="#111111" />
        </mesh>
      </group>
    </group>
  );
}
