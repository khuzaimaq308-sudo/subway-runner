import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EnvironmentProps {
  speed: number;
  playing: boolean;
}

export function Environment({ speed, playing }: EnvironmentProps) {
  const treesRef = useRef<THREE.Group[]>([]);
  const offsetRef = useRef(0);

  const treePositions = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      z: i * -7 + 10,
      side: i % 2 === 0 ? -6.5 : 6.5,
      scale: 0.7 + Math.random() * 0.5,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!playing) return;
    offsetRef.current += speed * delta;

    treesRef.current.forEach((tree, i) => {
      if (!tree) return;
      const base = treePositions[i].z;
      let z = base + (offsetRef.current % (7 * treePositions.length));
      if (z > 12) z -= 7 * treePositions.length;
      tree.position.z = z;
    });
  });

  return (
    <group>
      {treePositions.map((pos, i) => (
        <group
          key={i}
          ref={(el) => { if (el) treesRef.current[i] = el; }}
          position={[pos.side, 0, pos.z]}
          scale={[pos.scale, pos.scale, pos.scale]}
        >
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 1.6, 6]} />
            <meshLambertMaterial color="#8B5E3C" />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[1.1, 2.2, 7]} />
            <meshLambertMaterial color="#2E8B3A" />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <coneGeometry args={[0.85, 1.8, 7]} />
            <meshLambertMaterial color="#3AA849" />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.2, 10000]} />
        <meshLambertMaterial color="#888888" />
      </mesh>

      <mesh position={[0, 30, -120]} rotation={[0.15, 0, 0]}>
        <planeGeometry args={[300, 120]} />
        <meshLambertMaterial color="#87CEEB" />
      </mesh>

      {[
        { x: -40, y: 22, z: -80, sx: 18, sy: 8 },
        { x: 20, y: 25, z: -90, sx: 22, sy: 7 },
        { x: -10, y: 20, z: -70, sx: 14, sy: 6 },
        { x: 50, y: 18, z: -75, sx: 16, sy: 5 },
      ].map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <planeGeometry args={[c.sx, c.sy]} />
          <meshLambertMaterial color="#FFFFFF" opacity={0.85} transparent />
        </mesh>
      ))}
    </group>
  );
}
