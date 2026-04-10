import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Coin {
  id: number;
  lane: number;
  z: number;
  height: number;
  collected: boolean;
}

interface CoinsProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  playerY: number;
  onCollect: () => void;
}

const LANE_X = [-2.5, 0, 2.5];
const SPAWN_Z = -65;
const DESPAWN_Z = 8;
const PLAYER_Z = 0;

let coinId = 1000;

export function Coins({ speed, playing, playerLane, playerY, onCollect }: CoinsProps) {
  const coinsRef = useRef<Coin[]>([]);
  const meshesRef = useRef<Map<number, THREE.Group>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const spawnTimerRef = useRef(0);
  const rotRef = useRef(0);
  const onCollectRef = useRef(onCollect);
  onCollectRef.current = onCollect;

  useEffect(() => {
    coinsRef.current = [];
    meshesRef.current.clear();
    spawnTimerRef.current = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    rotRef.current += delta * 3;
    spawnTimerRef.current += delta;

    const spawnInterval = Math.max(0.6, 1.4 - speed * 0.02);

    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const height = Math.random() < 0.3 ? 2.5 : 0.4;
      const count = Math.random() < 0.5 ? 3 : 1;
      for (let i = 0; i < count; i++) {
        coinsRef.current.push({
          id: coinId++,
          lane,
          z: SPAWN_Z - i * 2,
          height,
          collected: false,
        });
      }
    }

    coinsRef.current = coinsRef.current.filter((coin) => {
      coin.z += speed * delta;

      const mesh = meshesRef.current.get(coin.id);
      if (mesh) {
        mesh.position.z = coin.z;
        mesh.rotation.y = rotRef.current;
      }

      if (!coin.collected) {
        const dx = Math.abs(LANE_X[coin.lane] - LANE_X[playerLane]);
        const dy = Math.abs(coin.height - playerY - 0.5);
        const dz = Math.abs(coin.z - PLAYER_Z);

        if (dx < 1.5 && dz < 1.2 && dy < 1.5) {
          coin.collected = true;
          if (mesh) mesh.visible = false;
          onCollectRef.current();
        }
      }

      return coin.z < DESPAWN_Z && !coin.collected;
    });

    meshesRef.current.forEach((_, id) => {
      if (!coinsRef.current.find((c) => c.id === id)) {
        meshesRef.current.delete(id);
      }
    });
  });

  const setRef = useCallback((id: number, lane: number, height: number) => (el: THREE.Group | null) => {
    if (el) {
      meshesRef.current.set(id, el);
      el.position.x = LANE_X[lane];
      el.position.y = height;
      el.position.z = SPAWN_Z;
    } else {
      meshesRef.current.delete(id);
    }
  }, []);

  return (
    <group ref={groupRef}>
      {coinsRef.current.map((coin) => (
        <group key={coin.id} ref={setRef(coin.id, coin.lane, coin.height)}>
          <mesh>
            <torusGeometry args={[0.25, 0.08, 6, 12]} />
            <meshLambertMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
