import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/game/useGameStore";

interface WatchData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  bobOffset: number;
  attractX: number; // current visual X when magnet-attracted
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
const WATCH_Y   = 0.55;

const bezelGeo  = new THREE.TorusGeometry(0.28, 0.042, 14, 36);
const caseGeo   = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 24);
const dialGeo   = new THREE.CircleGeometry(0.21, 32);
const hrGeo     = new THREE.BoxGeometry(0.026, 0.13, 0.012);
const minGeo    = new THREE.BoxGeometry(0.017, 0.175, 0.012);
const secondGeo = new THREE.BoxGeometry(0.009, 0.19, 0.009);
const crownGeo  = new THREE.CylinderGeometry(0.025, 0.025, 0.075, 10);
const strapGeo  = new THREE.BoxGeometry(0.17, 0.24, 0.065);

const goldMat     = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xCC8800, emissiveIntensity: 0.55 });
const dialMat     = new THREE.MeshLambertMaterial({ color: 0xFFFDF0, emissive: 0xFFF8D0, emissiveIntensity: 0.3, side: THREE.FrontSide });
const darkHandMat = new THREE.MeshLambertMaterial({ color: 0x1A1A1A });
const redHandMat  = new THREE.MeshLambertMaterial({ color: 0xCC2200, emissive: 0xFF0000, emissiveIntensity: 0.3 });
const strapMat    = new THREE.MeshLambertMaterial({ color: 0x2A0E04 });

function makeWatch(lane: number, bobOffset: number): WatchData {
  const group = new THREE.Group();
  const bezel = new THREE.Mesh(bezelGeo, goldMat);
  group.add(bezel);
  const caseBody = new THREE.Mesh(caseGeo, goldMat);
  caseBody.rotation.x = Math.PI / 2;
  group.add(caseBody);
  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.position.z = 0.048;
  group.add(dial);
  const hrHand = new THREE.Mesh(hrGeo, darkHandMat);
  hrHand.position.set(-0.025, 0.038, 0.055); hrHand.rotation.z = -0.52;
  group.add(hrHand);
  const minHand = new THREE.Mesh(minGeo, darkHandMat);
  minHand.position.set(0.04, 0.05, 0.055); minHand.rotation.z = 0.95;
  group.add(minHand);
  const secHand = new THREE.Mesh(secondGeo, redHandMat);
  secHand.position.set(0.0, 0.055, 0.058); secHand.rotation.z = -1.0;
  group.add(secHand);
  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.rotation.z = Math.PI / 2; crown.position.set(0.35, 0.025, 0);
  group.add(crown);
  const strapTop = new THREE.Mesh(strapGeo, strapMat);
  strapTop.position.y = 0.40;
  group.add(strapTop);
  const strapBot = new THREE.Mesh(strapGeo, strapMat);
  strapBot.position.y = -0.40;
  group.add(strapBot);
  group.rotation.x = -0.32;
  group.position.set(LANE_X[lane], WATCH_Y, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z, bobOffset, attractX: LANE_X[lane] };
}

export function Coins({ speed, playing, playerLane, onCollect }: CoinsProps) {
  const { scene }      = useThree();
  const groupRef       = useRef<THREE.Group>(new THREE.Group());
  const watchesRef     = useRef<WatchData[]>([]);
  const spawnTimerRef  = useRef(0);
  const timeRef        = useRef(0);
  const onCollectRef   = useRef(onCollect);
  onCollectRef.current = onCollect;

  const powerup     = useGameStore((s) => s.powerup);
  const powerupRef  = useRef(powerup);
  powerupRef.current = powerup;

  useEffect(() => {
    const group = groupRef.current;
    scene.add(group);
    return () => { scene.remove(group); watchesRef.current.forEach(w => group.remove(w.mesh)); watchesRef.current = []; };
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
    timeRef.current      += delta;
    spawnTimerRef.current += delta;

    const pwr = powerupRef.current;
    const playerX = LANE_X[playerLane];

    const spawnInterval = Math.max(2.5, 4.5 - speed * 0.02);
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

      // Magnet: attract coin toward player X
      if (pwr === "magnet") {
        w.attractX += (playerX - w.attractX) * Math.min(1, delta * 5);
        w.mesh.position.x = w.attractX;
      } else {
        // Snap back to lane if magnet ended
        w.attractX += (LANE_X[w.lane] - w.attractX) * Math.min(1, delta * 8);
        w.mesh.position.x = w.attractX;
      }

      const onGround = pwr !== "jetpack";
      const bobY = onGround ? WATCH_Y + Math.sin(timeRef.current * 2.5 + w.bobOffset) * 0.055 : 2.8;
      w.mesh.position.y = bobY;
      w.mesh.rotation.y = timeRef.current * 0.52;

      // Collect logic
      const dx = Math.abs(w.attractX - playerX);
      const dz = Math.abs(w.z - PLAYER_Z);

      // Jetpack: wide auto-collect radius (player is flying)
      const xRadius = pwr === "jetpack" ? 5.5 : (pwr === "magnet" ? 1.5 : 2.0);
      const zRadius = Math.max(2.2, frameMove * 3);

      if (dx < xRadius && dz < zRadius) {
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
