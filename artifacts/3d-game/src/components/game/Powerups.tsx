import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/game/useGameStore";

const LANE_X   = [-2.5, 0, 2.5];
const SPAWN_Z  = -65;
const DESPAWN_Z = 10;
const PLAYER_Z = 0;

type PowerupType = "magnet" | "jetpack";

interface PowerupItem {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: PowerupType;
  bobOffset: number;
}

// ── Magnet mesh ───────────────────────────────────────────────────────────
const magnetMat  = new THREE.MeshLambertMaterial({ color: 0xFF2222, emissive: 0xFF0000, emissiveIntensity: 0.6 });
const magnetSilv = new THREE.MeshLambertMaterial({ color: 0xCCCCCC, emissive: 0xAAAAAA, emissiveIntensity: 0.4 });
const magnetGlow = new THREE.MeshLambertMaterial({ color: 0xFF4444, emissive: 0xFF2222, emissiveIntensity: 1.2, transparent: true, opacity: 0.35 });

function makeMagnet(lane: number, bobOffset: number): PowerupItem {
  const group = new THREE.Group();
  // U-shaped body from two cylinders + curved top (approximated with a torus segment)
  const leftArm  = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10), magnetMat);
  leftArm.position.set(-0.17, 0, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10), magnetMat);
  rightArm.position.set(0.17, 0, 0);
  // Connect them with a half-torus on top
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 10, 16, Math.PI), magnetMat);
  bridge.position.set(0, 0.225, 0);
  bridge.rotation.z = Math.PI;
  // Silver tips
  const tipL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 10), magnetSilv);
  tipL.position.set(-0.17, -0.265, 0);
  const tipR = tipL.clone(); tipR.position.set(0.17, -0.265, 0);
  // Glow sphere
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), magnetGlow);
  group.add(leftArm, rightArm, bridge, tipL, tipR, glow);
  group.scale.setScalar(1.15);
  group.position.set(LANE_X[lane], 0.9, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z, type: "magnet", bobOffset };
}

// ── Jetpack shoe mesh ─────────────────────────────────────────────────────
const jetMat   = new THREE.MeshLambertMaterial({ color: 0x2288FF, emissive: 0x0044CC, emissiveIntensity: 0.5 });
const jetFire  = new THREE.MeshLambertMaterial({ color: 0xFF8800, emissive: 0xFF6600, emissiveIntensity: 1.4, transparent: true, opacity: 0.75 });
const jetGlow  = new THREE.MeshLambertMaterial({ color: 0x44AAFF, emissive: 0x2266FF, emissiveIntensity: 1.0, transparent: true, opacity: 0.3 });

function makeJetpack(lane: number, bobOffset: number): PowerupItem {
  const group = new THREE.Group();
  // Boot/shoe body
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.48), jetMat);
  boot.position.set(0, 0, 0);
  // Thruster nozzle
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.25, 10), jetMat);
  nozzle.position.set(0, -0.22, 0);
  // Flame cone
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 10), jetFire);
  flame.position.set(0, -0.43, 0);
  flame.rotation.z = Math.PI; // point downward
  // Wings
  const wingGeo = new THREE.BoxGeometry(0.55, 0.08, 0.22);
  const wings = new THREE.Mesh(wingGeo, jetMat);
  wings.position.set(0, 0.06, 0);
  // Glow
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 12), jetGlow);
  group.add(boot, nozzle, flame, wings, glow);
  group.scale.setScalar(1.1);
  group.position.set(LANE_X[lane], 0.9, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z, type: "jetpack", bobOffset };
}

interface PowerupsProps {
  speed: number;
  playing: boolean;
  playerLane: number;
}

export function Powerups({ speed, playing, playerLane }: PowerupsProps) {
  const { scene }       = useThree();
  const groupRef        = useRef<THREE.Group>(new THREE.Group());
  const itemsRef        = useRef<PowerupItem[]>([]);
  const spawnTimerRef   = useRef(8); // first spawn after 8s
  const timeRef         = useRef(0);
  const activatePowerup = useGameStore((s) => s.activatePowerup);

  useEffect(() => {
    const g = groupRef.current;
    scene.add(g);
    return () => { scene.remove(g); itemsRef.current.forEach(i => g.remove(i.mesh)); itemsRef.current = []; };
  }, [scene]);

  useEffect(() => {
    const g = groupRef.current;
    itemsRef.current.forEach(i => g.remove(i.mesh));
    itemsRef.current = [];
    spawnTimerRef.current = 8;
    timeRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;
    timeRef.current      += delta;
    spawnTimerRef.current += delta;

    // Spawn a powerup every 18-22 seconds
    const spawnInterval = 20;
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const type: PowerupType = Math.random() < 0.5 ? "magnet" : "jetpack";
      const item = type === "magnet" ? makeMagnet(lane, Math.random() * Math.PI * 2) : makeJetpack(lane, Math.random() * Math.PI * 2);
      groupRef.current.add(item.mesh);
      itemsRef.current.push(item);
    }

    const frameMove = speed * delta;
    const toRemove: PowerupItem[] = [];

    for (const item of itemsRef.current) {
      item.z += frameMove;
      item.mesh.position.z = item.z;
      // Bob + spin
      item.mesh.position.y = 0.9 + Math.sin(timeRef.current * 2.0 + item.bobOffset) * 0.1;
      item.mesh.rotation.y = timeRef.current * 1.2;

      // Collect check
      const dx = Math.abs(LANE_X[item.lane] - LANE_X[playerLane]);
      const dz = Math.abs(item.z - PLAYER_Z);
      if (dx < 2.2 && dz < 2.0) {
        toRemove.push(item);
        activatePowerup(item.type, item.type === "jetpack" ? 20 : 10);
      } else if (item.z > DESPAWN_Z) {
        toRemove.push(item);
      }
    }

    for (const item of toRemove) groupRef.current.remove(item.mesh);
    itemsRef.current = itemsRef.current.filter(i => !toRemove.includes(i));
  });

  return null;
}
