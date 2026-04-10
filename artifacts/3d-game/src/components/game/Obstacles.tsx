import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type ObstacleType = "barrier" | "train" | "box" | "incoming_train";

interface ObstacleData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: ObstacleType;
  jumpable: boolean;
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

const matOrange = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const matYellow = new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.4 });
const matRedTrain = new THREE.MeshLambertMaterial({ color: 0xCC2200 });
const matRedDark = new THREE.MeshLambertMaterial({ color: 0x991100 });
const matWindow = new THREE.MeshLambertMaterial({ color: 0xAEE4FF, emissive: 0xAEE4FF, emissiveIntensity: 0.2 });
const matBox = new THREE.MeshLambertMaterial({ color: 0xD4A020 });
const matBoxEdge = new THREE.MeshLambertMaterial({ color: 0x8B6010, wireframe: true });
const matGreenTrain = new THREE.MeshLambertMaterial({ color: 0x228822 });
const matGreenDark = new THREE.MeshLambertMaterial({ color: 0x115511 });
const matYellowTrain = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });

function makeBarrier(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.3), matOrange);
  bar.position.set(0, 0.3, 0);
  group.add(bar);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.3), matOrange);
  leg1.position.set(-0.9, 0.15, 0);
  group.add(leg1);
  const leg2 = leg1.clone(); leg2.position.set(0.9, 0.15, 0);
  group.add(leg2);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.35), matYellow);
  stripe.position.set(0, 0.56, 0);
  group.add(stripe);

  return { mesh: group, lane, z: SPAWN_Z, type: "barrier", jumpable: true, extraSpeed: 0 };
}

function makeTrainCar(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.5), matRedTrain);
  body.position.set(0, 1.1, 0);
  group.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 4.3), matRedDark);
  roof.position.set(0, 2.3, 0);
  group.add(roof);
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), matWindow);
  win1.position.set(-0.55, 1.5, 2.2);
  group.add(win1);
  const win2 = win1.clone(); win2.position.set(0.55, 1.5, 2.2);
  group.add(win2);
  const win3 = win1.clone(); win3.position.set(-0.55, 1.5, -2.2);
  group.add(win3);
  const win4 = win1.clone(); win4.position.set(0.55, 1.5, -2.2);
  group.add(win4);

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  wheel.rotation.z = Math.PI / 2;
  for (const z of [-1.5, 1.5]) {
    for (const x of [-1.05, 1.05]) {
      const w = wheel.clone();
      w.position.set(x, 0.22, z);
      group.add(w);
    }
  }

  return { mesh: group, lane, z: SPAWN_Z, type: "train", jumpable: false, extraSpeed: 0 };
}

function makeIncomingTrain(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z - 20);

  const loco = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 5), matGreenTrain);
  loco.position.set(0, 1.4, 0);
  group.add(loco);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2), matGreenDark);
  nose.position.set(0, 1.1, 3);
  group.add(nose);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 6), matYellowTrain);
  horn.position.set(-0.4, 2.9, 0.5);
  group.add(horn);
  const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.3, 8), new THREE.MeshLambertMaterial({ color: 0xFFFFAA, emissive: 0xFFFF88, emissiveIntensity: 1 }));
  headlight.position.set(0, 1.5, 3.99);
  group.add(headlight);

  return { mesh: group, lane, z: SPAWN_Z - 20, type: "incoming_train", jumpable: false, extraSpeed: 6 };
}

function makeBox(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matBox);
  body.position.set(0, 0.5, 0);
  group.add(body);
  const edges = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), matBoxEdge);
  edges.position.set(0, 0.5, 0);
  group.add(edges);
  return { mesh: group, lane, z: SPAWN_Z, type: "box", jumpable: false, extraSpeed: 0 };
}

export function Obstacles({ speed, playing, playerLane, playerJumping, playerSliding, onHit, onTrainHorn }: ObstaclesProps) {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(new THREE.Group());
  const obsRef = useRef<ObstacleData[]>([]);
  const spawnTimerRef = useRef(0);
  const incomingTimerRef = useRef(0);
  const hitCooldownRef = useRef(0);
  const onHitRef = useRef(onHit);
  const onHornRef = useRef(onTrainHorn);
  onHitRef.current = onHit;
  onHornRef.current = onTrainHorn;

  useEffect(() => {
    const g = groupRef.current;
    scene.add(g);
    return () => {
      scene.remove(g);
      obsRef.current.forEach(o => g.remove(o.mesh));
      obsRef.current = [];
    };
  }, [scene]);

  useEffect(() => {
    const g = groupRef.current;
    obsRef.current.forEach(o => g.remove(o.mesh));
    obsRef.current = [];
    spawnTimerRef.current = 0;
    incomingTimerRef.current = 0;
    hitCooldownRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    spawnTimerRef.current += delta;
    incomingTimerRef.current += delta;

    if (hitCooldownRef.current > 0) hitCooldownRef.current -= delta;

    const spawnInterval = Math.max(0.9, 2.4 - speed * 0.07);
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;

      const numObs = Math.random() < 0.3 ? 2 : 1;
      const safeLane = Math.floor(Math.random() * 3);
      const lanesUsed = new Set<number>();

      for (let i = 0; i < numObs; i++) {
        let lane = Math.floor(Math.random() * 3);
        let tries = 0;
        while ((lanesUsed.has(lane) || (numObs > 1 && lane === safeLane)) && tries < 8) {
          lane = Math.floor(Math.random() * 3); tries++;
        }
        lanesUsed.add(lane);

        const r = Math.random();
        let obs: ObstacleData;
        if (r < 0.35) obs = makeBarrier(lane);
        else if (r < 0.7) obs = makeTrainCar(lane);
        else obs = makeBox(lane);

        groupRef.current.add(obs.mesh);
        obsRef.current.push(obs);
      }
    }

    const incomingInterval = Math.max(12, 20 - speed * 0.3);
    if (incomingTimerRef.current >= incomingInterval) {
      incomingTimerRef.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const obs = makeIncomingTrain(lane);
      groupRef.current.add(obs.mesh);
      obsRef.current.push(obs);
      onHornRef.current();
    }

    const toRemove: ObstacleData[] = [];
    const frameMove = speed * delta;

    for (const obs of obsRef.current) {
      const actualSpeed = frameMove + obs.extraSpeed * delta;
      obs.z += actualSpeed;
      obs.mesh.position.z = obs.z;

      if (hitCooldownRef.current <= 0) {
        const dx = Math.abs(LANE_X[obs.lane] - LANE_X[playerLane]);
        const dz = Math.abs(obs.z - PLAYER_Z);
        const hitRadius = obs.type === "incoming_train" ? 2.2 : obs.type === "train" ? 2.0 : 1.8;
        const dzThresh = Math.max(2.4, actualSpeed * 4);

        let blocked = true;
        if (obs.jumpable && playerJumping) blocked = false;
        if (obs.type === "train" && playerJumping) blocked = false;
        if (obs.type === "barrier" && playerSliding) blocked = false;

        if (dx < hitRadius && dz < dzThresh && blocked) {
          hitCooldownRef.current = 1.8;
          onHitRef.current();
        }
      }

      if (obs.z > DESPAWN_Z) toRemove.push(obs);
    }

    for (const obs of toRemove) groupRef.current.remove(obs.mesh);
    obsRef.current = obsRef.current.filter(o => !toRemove.includes(o));
  });

  return null;
}
