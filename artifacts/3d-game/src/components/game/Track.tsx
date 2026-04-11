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

// ── Graffiti wall constants ──────────────────────────────────────────────
const WALL_X  = 5.5;   // distance from centre to wall inner face
const WALL_H  = 22;    // very tall – sky is completely blocked
const WALL_T  = 0.5;   // wall thickness

// ── Graffiti texture generator ──────────────────────────────────────────
let _grafL: THREE.CanvasTexture | null = null;
let _grafR: THREE.CanvasTexture | null = null;

function makeGraffitiTex(seed: number): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const cvs = document.createElement("canvas");
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext("2d")!;

  // ── Concrete base ────────────────────────────────────────────────────
  ctx.fillStyle = "#18181f";
  ctx.fillRect(0, 0, W, H);

  // Brick rows
  ctx.globalAlpha = 0.18;
  for (let row = 0; row < H; row += 30) {
    const offset = (row / 30) % 2 === 0 ? 0 : 24;
    for (let col = offset; col < W + 48; col += 48) {
      ctx.fillStyle = "#444";
      ctx.fillRect(col, row, 46, 28);
    }
  }
  ctx.globalAlpha = 1;

  // ── Deterministic RNG ────────────────────────────────────────────────
  let s = seed | 0;
  const rand = () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xFFFFFFFF;
  };

  const palette = [
    "#FF2200","#FF7700","#FFD700","#00EE88",
    "#00AAFF","#AA00FF","#FF0099","#00FFEE","#FF5555",
  ];
  const pick = () => palette[Math.floor(rand() * palette.length)];

  // ── Large background blobs ───────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const cx = rand() * W;
    const cy = 60 + rand() * (H - 120);
    const rx = 90 + rand() * 200;
    const ry = 60 + rand() * 140;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = pick();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // dark outline
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  }

  // ── Bold block letters (3-bar style) ───────────────────────────────
  for (let i = 0; i < 4; i++) {
    const bx = 40 + rand() * (W - 280);
    const by = 40 + rand() * (H - 160);
    const bw = 32 + rand() * 18;
    const bh = 70 + rand() * 50;
    const col = pick();

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = col;
    ctx.fillRect(bx,        by,       bw,      bh);          // left bar
    ctx.fillRect(bx + bw + 8, by,     bw,      bh);          // right bar
    ctx.fillRect(bx,        by + bh / 2 - 6, bw * 2 + 8, 12); // crossbar
    // white outline
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.strokeRect(bx + bw + 8, by, bw, bh);
  }

  // ── Arrow tags ───────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const ax = rand() * W;
    const ay = rand() * H;
    const len = 40 + rand() * 80;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = pick();
    ctx.lineWidth = 5 + rand() * 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + len, ay);
    ctx.lineTo(ax + len - 14, ay - 14);
    ctx.moveTo(ax + len, ay);
    ctx.lineTo(ax + len - 14, ay + 14);
    ctx.stroke();
  }

  // ── Spray-paint drips from top ───────────────────────────────────────
  for (let i = 0; i < 14; i++) {
    const dx = rand() * W;
    const dh = 20 + rand() * 90;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = pick();
    ctx.beginPath();
    ctx.moveTo(dx - 4, 0);
    ctx.lineTo(dx + 4, 0);
    ctx.lineTo(dx + 2.5, dh);
    ctx.ellipse(dx, dh + 7, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Sticker patches ──────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const sx = rand() * W;
    const sy = rand() * H;
    const sw = 18 + rand() * 35;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pick();
    ctx.fillRect(sx, sy, sw, sw * 0.65);
  }

  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cvs);
  // RepeatWrapping on S (Z-axis along wall) so seams align between tiles
  // 3 repeats per tile → each repeat = 20 world-units, tiles always join cleanly
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function getGrafL() { return _grafL ??= makeGraffitiTex(42); }
function getGrafR() { return _grafR ??= makeGraffitiTex(137); }

// ── Shared graffiti wall materials (lazy) ───────────────────────────────
let _matL: THREE.MeshLambertMaterial | null = null;
let _matR: THREE.MeshLambertMaterial | null = null;
function getWallMatL() { return _matL ??= new THREE.MeshLambertMaterial({ map: getGrafL(), side: THREE.FrontSide }); }
function getWallMatR() { return _matR ??= new THREE.MeshLambertMaterial({ map: getGrafR(), side: THREE.FrontSide }); }

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

// ── Graffiti wall plane (faces inward toward track) ─────────────────────
function WallPlane({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  const x      = isLeft ? -(WALL_X + WALL_T / 2) : (WALL_X + WALL_T / 2);
  // rotate so the plane faces inward (+X for left wall, -X for right wall)
  const rotY   = isLeft ? Math.PI / 2 : -Math.PI / 2;
  const mat    = isLeft ? getWallMatL() : getWallMatR();
  return (
    <mesh position={[x, WALL_H / 2, 0]} rotation={[0, rotY, 0]} material={mat}>
      <planeGeometry args={[TRACK_LENGTH, WALL_H]} />
    </mesh>
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

      {/* Infinite concrete floor strip */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[WALL_X * 2 + WALL_T, 0.08, 10_000]} />
        <meshLambertMaterial color="#2a2a35" />
      </mesh>

      {/* Solid wall backs (so you never see through) */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <boxGeometry args={[WALL_X * 2 + WALL_T, WALL_H, 10_000]} />
        <meshLambertMaterial color="#18181f" />
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

          {/* Per-lane rails, ties and accent glow */}
          {LANE_X.map((lx, li) => (
            <group key={li}>

              {/* Colour glow under lane */}
              <mesh position={[lx, 0.07, 0]}>
                <boxGeometry args={[1.6, 0.05, TRACK_LENGTH]} />
                <meshLambertMaterial color={ACCENT[li]} transparent opacity={0.22} />
              </mesh>

              <Ties lx={lx} />

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

              {/* Glowing accent strip */}
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

          {/* ── Graffiti walls ── */}
          <WallPlane side="left"  />
          <WallPlane side="right" />

          {/* Wall top cap (concrete ledge) */}
          <mesh position={[-(WALL_X + WALL_T / 2), WALL_H + 0.15, 0]}>
            <boxGeometry args={[WALL_T + 0.2, 0.3, TRACK_LENGTH]} />
            <meshLambertMaterial color="#2e2e3a" />
          </mesh>
          <mesh position={[(WALL_X + WALL_T / 2), WALL_H + 0.15, 0]}>
            <boxGeometry args={[WALL_T + 0.2, 0.3, TRACK_LENGTH]} />
            <meshLambertMaterial color="#2e2e3a" />
          </mesh>

        </group>
      ))}

    </group>
  );
}
