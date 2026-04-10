import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Lane } from "@/game/useGameStore";

const LANE_X = [-2.5, 0, 2.5];

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  onJumpComplete: () => void;
}

export function Character({ lane, isJumping, isHit, onJumpComplete }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const jumpProgressRef = useRef(0);
  const hitTimerRef = useRef(0);
  const targetXRef = useRef(LANE_X[lane + 1]);
  const currentXRef = useRef(LANE_X[lane + 1]);
  const runCycleRef = useRef(0);

  useEffect(() => {
    targetXRef.current = LANE_X[lane + 1];
  }, [lane]);

  useEffect(() => {
    if (isJumping) jumpProgressRef.current = 0;
  }, [isJumping]);

  useEffect(() => {
    if (isHit) hitTimerRef.current = 0.5;
  }, [isHit]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    currentXRef.current += (targetXRef.current - currentXRef.current) * Math.min(1, delta * 12);
    groupRef.current.position.x = currentXRef.current;

    if (isJumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta * 2.2);
      const jumpY = Math.sin(jumpProgressRef.current * Math.PI) * 2.8;
      groupRef.current.position.y = jumpY;
      if (jumpProgressRef.current >= 1) {
        groupRef.current.position.y = 0;
        onJumpComplete();
      }
    } else {
      groupRef.current.position.y += (0 - groupRef.current.position.y) * 0.3;
    }

    if (hitTimerRef.current > 0) {
      hitTimerRef.current -= delta;
      groupRef.current.rotation.z = Math.sin(hitTimerRef.current * 30) * 0.2;
    } else {
      groupRef.current.rotation.z *= 0.85;
    }

    runCycleRef.current += delta * 8;
    const swing = Math.sin(runCycleRef.current) * 0.5;

    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.8;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.8;

    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(runCycleRef.current * 0.5) * 0.03;
    }
  });

  const skinColor = "#F4C2A1";
  const shirtColor = "#FF4F5E";
  const pantsColor = "#1A2744";
  const shoeColor = "#2C2C2C";
  const hairColor = "#2C1810";
  const eyeColor = "#1A1A1A";

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={bodyRef} position={[0, 0.7, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.3]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      <mesh ref={headRef} position={[0, 1.3, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.42]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      <mesh position={[0, 1.56, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.44]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>

      <mesh position={[-0.13, 1.3, 0.22]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.13, 1.3, 0.22]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>

      <mesh position={[0, 1.22, 0.22]}>
        <boxGeometry args={[0.18, 0.05, 0.04]} />
        <meshStandardMaterial color="#C26060" />
      </mesh>

      <group ref={leftArmRef} position={[-0.38, 0.72, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.38, 0.72, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      <group ref={leftLegRef} position={[-0.15, 0.3, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.22, 0.55, 0.22]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.3]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.15, 0.3, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.22, 0.55, 0.22]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.3]} />
          <meshStandardMaterial color={shoeColor} />
        </mesh>
      </group>
    </group>
  );
}
