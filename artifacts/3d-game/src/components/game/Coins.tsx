import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WatchData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  bobOffset: number;
}

interface CoinsProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  onCollect: () => void;
}

const LANE_X    = [-2.5, 0, 2.5];
const SPAWN_Z   = -65;
const DESPAWN_Z = 10;
const PLAYER_Z  = 0;

// Watch center height — visible above ground but not floating too high
const WATCH_Y = 0.55;

// ── Shared geometry (created once) ────────────────────────────────────────
// The watch is in the XY plane so its face naturally points toward +Z (camera)
const bezelGeo  = new THREE.TorusGeometry(0.28, 0.042, 14, 36);         // outer ring
const caseGeo   = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 24);     // body (rotated)
const dialGeo   = new THREE.CircleGeometry(0.21, 32);                    // white face
const hrGeo     = new THREE.BoxGeometry(0.026, 0.13, 0.012);            // hour hand
const minGeo    = new THREE.BoxGeometry(0.017, 0.175, 0.012);           // minute hand
const secondGeo = new THREE.BoxGeometry(0.009, 0.19, 0.009);            // seconds hand
const crownGeo  = new THREE.CylinderGeometry(0.025, 0.025, 0.075, 10); // side crown
const strapGeo  = new THREE.BoxGeometry(0.17, 0.24, 0.065);             // wristband piece

// Materials
const goldMat   = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xCC8800, emissiveIntensity: 0.55 });
const dialMat   = new THREE.MeshLambertMaterial({ color: 0xFFFDF0, emissive: 0xFFF8D0, emissiveIntensity: 0.3, side: THREE.FrontSide });
const darkHandMat = new THREE.MeshLambertMaterial({ color: 0x1A1A1A });
const redHandMat  = new THREE.MeshLambertMaterial({ color: 0xCC2200, emissive: 0xFF0000, emissiveIntensity: 0.3 });
const strapMat  = new THREE.MeshLambertMaterial({ color: 0x2A0E04 });

function makeWatch(lane: number, bobOffset: number): WatchData {
  const group = new THREE.Group();

  // ── Gold outer ring (bezel) ───────────────────────────────────────────
  // TorusGeometry lives in XY plane → face points to +Z automatically
  const bezel = new THREE.Mesh(bezelGeo, goldMat);
  group.add(bezel);

  // ── Watch case body (thin cylinder with axis along Z) ─────────────────
  const caseBody = new THREE.Mesh(caseGeo, goldMat);
  caseBody.rotation.x = Math.PI / 2;   // rotate so flat faces look toward ±Z
  group.add(caseBody);

  // ── White dial face ───────────────────────────────────────────────────
  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.position.z = 0.048;             // sit just in front of case face
  group.add(dial);

  // ── Hour hand ─────────────────────────────────────────────────────────
  const hrHand = new THREE.Mesh(hrGeo, darkHandMat);
  hrHand.position.set(-0.025, 0.038, 0.055);
  hrHand.rotation.z = -0.52;           // ~10:10 position
  group.add(hrHand);

  // ── Minute hand ───────────────────────────────────────────────────────
  const minHand = new THREE.Mesh(minGeo, darkHandMat);
  minHand.position.set(0.04, 0.05, 0.055);
  minHand.rotation.z = 0.95;
  group.add(minHand);

  // ── Seconds hand (thin red) ───────────────────────────────────────────
  const secHand = new THREE.Mesh(secondGeo, redHandMat);
  secHand.position.set(0.0, 0.055, 0.058);
  secHand.rotation.z = -1.0;
  group.add(secHand);

  // ── Crown knob on right side ──────────────────────────────────────────
  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.rotation.z = Math.PI / 2;      // lay it horizontal
  crown.position.set(0.35, 0.025, 0);
  group.add(crown);

  // ── Leather straps (top and bottom) ───────────────────────────────────
  const strapTop = new THREE.Mesh(strapGeo, strapMat);
  strapTop.position.y = 0.40;          // above the ring
  group.add(strapTop);

  const strapBot = new THREE.Mesh(strapGeo, strapMat);
  strapBot.position.y = -0.40;         // below the ring
  group.add(strapBot);

  // ── Tilt the whole watch slightly toward the camera ───────────────────
  // Camera looks from Z≈+4.4, Y≈+4.4 downward. Tilting –18° on X means
  // the top of the watch leans slightly away, making the face more readable.
  group.rotation.x = -0.32;

  group.position.set(LANE_X[lane], WATCH_Y, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z, bobOffset };
}

export function Coins({ speed, playing, playerLane, onCollect }: CoinsProps) {
  const { scene }      = useThree();
  const groupRef       = useRef<THREE.Group>(new THREE.Group());
  const watchesRef     = useRef<WatchData[]>([]);
  const spawnTimerRef  = useRef(0);
  const timeRef        = useRef(0);
  const onCollectRef   = useRef(onCollect);
  onCollectRef.current = onCollect;

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
    timeRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    timeRef.current += delta;
    spawnTimerRef.current += delta;

    const spawnInterval = Math.max(0.8, 1.5 - speed * 0.018);
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      const lane  = Math.floor(Math.random() * 3);
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const w = makeWatch(lane, Math.random() * Math.PI * 2);
        w.z = SPAWN_Z - i * 3.5;
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

      // Gentle Y bob so watch looks lively on the ground
      w.mesh.position.y = WATCH_Y + Math.sin(timeRef.current * 2.5 + w.bobOffset) * 0.055;

      // Very slow Y rotation (~1 turn per 12s) so you mostly see the face
      w.mesh.rotation.y = timeRef.current * 0.52;

      // Collision
      const dx = Math.abs(LANE_X[w.lane] - LANE_X[playerLane]);
      const dz = Math.abs(w.z - PLAYER_Z);
      if (dx < 2.0 && dz < Math.max(2.2, frameMove * 3)) {
        toRemove.push(w);
        onCollectRef.current();
      } else if (w.z > DESPAWN_Z) {
        toRemove.push(w);
      }
    }

    for (const w of toRemove) groupRef.current.remove(w.mesh);
    watchesRef.current = watchesRef.current.filter(w => !toRemove.includes(w));
  });

  return null;
}
