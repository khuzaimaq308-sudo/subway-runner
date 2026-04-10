import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WatchData {
  mesh: THREE.Group;
  lane: number;
  z: number;
}

interface CoinsProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  onCollect: () => void;
}

const LANE_X   = [-2.5, 0, 2.5];
const SPAWN_Z  = -65;
const DESPAWN_Z = 10;
const PLAYER_Z  = 0;

// Watch sits flat (face-up) on the track — Y = half the case height
const WATCH_Y = 0.06;

// ── Shared geometry / materials (created once) ────────────────────────────
const caseGeo   = new THREE.CylinderGeometry(0.22, 0.22, 0.09, 20);
const bezelGeo  = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 20);
const dialGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.015, 20);
const crownGeo  = new THREE.CylinderGeometry(0.028, 0.028, 0.09, 8);
const strapGeo  = new THREE.BoxGeometry(0.18, 0.06, 0.28);
const hrHandGeo = new THREE.BoxGeometry(0.028, 0.008, 0.11);
const minHandGeo = new THREE.BoxGeometry(0.018, 0.008, 0.14);

const goldMat   = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xDD9900, emissiveIntensity: 0.45 });
const dialMat   = new THREE.MeshLambertMaterial({ color: 0xFFFAEA, emissive: 0xFFEECC, emissiveIntensity: 0.2 });
const strapMat  = new THREE.MeshLambertMaterial({ color: 0x3B1A08 });
const handMat   = new THREE.MeshLambertMaterial({ color: 0x333333 });

function makeWatch(lane: number): WatchData {
  const group = new THREE.Group();

  // Case (main gold body)
  const caseMesh = new THREE.Mesh(caseGeo, goldMat);
  group.add(caseMesh);

  // Bezel ring (slightly wider, thin)
  const bezelMesh = new THREE.Mesh(bezelGeo, goldMat);
  bezelMesh.position.y = 0.045;
  group.add(bezelMesh);

  // White dial face
  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.position.y = 0.055;
  group.add(dialMesh);

  // Hour hand
  const hrHand = new THREE.Mesh(hrHandGeo, handMat);
  hrHand.position.set(0, 0.065, -0.04);
  group.add(hrHand);

  // Minute hand
  const minHand = new THREE.Mesh(minHandGeo, handMat);
  minHand.position.set(0, 0.065, -0.055);
  minHand.rotation.y = 1.1; // 22-minute mark
  group.add(minHand);

  // Crown knob on side
  const crownMesh = new THREE.Mesh(crownGeo, goldMat);
  crownMesh.rotation.z = Math.PI / 2;
  crownMesh.position.set(0.27, 0.01, 0);
  group.add(crownMesh);

  // Leather strap — top
  const strapTop = new THREE.Mesh(strapGeo, strapMat);
  strapTop.position.set(0, -0.01, -0.27);
  group.add(strapTop);

  // Leather strap — bottom
  const strapBot = new THREE.Mesh(strapGeo, strapMat);
  strapBot.position.set(0, -0.01, 0.27);
  group.add(strapBot);

  group.position.set(LANE_X[lane], WATCH_Y, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z };
}

export function Coins({ speed, playing, playerLane, onCollect }: CoinsProps) {
  const { scene }       = useThree();
  const groupRef        = useRef<THREE.Group>(new THREE.Group());
  const watchesRef      = useRef<WatchData[]>([]);
  const spawnTimerRef   = useRef(0);
  const rotRef          = useRef(0);
  const onCollectRef    = useRef(onCollect);
  onCollectRef.current  = onCollect;

  useEffect(() => {
    const group = groupRef.current;
    scene.add(group);
    return () => {
      scene.remove(group);
      watchesRef.current.forEach(w => group.remove(w.mesh));
      watchesRef.current = [];
    };
  }, [scene]);

  useEffect(() => {
    const group = groupRef.current;
    watchesRef.current.forEach(w => group.remove(w.mesh));
    watchesRef.current = [];
    spawnTimerRef.current = 0;
    rotRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    // Slow Y-rotation for a glinting effect
    rotRef.current += delta * 1.8;
    spawnTimerRef.current += delta;

    // Spawn interval: 1 or 2 watches per burst, only on ground, spaced in Z
    const spawnInterval = Math.max(0.7, 1.4 - speed * 0.018);
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      const lane  = Math.floor(Math.random() * 3);
      const count = Math.random() < 0.45 ? 2 : 1; // occasional double
      for (let i = 0; i < count; i++) {
        const w = makeWatch(lane);
        w.z = SPAWN_Z - i * 3.0;
        w.mesh.position.z = w.z;
        groupRef.current.add(w.mesh);
        watchesRef.current.push(w);
      }
    }

    const toRemove: WatchData[] = [];
    const frameMove = speed * delta;

    for (const w of watchesRef.current) {
      w.z += frameMove;
      w.mesh.position.z = w.z;
      // Slow Y spin so the gold face catches the light
      w.mesh.rotation.y = rotRef.current;

      // Collision check
      const dx = Math.abs(LANE_X[w.lane] - LANE_X[playerLane]);
      const dz = Math.abs(w.z - PLAYER_Z);
      if (dx < 2.0 && dz < Math.max(2.2, frameMove * 3)) {
        toRemove.push(w);
        onCollectRef.current();
      } else if (w.z > DESPAWN_Z) {
        toRemove.push(w);
      }
    }

    for (const w of toRemove) {
      groupRef.current.remove(w.mesh);
    }
    watchesRef.current = watchesRef.current.filter(w => !toRemove.includes(w));
  });

  return null;
}
