import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type ObstacleType = "barrier" | "train" | "box" | "incoming_train" | "low_gate" | "ramp_train";

interface ObstacleData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: ObstacleType;
  jumpable: boolean;
  slideOnly: boolean;
  extraSpeed: number;
  halfZ: number;
  roofWatches?: THREE.Mesh[];
}

interface ObstaclesProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  playerJumping: boolean;
  playerSliding: boolean;
  playerOnTrain: boolean;
  playerJetpack: boolean;
  onHit: () => void;
  onCoin: () => void;
  onTrainHorn: () => void;
  onMountTrain: (lane: number) => void;
  onDismountTrain: () => void;
}

const LANE_X  = [-2.5, 0, 2.5];
const SPAWN_Z = -65;
const PLAYER_Z = 0;
const DESPAWN_Z = 12;

// ── Shared materials (non-train obstacles) ────────────────────────────────
const matOrange  = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const matYellow  = new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.4 });
const matBox     = new THREE.MeshLambertMaterial({ color: 0xD4A020 });
const matBoxEdge = new THREE.MeshLambertMaterial({ color: 0x8B6010, wireframe: true });
const matGate    = new THREE.MeshLambertMaterial({ color: 0xDD3300 });
const matGateDk  = new THREE.MeshLambertMaterial({ color: 0xAA2200 });
const matBlack   = new THREE.MeshLambertMaterial({ color: 0x111111 });
const matYellowT = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });

// ── Loco textures (for incoming train only) ───────────────────────────────
const _txLoader = new THREE.TextureLoader();
let _locoBase: THREE.Texture | null = null;
const _BASE = import.meta.env.BASE_URL as string;
function getLocoBase() { return _locoBase ??= _txLoader.load(`${_BASE}textures/loco_car.jpg`); }
let _locoMat: THREE.MeshLambertMaterial | null = null;
function getLocoMat() { return _locoMat ??= new THREE.MeshLambertMaterial({ map: getLocoBase() }); }

// ── Vibrant train color palette ───────────────────────────────────────────
const TRAIN_COLORS = [
  { body: 0xFF2244, roof: 0xCC1133, accent: 0xFFDD00, win: 0x88CCFF }, // red
  { body: 0x2255FF, roof: 0x1133CC, accent: 0xFFDD00, win: 0xAAEEFF }, // blue
  { body: 0x22CC44, roof: 0x119933, accent: 0xFF8800, win: 0x88FFCC }, // green
  { body: 0xCC22CC, roof: 0x991199, accent: 0xFFFF00, win: 0xFFBBFF }, // purple
  { body: 0x00CCCC, roof: 0x009999, accent: 0xFF4400, win: 0xBBFFFF }, // teal
  { body: 0xFF2288, roof: 0xCC1166, accent: 0xFFFF00, win: 0xFFCCFF }, // pink
  { body: 0xFF9900, roof: 0xCC6600, accent: 0xFFFF00, win: 0xFFEEBB }, // amber
  { body: 0x6633FF, roof: 0x4411CC, accent: 0xFFDD00, win: 0xCCBBFF }, // violet
];

// ── Roof watch collectible ────────────────────────────────────────────────
const roofWatchGeo  = new THREE.TorusGeometry(0.21, 0.055, 8, 22);
const roofWatchMat  = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 0.7 });
const roofWatchGlow = new THREE.MeshLambertMaterial({ color: 0xFFFFAA, emissive: 0xFFFF00, emissiveIntensity: 1.0, transparent: true, opacity: 0.45 });
function makeRoofWatch(localZ: number): THREE.Mesh {
  const g = new THREE.Group() as unknown as THREE.Mesh;
  const ring  = new THREE.Mesh(roofWatchGeo, roofWatchMat);
  ring.rotation.x = Math.PI / 2;
  const glow  = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), roofWatchGlow);
  (g as unknown as THREE.Group).add(ring, glow);
  g.position.set(0, 2.55, localZ);
  g.userData.isRoofWatch = true;
  return g;
}

// ── Canvas draw helper ────────────────────────────────────────────────────
function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}


const matDarkBot = new THREE.MeshLambertMaterial({ color: 0x111122 });

function locoBodyMats() { const m = getLocoMat(); return [m, m, m, matDarkBot, m, m]; }
function locoNoseMats() { const m = getLocoMat(); return [m, m, m, matDarkBot, m, m]; }

// ── Non-train obstacle builders ───────────────────────────────────────────
function makeBarrier(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const bar    = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.3), matOrange);
  bar.position.set(0, 0.3, 0);
  const leg1   = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.3), matOrange);
  leg1.position.set(-0.9, 0.15, 0);
  const leg2   = leg1.clone(); leg2.position.set(0.9, 0.15, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.35), matYellow);
  stripe.position.set(0, 0.56, 0);
  group.add(bar, leg1, leg2, stripe);
  return { mesh: group, lane, z: SPAWN_Z, type: "barrier", jumpable: true, slideOnly: false, extraSpeed: 0, halfZ: 0.2 };
}

function makeLowGate(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const bar    = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.3), matGate);
  bar.position.set(0, 1.05, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.32), matYellow);
  stripe.position.set(0, 1.14, 0);
  const post1  = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.05, 0.3), matGateDk);
  post1.position.set(-1.1, 0.52, 0);
  const post2  = post1.clone(); post2.position.set(1.1, 0.52, 0);
  const diag1  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.32), matYellow);
  diag1.position.set(-1.1, 0.75, 0); diag1.rotation.z = 0.4;
  const diag2  = diag1.clone(); diag2.position.set(1.1, 0.75, 0);
  group.add(bar, stripe, post1, post2, diag1, diag2);
  return { mesh: group, lane, z: SPAWN_Z, type: "low_gate", jumpable: false, slideOnly: true, extraSpeed: 0, halfZ: 0.2 };
}

// ── Vibrant cartoon train car ─────────────────────────────────────────────
function makeTrainCar(lane: number, roofWatchZs?: number[]): ObstacleData {
  const ci  = Math.floor(Math.random() * TRAIN_COLORS.length);
  const pal = TRAIN_COLORS[ci];
  const bodyMat = new THREE.MeshLambertMaterial({ color: pal.body, emissive: pal.body, emissiveIntensity: 0.18 });
  const roofMat = new THREE.MeshLambertMaterial({ color: pal.roof });
  const accMat  = new THREE.MeshLambertMaterial({ color: pal.accent, emissive: pal.accent, emissiveIntensity: 0.4 });
  const winMat  = new THREE.MeshLambertMaterial({ color: pal.win, emissive: pal.win, emissiveIntensity: 0.25 });

  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.5), bodyMat);
  body.position.set(0, 1.1, 0);
  group.add(body);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 4.3), roofMat);
  roof.position.set(0, 2.29, 0);
  group.add(roof);

  // Accent stripe along bottom
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.22, 4.52), accMat);
  stripe.position.set(0, 0.45, 0);
  group.add(stripe);

  // Windows (glass panels on front face)
  for (const wz of [-1.05, 1.05]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 0.12), winMat);
    win.position.set(0, 1.55, wz);
    group.add(win);
  }

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const wz of [-1.5, 1.5]) {
    for (const x of [-1.05, 1.05]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.22, wz);
      group.add(w);
    }
  }

  // Cartoon black outline
  const outline = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 2.28, 4.58),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }),
  );
  outline.position.set(0, 1.1, 0);
  group.add(outline);

  // Roof watch collectibles
  const roofWatches: THREE.Mesh[] = [];
  if (roofWatchZs) {
    for (const rz of roofWatchZs) {
      const w = makeRoofWatch(rz);
      group.add(w);
      roofWatches.push(w);
    }
  }

  return { mesh: group, lane, z: SPAWN_Z, type: 'train', jumpable: false, slideOnly: false, extraSpeed: 0, halfZ: 2.25, roofWatches };
}


// ── Climbable ramp train (multi-car + visible slide ramp at front) ────────
const matRampBody  = new THREE.MeshLambertMaterial({ color: 0xFF6600, emissive: 0xCC3300, emissiveIntensity: 0.3 });
const matRampRoof  = new THREE.MeshLambertMaterial({ color: 0xDD4400 });
const matRampSlide = new THREE.MeshLambertMaterial({ color: 0xFFCC00, emissive: 0xFFAA00, emissiveIntensity: 0.5 });
const matRampArrow = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.8 });

function makeRampTrain(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  // 3 train car bodies (total ~13.5 units long)
  const carPositions = [-4.5, 0, 4.5];
  for (const cz of carPositions) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.0), matRampBody);
    body.position.set(0, 1.1, cz);
    group.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 3.8), matRampRoof);
    roof.position.set(0, 2.29, cz);
    group.add(roof);
    // Outline
    const outline = new THREE.Mesh(new THREE.BoxGeometry(2.18, 2.28, 4.08), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
    outline.position.set(0, 1.1, cz);
    group.add(outline);
  }

  // Connecting platforms between cars
  for (const cz of [-2.25, 2.25]) {
    const conn = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.8), matRampRoof);
    conn.position.set(0, 2.29, cz);
    group.add(conn);
  }

  // Ramp at the FRONT (+Z end, approaches player)
  // The front of car 3 is at z=4.5+2.0=6.5. Ramp extends from z=6.5 to z=8.0
  const rampGeo = new THREE.BoxGeometry(2.0, 0.12, 1.8);
  const ramp    = new THREE.Mesh(rampGeo, matRampSlide);
  ramp.position.set(0, 1.22, 7.3);
  ramp.rotation.x = -0.45;   // slope angle
  group.add(ramp);

  // Arrow chevrons on ramp to signal "climbable"
  for (let i = 0; i < 3; i++) {
    const chevron = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.2), matRampArrow);
    chevron.position.set(0, 1.3 + i * 0.28, 7.6 - i * 0.35);
    chevron.rotation.x = -0.45;
    group.add(chevron);
  }

  // Front bumper/grill
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 0.25), matRampSlide);
  bumper.position.set(0, 0.6, 8.2);
  group.add(bumper);

  return {
    mesh: group,
    lane,
    z: SPAWN_Z,
    type: "ramp_train",
    jumpable: false,
    slideOnly: false,
    extraSpeed: 0,
    halfZ: 8.3,   // front face at ~8.3 units ahead of center
  };
}

// ── Cartoon incoming locomotive ───────────────────────────────────────────
function makeIncomingTrain(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z - 20);

  // Main loco body
  const loco = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 5), locoBodyMats());
  loco.position.set(0, 1.4, 0);
  group.add(loco);

  // Nose (front cowcatcher section) — cartoon FACE goes on its +Z face
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2), locoNoseMats());
  nose.position.set(0, 1.1, 3);
  group.add(nose);

  // Cartoon outline on loco body
  const outlineLoco = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.9, 5.1),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }),
  );
  outlineLoco.position.set(0, 1.4, 0);
  group.add(outlineLoco);

  // Chimney / smoke stack
  const chimneyGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.7, 8);
  const chimney    = new THREE.Mesh(chimneyGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
  chimney.position.set(-0.4, 2.95, 0.5);
  group.add(chimney);

  // Smoke puff ring
  const puffGeo = new THREE.TorusGeometry(0.22, 0.07, 6, 12);
  const puff    = new THREE.Mesh(puffGeo, new THREE.MeshLambertMaterial({ color: 0xDDDDDD, transparent: true, opacity: 0.7 }));
  puff.position.set(-0.4, 3.55, 0.5);
  group.add(puff);

  // Headlight glow — on top of the face texture
  const glowGeo  = new THREE.CircleGeometry(0.25, 10);
  const glowMat  = new THREE.MeshLambertMaterial({ color: 0xFFFFBB, emissive: 0xFFFF88, emissiveIntensity: 2 });
  const gL = new THREE.Mesh(glowGeo, glowMat);
  gL.position.set(-0.55, 1.5, 4.02);
  const gR = gL.clone(); gR.position.set(0.55, 1.5, 4.02);
  group.add(gL, gR);

  // Yellow stripe on wheels / base
  const cowcatcher = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.25, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xFFCC00 }),
  );
  cowcatcher.position.set(0, 0.12, 4.3);
  group.add(cowcatcher);

  // Wheels for loco
  const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const z of [-1.5, 0.5]) {
    for (const x of [-1.1, 1.1]) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.28, z);
      group.add(w);
    }
  }

  return {
    mesh: group,
    lane,
    z: SPAWN_Z - 20,
    type: "incoming_train",
    jumpable: false,
    slideOnly: false,
    extraSpeed: 6,
    halfZ: 4.3,   // nose tip (cowcatcher) is ~4.3 units ahead of group center
  };
}

function makeBox(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const body  = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matBox);
  body.position.set(0, 0.5, 0);
  const edges = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), matBoxEdge);
  edges.position.set(0, 0.5, 0);
  group.add(body, edges);
  return { mesh: group, lane, z: SPAWN_Z, type: "box", jumpable: true, slideOnly: false, extraSpeed: 0, halfZ: 0.51 };
}

// ── Main component ────────────────────────────────────────────────────────
export function Obstacles({
  speed, playing, playerLane, playerJumping, playerSliding, playerOnTrain, playerJetpack,
  onHit, onCoin, onTrainHorn, onMountTrain, onDismountTrain,
}: ObstaclesProps) {
  const { scene } = useThree();
  const groupRef         = useRef<THREE.Group>(new THREE.Group());
  const obsRef           = useRef<ObstacleData[]>([]);
  const spawnTimerRef    = useRef(0);
  const incomingTimerRef = useRef(0);
  const hitCooldownRef    = useRef(0);
  const playerVisualXRef  = useRef(LANE_X[playerLane]);
  const mountedTrainRef   = useRef<ObstacleData | null>(null);
  const prevPlayerLaneRef = useRef(playerLane);
  const onHitRef      = useRef(onHit);
  const onCoinRef     = useRef(onCoin);
  const onHornRef     = useRef(onTrainHorn);
  const onMountRef    = useRef(onMountTrain);
  const onDismountRef = useRef(onDismountTrain);
  onHitRef.current      = onHit;
  onCoinRef.current     = onCoin;
  onHornRef.current     = onTrainHorn;
  onMountRef.current    = onMountTrain;
  onDismountRef.current = onDismountTrain;

  useEffect(() => {
    const g = groupRef.current;
    scene.add(g);
    return () => {
      scene.remove(g);
      obsRef.current.forEach((o) => g.remove(o.mesh));
      obsRef.current = [];
    };
  }, [scene]);

  useEffect(() => {
    const g = groupRef.current;
    obsRef.current.forEach((o) => g.remove(o.mesh));
    obsRef.current = [];
    spawnTimerRef.current    = -1.0;
    incomingTimerRef.current = 0;
    hitCooldownRef.current   = 2.5;
    playerVisualXRef.current = LANE_X[1];
    mountedTrainRef.current  = null;
    prevPlayerLaneRef.current = 1;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    // Keep visual X in sync with the character's actual slide animation.
    // Use a fast lerp (delta*22) so that after ~3 frames at 60fps the player
    // is already 60% of the way across the lane — clearing the tight hit radius quickly.
    const targetX = LANE_X[playerLane];
    playerVisualXRef.current += (targetX - playerVisualXRef.current) * Math.min(1, delta * 22);

    // Detect lane changes for inter-train jumping
    const laneChanged = playerLane !== prevPlayerLaneRef.current;
    prevPlayerLaneRef.current = playerLane;

    spawnTimerRef.current    += delta;
    incomingTimerRef.current += delta;
    if (hitCooldownRef.current > 0) hitCooldownRef.current -= delta;

    // Regular obstacles – denser train spawning
    const interval = Math.max(0.9, 2.8 - speed * 0.07);
    if (spawnTimerRef.current >= interval) {
      spawnTimerRef.current = 0;
      const numObs  = Math.random() < 0.45 ? 2 : 1;
      const used    = new Set<number>();
      for (let i = 0; i < numObs; i++) {
        let lane  = Math.floor(Math.random() * 3);
        let tries = 0;
        while (used.has(lane) && tries < 10) {
          lane = Math.floor(Math.random() * 3); tries++;
        }
        used.add(lane);
        const r = Math.random();
        let obs: ObstacleData;
        if      (r < 0.20) obs = makeBarrier(lane);
        else if (r < 0.52) obs = makeTrainCar(lane);    // 32% trains
        else if (r < 0.66) obs = makeBox(lane);
        else if (r < 0.82) obs = makeLowGate(lane);
        else {                                           // 18% ramp trains + companions
          obs = makeRampTrain(lane);
          // Spawn companion ramp trains in adjacent lanes — player can jump between them
          const adjLanes = [0, 1, 2].filter(l => l !== lane);
          const numComp  = Math.random() < 0.6 ? 2 : 1;
          for (let c = 0; c < numComp && c < adjLanes.length; c++) {
            const compLane = adjLanes[c];
            const comp = makeRampTrain(compLane); // ramp_train so mount/dismount works
            groupRef.current.add(comp.mesh);
            obsRef.current.push(comp);
          }
        }
        groupRef.current.add(obs.mesh);
        obsRef.current.push(obs);
      }
    }

    // Incoming train (more frequent at high speed)
    const incomingInterval = Math.max(10, 18 - speed * 0.3);
    if (incomingTimerRef.current >= incomingInterval) {
      incomingTimerRef.current = 0;
      const obs = makeIncomingTrain(Math.floor(Math.random() * 3));
      groupRef.current.add(obs.mesh);
      obsRef.current.push(obs);
      onHornRef.current();
    }

    // ── Move all obstacles + collision detection ──────────────────────────
    const toRemove: ObstacleData[] = [];
    const frameMove = speed * delta;

    for (const obs of obsRef.current) {
      const actualMove = frameMove + obs.extraSpeed * delta;
      obs.z += actualMove;
      obs.mesh.position.z = obs.z;

      // ── Mounted train: inter-train jump + dismount + roof watches ────────
      if (obs === mountedTrainRef.current) {
        // Collect roof watches while riding
        if (obs.roofWatches) {
          for (let ri = obs.roofWatches.length - 1; ri >= 0; ri--) {
            const rw = obs.roofWatches[ri];
            if (rw.visible) {
              const worldZ = obs.z + rw.position.z;
              if (Math.abs(worldZ - PLAYER_Z) < 1.2) {
                rw.visible = false;
                onCoinRef.current();
              }
            }
          }
        }
        if (laneChanged) {
          // Look for adjacent ramp_train near same Z position (within 20 units)
          const neighbour = obsRef.current.find(
            (o) => o !== obs && o.type === "ramp_train" && o.lane === playerLane
                && Math.abs(o.z - obs.z) < 20,
          );
          if (neighbour) {
            mountedTrainRef.current = neighbour;
            onMountRef.current(neighbour.lane);
          } else {
            mountedTrainRef.current = null;
            onDismountRef.current();
          }
        }
        // Dismount when back end of train passes player
        const trainBackZ = obs.z - obs.halfZ + 1.8;
        if (trainBackZ > PLAYER_Z + 0.4) {
          mountedTrainRef.current = null;
          onDismountRef.current();
        }
        if (obs.z > DESPAWN_Z) toRemove.push(obs);
        continue;
      }

      // Jetpack = full immunity
      if (playerJetpack) { if (obs.z > DESPAWN_Z) toRemove.push(obs); continue; }

      // ── Spatial overlap — computed once for all branches ──────────────
      const dx = Math.abs(LANE_X[obs.lane] - playerVisualXRef.current);
      const hr = obs.type === "incoming_train" ? 1.5
               : (obs.type === "train" || obs.type === "ramp_train") ? 1.3 : 1.1;
      const signedDz   = obs.z - PLAYER_Z;
      const frontReach = obs.halfZ + 0.12 + actualMove;
      const inZone     = dx < hr && signedDz > -frontReach && signedDz < obs.halfZ;

      if (!inZone) { if (obs.z > DESPAWN_Z) toRemove.push(obs); continue; }

      // ── Ramp train: auto-mount — checked BEFORE hit-cooldown so that
      //    mounting companion trains is never blocked by the previous mount ─
      if (obs.type === "ramp_train" && !playerOnTrain) {
        const frontFaceZ = obs.z + obs.halfZ;
        if (frontFaceZ > -2.0 && frontFaceZ < 3.5) {
          hitCooldownRef.current  = 2.8;
          mountedTrainRef.current = obs;
          onMountRef.current(obs.lane);
        }
        // Ramp train never directly kills — either mount or pass
        if (obs.z > DESPAWN_Z) toRemove.push(obs);
        continue;
      }

      // Post-hit invincibility window (doesn't block ramp-train mounts above)
      if (hitCooldownRef.current > 0) { if (obs.z > DESPAWN_Z) toRemove.push(obs); continue; }

      // ── Ground obstacles below elevated player (on ramp train) ───────
      if (playerOnTrain && (obs.type === "barrier" || obs.type === "box" || obs.type === "low_gate")) {
        if (obs.z > DESPAWN_Z) toRemove.push(obs); continue;
      }

      // ── Dodge rules (ground only, no exceptions for trains) ──────────
      let blocked = true;
      if (!playerOnTrain) {
        if (obs.jumpable && playerJumping)  blocked = false; // jump over low barriers/boxes
        if (obs.slideOnly && playerJumping) blocked = true;  // can't jump a low gate
        if (playerSliding && obs.slideOnly) blocked = false; // slide under low gate
        if (obs.jumpable && playerSliding)  blocked = false; // slide under jumpable barrier
        // Trains: NO jump exception — must switch lanes
      }

      if (blocked) {
        hitCooldownRef.current = 2.2;
        onHitRef.current();
      }

      if (obs.z > DESPAWN_Z) toRemove.push(obs);
    }

    for (const obs of toRemove) groupRef.current.remove(obs.mesh);
    obsRef.current = obsRef.current.filter((o) => !toRemove.includes(o));
  });

  return null;
}
