import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrackProps {
  speed: number;
  playing: boolean;
}

const TRACK_LENGTH = 60;
const TRACK_COUNT  = 4;

const LANE_X   = [-2.5, 0, 2.5] as const;
const RAIL_GAP = 0.44;
const TIE_W    = 1.08;
const TIE_D    = 0.22;
const TIE_H    = 0.10;
const TIE_INT  = 1.1;
const TIE_COUNT = Math.ceil(TRACK_LENGTH / TIE_INT) + 2;
const ACCENT    = ["#FF3333", "#3399FF", "#33DD55"] as const;

// Wall & greenery layout
const WALL_X  = 11;    // wall centre distance from track centre
const WALL_H  = 14;    // wall height
const WALL_T  = 0.5;   // wall thickness
const GREEN_X = 7.5;   // centre of greenery strip (between platform edge ~5.1 and wall ~10.75)

// ── Red Brick Texture (procedural, clean) ───────────────────────────────
let _brickTex: THREE.CanvasTexture | null = null;

function makeBrickTex(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const cvs = document.createElement("canvas");
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext("2d")!;

  const MORTAR    = "#C8B49A";
  const BRICK_A   = "#B23020";
  const BRICK_B   = "#9E2818";
  const BRICK_C   = "#C84030";

  // Mortar background
  ctx.fillStyle = MORTAR;
  ctx.fillRect(0, 0, W, H);

  const BW = 64, BH = 28, GAP = 4; // brick width, height, mortar gap

  const brickColors = [BRICK_A, BRICK_B, BRICK_C];

  for (let row = 0; row * (BH + GAP) < H + BH; row++) {
    const offset = row % 2 === 0 ? 0 : BW / 2;
    const y = row * (BH + GAP);
    for (let col = -1; col * (BW + GAP) - offset < W + BW; col++) {
      const x = col * (BW + GAP) - offset;
      // Slight random shade variation per brick
      const shade = brickColors[(row * 7 + col * 3) % brickColors.length];
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, BW - 2, BH - 2);

      // Subtle highlight on top edge of each brick
      ctx.fillStyle = "rgba(255,180,160,0.18)";
      ctx.fillRect(x + 2, y + 2, BW - 2, 4);

      // Subtle shadow on bottom edge
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + 2, y + BH - 6, BW - 2, 4);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // 4 repeats along length (60/4=15 world-units per repeat), 3 vertically
  tex.repeat.set(4, 3);
  return tex;
}

function getBrickTex() { return _brickTex ??= makeBrickTex(); }

let _brickMat: THREE.MeshLambertMaterial | null = null;
function getBrickMat() {
  return _brickMat ??= new THREE.MeshLambertMaterial({ map: getBrickTex() });
}

// ── Crosstie instanced mesh ──────────────────────────────────────────────
const _dummy = new THREE.Object3D();

function Ties({ lx }: { lx: number }) {
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
      <meshLambertMaterial color="#6b4a18" />
    </instancedMesh>
  );
}

// ── Greenery strip (grass + bushes + trees) per tile side ───────────────
// Pre-defined bush/tree positions per tile (seeded, not random so they're stable)
const BUSH_DEFS = Array.from({ length: 8 }, (_, i) => ({
  z:  -TRACK_LENGTH / 2 + (i + 0.5) * (TRACK_LENGTH / 8),
  sz: 0.6 + ((i * 137) % 7) * 0.08,   // scale 0.6–1.1
  isBig: i % 3 === 0,
}));

const TREE_DEFS = Array.from({ length: 5 }, (_, i) => ({
  z: -TRACK_LENGTH / 2 + (i + 0.5) * (TRACK_LENGTH / 5),
}));

function GreeneryStrip({ side }: { side: "left" | "right" }) {
  const sx = side === "left" ? -GREEN_X : GREEN_X;
  const wallFace = side === "left" ? -1 : 1;

  return (
    <group>
      {/* Grass ground strip */}
      <mesh position={[sx, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.2, TRACK_LENGTH]} />
        <meshLambertMaterial color="#3a9c2a" />
      </mesh>

      {/* Bushes */}
      {BUSH_DEFS.map((b, i) => (
        <group key={i} position={[sx + wallFace * 0.2, 0, b.z]}>
          {/* Mound base */}
          <mesh position={[0, b.sz * 0.35, 0]} scale={[b.sz * 1.1, b.sz * 0.7, b.sz * 1.0]}>
            <sphereGeometry args={[0.55, 8, 6]} />
            <meshLambertMaterial color="#2d8a1f" />
          </mesh>
          {/* Top cluster */}
          <mesh position={[0, b.sz * 0.75, 0]} scale={[b.sz * 0.75, b.sz * 0.65, b.sz * 0.75]}>
            <sphereGeometry args={[0.45, 7, 5]} />
            <meshLambertMaterial color="#33a022" />
          </mesh>
        </group>
      ))}

      {/* Trees */}
      {TREE_DEFS.map((t, i) => (
        <group key={i} position={[sx + wallFace * 1.0, 0, t.z]}>
          {/* Trunk */}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 2.0, 7]} />
            <meshLambertMaterial color="#6b3c10" />
          </mesh>
          {/* Canopy lower */}
          <mesh position={[0, 2.8, 0]}>
            <coneGeometry args={[1.1, 2.0, 8]} />
            <meshLambertMaterial color="#1e7a10" />
          </mesh>
          {/* Canopy upper */}
          <mesh position={[0, 3.9, 0]}>
            <coneGeometry args={[0.75, 1.6, 8]} />
            <meshLambertMaterial color="#27a018" />
          </mesh>
        </group>
      ))}
    </group>
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

      {/* ── Static infinite green ground ── */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 10_000]} />
        <meshLambertMaterial color="#3a9c2a" />
      </mesh>

      {/* Concrete platform under tracks */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[10.2, 0.08, 10_000]} />
        <meshLambertMaterial color="#5c5c6e" />
      </mesh>

      {/* ── Brick walls — static (no scroll needed, far away) ── */}
      {([-1, 1] as const).map((dir, wi) => (
        <group key={wi}>
          {/* Wall face (brick texture, facing inward) */}
          <mesh
            position={[dir * (WALL_X + WALL_T / 2), WALL_H / 2, 0]}
            rotation={[0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            material={getBrickMat()}
          >
            <planeGeometry args={[10_000, WALL_H]} />
          </mesh>
          {/* Wall back slab */}
          <mesh position={[dir * (WALL_X + WALL_T), WALL_H / 2, 0]}>
            <boxGeometry args={[WALL_T, WALL_H, 10_000]} />
            <meshLambertMaterial color="#8c5030" />
          </mesh>
          {/* Concrete coping on top of wall */}
          <mesh position={[dir * (WALL_X + WALL_T / 2), WALL_H + 0.18, 0]}>
            <boxGeometry args={[WALL_T + 0.3, 0.35, 10_000]} />
            <meshLambertMaterial color="#aaaaaa" />
          </mesh>
        </group>
      ))}

      {/* ── Scrolling tiles (track + greenery) ── */}
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

          {/* Per-lane rails, ties and accent glow */}
          {LANE_X.map((lx, li) => (
            <group key={li}>
              <mesh position={[lx, 0.07, 0]}>
                <boxGeometry args={[1.6, 0.05, TRACK_LENGTH]} />
                <meshLambertMaterial color={ACCENT[li]} transparent opacity={0.22} />
              </mesh>
              <Ties lx={lx} />
              <mesh position={[lx - RAIL_GAP, 0.19, 0]}>
                <boxGeometry args={[0.09, 0.15, TRACK_LENGTH]} />
                <meshLambertMaterial color="#c0c0cc" />
              </mesh>
              <mesh position={[lx + RAIL_GAP, 0.19, 0]}>
                <boxGeometry args={[0.09, 0.15, TRACK_LENGTH]} />
                <meshLambertMaterial color="#c0c0cc" />
              </mesh>
              <mesh position={[lx - RAIL_GAP, 0.275, 0]}>
                <boxGeometry args={[0.09, 0.025, TRACK_LENGTH]} />
                <meshLambertMaterial color={ACCENT[li]} emissive={ACCENT[li]} emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[lx + RAIL_GAP, 0.275, 0]}>
                <boxGeometry args={[0.09, 0.025, TRACK_LENGTH]} />
                <meshLambertMaterial color={ACCENT[li]} emissive={ACCENT[li]} emissiveIntensity={0.9} />
              </mesh>
            </group>
          ))}

          {/* ── Greenery on each side ── */}
          <GreeneryStrip side="left"  />
          <GreeneryStrip side="right" />

        </group>
      ))}

    </group>
  );
}
