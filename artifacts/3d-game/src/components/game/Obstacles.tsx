import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Obstacle {
  id: number;
  lane: number;
  z: number;
  type: "barrier" | "train" | "box";
  hit: boolean;
}

interface ObstaclesProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  playerJumping: boolean;
  onHit: () => void;
}

const LANE_X = [-2.5, 0, 2.5];
const SPAWN_Z = -60;
const DESPAWN_Z = 8;
const PLAYER_Z = 0;
const MIN_GAP = 12;

let idCounter = 0;

const obstacleTypes: Obstacle["type"][] = ["barrier", "train", "box"];

export function Obstacles({ speed, playing, playerLane, playerJumping, onHit }: ObstaclesProps) {
  const obstaclesRef = useRef<Obstacle[]>([]);
  const meshesRef = useRef<Map<number, THREE.Group>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const spawnTimerRef = useRef(0);
  const lastSpawnZRef = useRef(-20);
  const onHitRef = useRef(onHit);
  const hitCooldownRef = useRef(0);

  onHitRef.current = onHit;

  useEffect(() => {
    obstaclesRef.current = [];
    meshesRef.current.clear();
    spawnTimerRef.current = 0;
    lastSpawnZRef.current = -20;
    hitCooldownRef.current = 0;
  }, [playing]);

  useFrame((state, delta) => {
    if (!playing) return;

    spawnTimerRef.current += delta;
    const spawnInterval = Math.max(0.8, 2.2 - speed * 0.06);

    if (spawnTimerRef.current >= spawnInterval) {
      spawnTimerRef.current = 0;

      const numObstaclesInSpawn = Math.random() < 0.25 ? 2 : 1;
      const lanesUsed = new Set<number>();
      const safeLanes = Math.random() < 0.4 ? 1 : Math.floor(Math.random() * 3);

      for (let i = 0; i < numObstaclesInSpawn; i++) {
        let lane: number;
        let attempts = 0;
        do {
          lane = Math.floor(Math.random() * 3);
          attempts++;
        } while (lanesUsed.has(lane) && attempts < 10);

        if (lane === safeLanes && numObstaclesInSpawn > 1) continue;

        lanesUsed.add(lane);

        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        obstaclesRef.current.push({
          id: idCounter++,
          lane,
          z: SPAWN_Z,
          type,
          hit: false,
        });
      }
    }

    if (hitCooldownRef.current > 0) hitCooldownRef.current -= delta;

    obstaclesRef.current = obstaclesRef.current.filter((obs) => {
      obs.z += speed * delta;

      const mesh = meshesRef.current.get(obs.id);
      if (mesh) {
        mesh.position.z = obs.z;
      }

      if (!obs.hit && hitCooldownRef.current <= 0) {
        const dx = Math.abs(LANE_X[obs.lane] - LANE_X[playerLane]);
        const dz = Math.abs(obs.z - PLAYER_Z);

        let hitHeight = true;
        if (obs.type === "barrier" && playerJumping) hitHeight = false;

        if (dx < 1.8 && dz < 1.5 && hitHeight) {
          obs.hit = true;
          hitCooldownRef.current = 1.5;
          onHitRef.current();
        }
      }

      return obs.z < DESPAWN_Z;
    });

    meshesRef.current.forEach((mesh, id) => {
      if (!obstaclesRef.current.find((o) => o.id === id)) {
        groupRef.current?.remove(mesh);
        meshesRef.current.delete(id);
      }
    });
  });

  const setMeshRef = useCallback((id: number, type: Obstacle["type"], lane: number) => (el: THREE.Group | null) => {
    if (el) {
      meshesRef.current.set(id, el);
      el.position.x = LANE_X[lane];
      el.position.z = SPAWN_Z;
    } else {
      meshesRef.current.delete(id);
    }
  }, []);

  return (
    <group ref={groupRef}>
      {obstaclesRef.current.map((obs) => (
        <group key={obs.id} ref={setMeshRef(obs.id, obs.type, obs.lane)}>
          {obs.type === "barrier" && (
            <group>
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[2.2, 0.6, 0.3]} />
                <meshStandardMaterial color="#FF8C00" />
              </mesh>
              <mesh position={[-0.9, 0.15, 0]} castShadow>
                <boxGeometry args={[0.2, 0.3, 0.3]} />
                <meshStandardMaterial color="#FF8C00" />
              </mesh>
              <mesh position={[0.9, 0.15, 0]} castShadow>
                <boxGeometry args={[0.2, 0.3, 0.3]} />
                <meshStandardMaterial color="#FF8C00" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[2.2, 0.08, 0.35]} />
                <meshStandardMaterial color="#FFFF00" emissive="#FFFF00" emissiveIntensity={0.5} />
              </mesh>
            </group>
          )}
          {obs.type === "train" && (
            <group>
              <mesh position={[0, 0.9, 0]} castShadow>
                <boxGeometry args={[2.0, 1.8, 3]} />
                <meshStandardMaterial color="#1A5F9E" />
              </mesh>
              <mesh position={[0, 1.7, -0.5]}>
                <boxGeometry args={[1.6, 0.4, 1.6]} />
                <meshStandardMaterial color="#2270BB" />
              </mesh>
              <mesh position={[-0.5, 1.4, 1.2]}>
                <boxGeometry args={[0.5, 0.5, 0.1]} />
                <meshStandardMaterial color="#7EC8E3" emissive="#7EC8E3" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0.5, 1.4, 1.2]}>
                <boxGeometry args={[0.5, 0.5, 0.1]} />
                <meshStandardMaterial color="#7EC8E3" emissive="#7EC8E3" emissiveIntensity={0.3} />
              </mesh>
            </group>
          )}
          {obs.type === "box" && (
            <group>
              <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[1.0, 1.0, 1.0]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[1.02, 1.02, 1.02]} />
                <meshStandardMaterial color="#5C2F0A" wireframe />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
