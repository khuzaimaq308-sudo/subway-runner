import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CoinData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  height: number;
}

interface CoinsProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  onCollect: () => void;
}

const LANE_X = [-2.5, 0, 2.5];
const SPAWN_Z = -65;
const DESPAWN_Z = 10;
const PLAYER_Z = 0;

let coinIdCounter = 0;

const coinGeo = new THREE.TorusGeometry(0.28, 0.09, 6, 12);
const coinMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 0.3 });

function makeCoin(lane: number, height: number): CoinData {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(coinGeo, coinMat);
  group.add(mesh);
  group.position.set(LANE_X[lane], height, SPAWN_Z);
  return { mesh: group, lane, z: SPAWN_Z, height };
}

export function Coins({ speed, playing, playerLane, onCollect }: CoinsProps) {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(new THREE.Group());
  const coinsRef = useRef<CoinData[]>([]);
  const spawnTimerRef = useRef(0);
  const rotRef = useRef(0);
  const onCollectRef = useRef(onCollect);
  onCollectRef.current = onCollect;

  useEffect(() => {
    const group = groupRef.current;
    scene.add(group);
    return () => {
      scene.remove(group);
      coinsRef.current.forEach(c => group.remove(c.mesh));
      coinsRef.current = [];
    };
  }, [scene]);

  useEffect(() => {
    const group = groupRef.current;
    coinsRef.current.forEach(c => group.remove(c.mesh));
    coinsRef.current = [];
    spawnTimerRef.current = 0;
    rotRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    rotRef.current += delta * 3;
    spawnTimerRef.current += delta;

    const spawnInterval = Math.max(0.55, 1.3 - speed * 0.018);
    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const height = Math.random() < 0.3 ? 2.5 : 0.45;
      const count = Math.random() < 0.5 ? Math.floor(Math.random() * 3) + 2 : 1;

      for (let i = 0; i < count; i++) {
        const coin = makeCoin(lane, height);
        coin.z = SPAWN_Z - i * 2.5;
        coin.mesh.position.z = coin.z;
        groupRef.current.add(coin.mesh);
        coinsRef.current.push(coin);
      }
    }

    const toRemove: CoinData[] = [];
    const frameMove = speed * delta;

    for (const coin of coinsRef.current) {
      coin.z += frameMove;
      coin.mesh.position.z = coin.z;
      coin.mesh.rotation.y = rotRef.current;

      const dx = Math.abs(LANE_X[coin.lane] - LANE_X[playerLane]);
      const dz = Math.abs(coin.z - PLAYER_Z);

      if (dx < 2.0 && dz < Math.max(2.2, frameMove * 3)) {
        toRemove.push(coin);
        onCollectRef.current();
      } else if (coin.z > DESPAWN_Z) {
        toRemove.push(coin);
      }
    }

    for (const coin of toRemove) {
      groupRef.current.remove(coin.mesh);
    }
    coinsRef.current = coinsRef.current.filter(c => !toRemove.includes(c));
  });

  return null;
}
