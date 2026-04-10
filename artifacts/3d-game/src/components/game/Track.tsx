import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrackProps {
  speed: number;
  playing: boolean;
}

const TRACK_LENGTH = 60;
const TRACK_COUNT = 4;

export function Track({ speed, playing }: TrackProps) {
  const tilesRef = useRef<THREE.Mesh[]>([]);
  const buildingsRef = useRef<THREE.Group[]>([]);
  const offsetRef = useRef(0);

  const tilePositions = useMemo(() => {
    return Array.from({ length: TRACK_COUNT }, (_, i) => i * TRACK_LENGTH - TRACK_LENGTH * 1.5);
  }, []);

  useFrame((_, delta) => {
    if (!playing) return;
    offsetRef.current += speed * delta;

    tilesRef.current.forEach((tile, i) => {
      if (!tile) return;
      const base = tilePositions[i];
      let z = base + (offsetRef.current % (TRACK_LENGTH * TRACK_COUNT));
      if (z > TRACK_LENGTH * 2) z -= TRACK_LENGTH * TRACK_COUNT;
      tile.position.z = z;
    });

    buildingsRef.current.forEach((building, i) => {
      if (!building) return;
      const base = tilePositions[i % TRACK_COUNT];
      let z = base + (offsetRef.current % (TRACK_LENGTH * TRACK_COUNT));
      if (z > TRACK_LENGTH * 2) z -= TRACK_LENGTH * TRACK_COUNT;
      building.position.z = z;
    });
  });

  const railColors = ["#5A5A5A", "#4A4A4A", "#5A5A5A"];

  return (
    <group>
      {tilePositions.map((baseZ, i) => (
        <group key={i}>
          <mesh
            ref={(el) => { if (el) tilesRef.current[i] = el; }}
            position={[0, -0.05, baseZ]}
            receiveShadow
          >
            <boxGeometry args={[9, 0.1, TRACK_LENGTH]} />
            <meshStandardMaterial color="#2C2C2C" />
          </mesh>

          <group ref={(el) => { if (el) buildingsRef.current[i] = el; }} position={[0, 0, baseZ]}>
            {[
              { x: -6, color: "#1A3C5E", h: 12, w: 2.5, d: 8 },
              { x: -8.5, color: "#2E4A3E", h: 8, w: 2, d: 6 },
              { x: 6, color: "#4A1A2E", h: 15, w: 3, d: 8 },
              { x: 9, color: "#1E1E3E", h: 9, w: 2.5, d: 7 },
            ].map((b, j) => (
              <mesh key={j} position={[b.x, b.h / 2, 0]} castShadow>
                <boxGeometry args={[b.w, b.h, b.d]} />
                <meshStandardMaterial color={b.color} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={i} position={[x, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 10000]} />
          <meshStandardMaterial color={railColors[i]} opacity={0.6} transparent />
        </mesh>
      ))}

      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[60, 2, 10000]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
    </group>
  );
}
