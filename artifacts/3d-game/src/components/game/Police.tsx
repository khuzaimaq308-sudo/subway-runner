import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PoliceProps {
  playerLane: number;
  playing: boolean;
  speed: number;
}

const LANE_X = [-2.5, 0, 2.5];

export function Police({ playerLane, playing, speed }: PoliceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const runCycleRef = useRef(0);
  const closingDistRef = useRef(6.5);
  const currentXRef = useRef(LANE_X[playerLane + 1] ?? 0);
  const badgeFlashRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (playing) {
      runCycleRef.current += delta * 9;

      const minDist = 4.0;
      const closing = 0.04 * delta;
      closingDistRef.current = Math.max(minDist, closingDistRef.current - closing * speed);

      groupRef.current.position.z = closingDistRef.current;

      const targetX = LANE_X[playerLane + 1] ?? 0;
      currentXRef.current += (targetX - currentXRef.current) * Math.min(1, delta * 6);
      groupRef.current.position.x = currentXRef.current;

      groupRef.current.position.y = Math.abs(Math.sin(runCycleRef.current * 0.5)) * 0.08;

      badgeFlashRef.current += delta * 3;
    } else {
      closingDistRef.current = 6.5;
      groupRef.current.position.z = 6.5;
    }

    const swing = Math.sin(runCycleRef.current) * (playing ? 0.55 : 0);
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.8;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.8;
  });

  const badgeGlow = Math.sin(badgeFlashRef.current) > 0 ? "#FFD700" : "#CCAA00";

  return (
    <group ref={groupRef} position={[0, 0, 6.5]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.3]} />
        <meshLambertMaterial color="#1A3A7A" />
      </mesh>

      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.42]} />
        <meshLambertMaterial color="#F5C5A0" />
      </mesh>

      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[0.52, 0.22, 0.46]} />
        <meshLambertMaterial color="#111133" />
      </mesh>
      <mesh position={[0, 1.52, 0.08]}>
        <boxGeometry args={[0.1, 0.12, 0.06]} />
        <meshLambertMaterial color="#FFDD00" />
      </mesh>

      <mesh position={[-0.12, 1.32, 0.22]}>
        <boxGeometry args={[0.09, 0.07, 0.04]} />
        <meshLambertMaterial color="#1A1A1A" />
      </mesh>
      <mesh position={[0.12, 1.32, 0.22]}>
        <boxGeometry args={[0.09, 0.07, 0.04]} />
        <meshLambertMaterial color="#1A1A1A" />
      </mesh>

      <mesh position={[0.12, 0.78, 0.16]}>
        <boxGeometry args={[0.14, 0.12, 0.05]} />
        <meshLambertMaterial color={badgeGlow} emissive={badgeGlow} emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.55, 0.12, 0.32]} />
        <meshLambertMaterial color="#0A2050" />
      </mesh>

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
