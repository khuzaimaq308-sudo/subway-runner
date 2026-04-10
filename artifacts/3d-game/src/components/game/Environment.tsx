import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EnvironmentProps {
  speed: number;
  playing: boolean;
}

export function Environment({ speed, playing }: EnvironmentProps) {
  const lampPostsRef = useRef<THREE.Group[]>([]);
  const offsetRef = useRef(0);

  const lampPositions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      z: i * -10 + 10,
      side: i % 2 === 0 ? -5.5 : 5.5,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!playing) return;
    offsetRef.current += speed * delta;

    lampPostsRef.current.forEach((lamp, i) => {
      if (!lamp) return;
      const base = lampPositions[i].z;
      let z = base + (offsetRef.current % (10 * lampPositions.length));
      if (z > 12) z -= 10 * lampPositions.length;
      lamp.position.z = z;
    });
  });

  return (
    <group>
      {lampPositions.map((pos, i) => (
        <group
          key={i}
          ref={(el) => { if (el) lampPostsRef.current[i] = el; }}
          position={[pos.side, 0, pos.z]}
        >
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 5, 6]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[pos.side > 0 ? -0.5 : 0.5, 5, 0]}>
            <boxGeometry args={[1, 0.1, 0.12]} />
            <meshStandardMaterial color="#666" />
          </mesh>
          <mesh position={[pos.side > 0 ? -0.9 : 0.9, 5, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#FFFACD" emissive="#FFFACD" emissiveIntensity={1.5} />
          </mesh>
          <pointLight
            position={[pos.side > 0 ? -0.9 : 0.9, 5, 0]}
            color="#FFFACD"
            intensity={2}
            distance={10}
          />
        </group>
      ))}

      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 10000]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>

      <mesh position={[0, -0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 10000]} />
        <meshStandardMaterial color="#2A2A2A" />
      </mesh>
    </group>
  );
}
