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

  return (
    <group>
      {tilePositions.map((baseZ, i) => (
        <group key={i}>
          <mesh
            ref={(el) => { if (el) tilesRef.current[i] = el; }}
            position={[0, -0.05, baseZ]}
          >
            <boxGeometry args={[9, 0.1, TRACK_LENGTH]} />
            <meshLambertMaterial color="#888888" />
          </mesh>

          <group ref={(el) => { if (el) buildingsRef.current[i] = el; }} position={[0, 0, baseZ]}>
            {[
              { x: -6, color: "#E8C97A", h: 12, w: 2.5, d: 8 },
              { x: -9, color: "#D4A574", h: 8, w: 2, d: 6 },
              { x: 6, color: "#A8C4D4", h: 15, w: 3, d: 8 },
              { x: 9.5, color: "#C8D8E0", h: 9, w: 2.5, d: 7 },
            ].map((b, j) => (
              <mesh key={j} position={[b.x, b.h / 2, 0]}>
                <boxGeometry args={[b.w, b.h, b.d]} />
                <meshLambertMaterial color={b.color} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {[-2.5, 0, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 10000]} />
          <meshLambertMaterial color="#FFFFFF" opacity={0.5} transparent />
        </mesh>
      ))}

      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[60, 2, 10000]} />
        <meshLambertMaterial color="#777777" />
      </mesh>

      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 10000]} />
        <meshLambertMaterial color="#7CBA5C" />
      </mesh>
    </group>
  );
}
