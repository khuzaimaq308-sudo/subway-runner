import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrackProps {
  speed: number;
  playing: boolean;
}

const TRACK_LENGTH = 60;
const TRACK_COUNT  = 4;

// Lane centres – must match Obstacles.tsx LANE_X
const LANE_X = [-2.5, 0, 2.5] as const;

// Rail geometry
const RAIL_GAP = 0.44;   // half-gap between rails in a lane

// Crosstie geometry
const TIE_W     = 1.08;
const TIE_D     = 0.22;
const TIE_H     = 0.10;
const TIE_INT   = 1.1;
const TIE_COUNT = Math.ceil(TRACK_LENGTH / TIE_INT) + 2;

// Vibrant accent colours per lane
const ACCENT = ["#FF3333", "#3399FF", "#33DD55"] as const;

const _dummy = new THREE.Object3D();

// ── Instanced crossties for one lane ─────────────────────────────────────
function Ties({ lx, color }: { lx: number; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < TIE_COUNT; i++) {
      _dummy.position.set(lx, TIE_H / 2, -TRACK_LENGTH / 2 + i * TIE_INT);
      _dummy.updateMatrix();
      m.setMatrixAt(i, _dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [lx]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, TIE_COUNT]}>
      <boxGeometry args={[TIE_W, TIE_H, TIE_D]} />
      <meshLambertMaterial color={color} />
    </instancedMesh>
  );
}

// ── Main Track ────────────────────────────────────────────────────────────
export function Track({ speed, playing }: TrackProps) {
  const tilesRef  = useRef<(THREE.Group | null)[]>([]);
  const offsetRef = useRef(0);

  const tilePositions = useMemo(
    () => Array.from({ length: TRACK_COUNT }, (_, i) => i * TRACK_LENGTH - TRACK_LENGTH * 1.5),
    [],
  );

  useFrame((_, delta) => {
    if (!playing) return;
    offsetRef.current += speed * delta;
    tilesRef.current.forEach((g, i) => {
      if (!g) return;
      const base = tilePositions[i];
      let z = base + (offsetRef.current % (TRACK_LENGTH * TRACK_COUNT));
      if (z > TRACK_LENGTH * 2) z -= TRACK_LENGTH * TRACK_COUNT;
      g.position.z = z;
    });
  });

  return (
    <group>

      {/* ── Static infinite ground ── */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 10_000]} />
        <meshLambertMaterial color="#5aad3c" />
      </mesh>

      {/* Concrete platform under all tracks */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[10.2, 0.08, 10_000]} />
        <meshLambertMaterial color="#5c5c6e" />
      </mesh>

      {/* ── Scrolling tiles ── */}
      {tilePositions.map((baseZ, ti) => (
        <group
          key={ti}
          ref={(el) => { tilesRef.current[ti] = el; }}
          position={[0, 0, baseZ]}
        >
          {/* Dark gravel ballast bed */}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[9.8, 0.08, TRACK_LENGTH]} />
            <meshLambertMaterial color="#3e3e4a" />
          </mesh>

          {/* Per-lane rails, ties and accents */}
          {LANE_X.map((lx, li) => (
            <group key={li}>

              {/* Subtle coloured ballast glow per lane */}
              <mesh position={[lx, 0.07, 0]}>
                <boxGeometry args={[1.6, 0.05, TRACK_LENGTH]} />
                <meshLambertMaterial color={ACCENT[li]} transparent opacity={0.22} />
              </mesh>

              {/* Crossties (instanced for performance) */}
              <Ties lx={lx} color="#6b4a18" />

              {/* Left rail */}
              <mesh position={[lx - RAIL_GAP, 0.19, 0]}>
                <boxGeometry args={[0.09, 0.15, TRACK_LENGTH]} />
                <meshLambertMaterial color="#c0c0cc" />
              </mesh>
              {/* Right rail */}
              <mesh position={[lx + RAIL_GAP, 0.19, 0]}>
                <boxGeometry args={[0.09, 0.15, TRACK_LENGTH]} />
                <meshLambertMaterial color="#c0c0cc" />
              </mesh>

              {/* Glowing accent strip on top of each rail */}
              <mesh position={[lx - RAIL_GAP, 0.275, 0]}>
                <boxGeometry args={[0.09, 0.025, TRACK_LENGTH]} />
                <meshLambertMaterial
                  color={ACCENT[li]}
                  emissive={ACCENT[li]}
                  emissiveIntensity={0.9}
                />
              </mesh>
              <mesh position={[lx + RAIL_GAP, 0.275, 0]}>
                <boxGeometry args={[0.09, 0.025, TRACK_LENGTH]} />
                <meshLambertMaterial
                  color={ACCENT[li]}
                  emissive={ACCENT[li]}
                  emissiveIntensity={0.9}
                />
              </mesh>

            </group>
          ))}

          {/* ── Signal / marker posts between lanes ── */}
          {([-1.25, 1.25] as const).map((dx, pi) =>
            Array.from({ length: Math.ceil(TRACK_LENGTH / 8) }, (_, k) => (
              <group key={`${pi}-${k}`} position={[dx, 0, -TRACK_LENGTH / 2 + k * 8 + 4]}>
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 1.0, 7]} />
                  <meshLambertMaterial color="#dddddd" />
                </mesh>
                <mesh position={[0, 1.06, 0]}>
                  <sphereGeometry args={[0.1, 8, 6]} />
                  <meshLambertMaterial
                    color="#FFE000"
                    emissive="#FFE000"
                    emissiveIntensity={1.4}
                  />
                </mesh>
              </group>
            ))
          )}

          {/* ── Side buildings ── */}
          {[
            { x: -6.2, color: "#E8C97A", h: 12, w: 2.5, d: 8 },
            { x: -9.8, color: "#D4A574", h:  8, w: 2.0, d: 6 },
            { x:  6.2, color: "#A8C4D4", h: 15, w: 3.0, d: 8 },
            { x:  9.8, color: "#C8D8E0", h:  9, w: 2.5, d: 7 },
          ].map((b, j) => (
            <mesh key={j} position={[b.x, b.h / 2, 0]}>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshLambertMaterial color={b.color} />
            </mesh>
          ))}

        </group>
      ))}

    </group>
  );
}
