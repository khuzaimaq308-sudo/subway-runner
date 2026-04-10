import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type ObstacleType = "barrier" | "train" | "box" | "incoming_train" | "low_gate";

interface ObstacleData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: ObstacleType;
  /** player can jump over */
  jumpable: boolean;
  /** player must slide under */
  slideOnly: boolean;
  extraSpeed: number;
}

interface ObstaclesProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  playerJumping: boolean;
  playerSliding: boolean;
  onHit: () => void;
  onTrainHorn: () => void;
}

const LANE_X = [-2.5, 0, 2.5];
const SPAWN_Z = -65;
const PLAYER_Z = 0;
const DESPAWN_Z = 12;

// ── shared materials ──────────────────────────────────────────────
const matOrange   = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const matYellow   = new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.4 });
const matRedTrain = new THREE.MeshLambertMaterial({ color: 0xCC2200 });
const matRedDark  = new THREE.MeshLambertMaterial({ color: 0x991100 });
const matWindow   = new THREE.MeshLambertMaterial({ color: 0xAEE4FF, emissive: 0xAEE4FF, emissiveIntensity: 0.2 });
const matBox      = new THREE.MeshLambertMaterial({ color: 0xD4A020 });
const matBoxEdge  = new THREE.MeshLambertMaterial({ color: 0x8B6010, wireframe: true });
const matGreen    = new THREE.MeshLambertMaterial({ color: 0x228822 });
const matGreenDk  = new THREE.MeshLambertMaterial({ color: 0x115511 });
const matYellowT  = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
const matGate     = new THREE.MeshLambertMaterial({ color: 0xDD3300 });
const matGateDk   = new THREE.MeshLambertMaterial({ color: 0xAA2200 });

// ── obstacle builders ────────────────────────────────────────────
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

  return { mesh: group, lane, z: SPAWN_Z, type: "barrier", jumpable: true, slideOnly: false, extraSpeed: 0 };
}

/** Low archway gate — must SLIDE under, jumping does NOT help */
function makeLowGate(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  // Horizontal bar at ~1.05 m — above slide-height (~0.5 m) but below stand-height (~1.8 m)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.3), matGate);
  bar.position.set(0, 1.05, 0);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.32), matYellow);
  stripe.position.set(0, 1.14, 0);

  const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.05, 0.3), matGateDk);
  post1.position.set(-1.1, 0.52, 0);
  const post2 = post1.clone(); post2.position.set(1.1, 0.52, 0);

  // Diagonal hazard stripe on posts
  const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.32), matYellow);
  diag1.position.set(-1.1, 0.75, 0); diag1.rotation.z = 0.4;
  const diag2 = diag1.clone(); diag2.position.set(1.1, 0.75, 0);

  group.add(bar, stripe, post1, post2, diag1, diag2);
  return { mesh: group, lane, z: SPAWN_Z, type: "low_gate", jumpable: false, slideOnly: true, extraSpeed: 0 };
}

function makeTrainCar(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.5), matRedTrain);
  body.position.set(0, 1.1, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 4.3), matRedDark);
  roof.position.set(0, 2.3, 0);

  for (const zOff of [-2.2, 2.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), matWindow);
    [-0.55, 0.55].forEach((x) => {
      const w = win.clone(); w.position.set(x, 1.5, zOff); group.add(w);
    });
  }
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.15, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  );
  wheel.rotation.z = Math.PI / 2;
  for (const z of [-1.5, 1.5]) for (const x of [-1.05, 1.05]) {
    const w = wheel.clone(); w.position.set(x, 0.22, z); group.add(w);
  }
  group.add(body, roof);

  return { mesh: group, lane, z: SPAWN_Z, type: "train", jumpable: false, slideOnly: false, extraSpeed: 0 };
}

function makeIncomingTrain(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z - 20);

  const loco = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 5), matGreen);
  loco.position.set(0, 1.4, 0);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2), matGreenDk);
  nose.position.set(0, 1.1, 3);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 6), matYellowT);
  horn.position.set(-0.4, 2.9, 0.5);
  const headlight = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 8),
    new THREE.MeshLambertMaterial({ color: 0xFFFFAA, emissive: 0xFFFF88, emissiveIntensity: 1 }),
  );
  headlight.position.set(0, 1.5, 3.99);
  group.add(loco, nose, horn, headlight);

  return { mesh: group, lane, z: SPAWN_Z - 20, type: "incoming_train", jumpable: false, slideOnly: false, extraSpeed: 6 };
}

function makeBox(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const body  = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matBox);
  body.position.set(0, 0.5, 0);
  const edges = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), matBoxEdge);
  edges.position.set(0, 0.5, 0);
  group.add(body, edges);
  return { mesh: group, lane, z: SPAWN_Z, type: "box", jumpable: true, slideOnly: false, extraSpeed: 0 };
}

// ── main component ────────────────────────────────────────────────
export function Obstacles({
  speed, playing, playerLane, playerJumping, playerSliding, onHit, onTrainHorn,
}: ObstaclesProps) {
  const { scene } = useThree();
  const groupRef        = useRef<THREE.Group>(new THREE.Group());
  const obsRef          = useRef<ObstacleData[]>([]);
  const spawnTimerRef   = useRef(0);
  const incomingTimerRef = useRef(0);
  const hitCooldownRef  = useRef(0);
  const onHitRef   = useRef(onHit);
  const onHornRef  = useRef(onTrainHorn);
  onHitRef.current  = onHit;
  onHornRef.current = onTrainHorn;

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
    spawnTimerRef.current    = 0;
    incomingTimerRef.current = 0;
    hitCooldownRef.current   = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    spawnTimerRef.current    += delta;
    incomingTimerRef.current += delta;
    if (hitCooldownRef.current > 0) hitCooldownRef.current -= delta;

    // ── spawn regular obstacles ──
    const interval = Math.max(0.9, 2.4 - speed * 0.07);
    if (spawnTimerRef.current >= interval) {
      spawnTimerRef.current = 0;

      const numObs  = Math.random() < 0.3 ? 2 : 1;
      const safeLane = Math.floor(Math.random() * 3);
      const used     = new Set<number>();

      for (let i = 0; i < numObs; i++) {
        let lane = Math.floor(Math.random() * 3);
        let tries = 0;
        while ((used.has(lane) || (numObs > 1 && lane === safeLane)) && tries < 8) {
          lane = Math.floor(Math.random() * 3); tries++;
        }
        used.add(lane);

        const r = Math.random();
        let obs: ObstacleData;
        if      (r < 0.22) obs = makeBarrier(lane);   // jump OR slide
        else if (r < 0.44) obs = makeTrainCar(lane);  // jump over
        else if (r < 0.60) obs = makeBox(lane);       // jump over
        else               obs = makeLowGate(lane);   // slide ONLY

        groupRef.current.add(obs.mesh);
        obsRef.current.push(obs);
      }
    }

    // ── incoming train ──
    const incomingInterval = Math.max(12, 20 - speed * 0.3);
    if (incomingTimerRef.current >= incomingInterval) {
      incomingTimerRef.current = 0;
      const obs = makeIncomingTrain(Math.floor(Math.random() * 3));
      groupRef.current.add(obs.mesh);
      obsRef.current.push(obs);
      onHornRef.current();
    }

    // ── move + collide ──
    const toRemove: ObstacleData[] = [];
    const frameMove = speed * delta;

    for (const obs of obsRef.current) {
      const actualMove = frameMove + obs.extraSpeed * delta;
      obs.z += actualMove;
      obs.mesh.position.z = obs.z;

      if (hitCooldownRef.current <= 0) {
        const dx = Math.abs(LANE_X[obs.lane] - LANE_X[playerLane]);
        const dz = Math.abs(obs.z - PLAYER_Z);
        const hr = obs.type === "incoming_train" ? 2.2 : obs.type === "train" ? 2.0 : 1.8;
        const dzt = Math.max(2.4, actualMove * 4);

        let blocked = true;
        if (obs.jumpable && playerJumping)         blocked = false; // jump clears it
        if (obs.type === "train" && playerJumping) blocked = false; // trains also jumpable
        if (playerSliding && !obs.jumpable)        blocked = false; // slide clears low things
        if (obs.slideOnly && playerJumping)        blocked = true;  // low_gate: jump still blocked

        if (dx < hr && dz < dzt && blocked) {
          hitCooldownRef.current = 1.8;
          onHitRef.current();
        }
      }

      if (obs.z > DESPAWN_Z) toRemove.push(obs);
    }

    for (const obs of toRemove) groupRef.current.remove(obs.mesh);
    obsRef.current = obsRef.current.filter((o) => !toRemove.includes(o));
  });

  return null;
}
