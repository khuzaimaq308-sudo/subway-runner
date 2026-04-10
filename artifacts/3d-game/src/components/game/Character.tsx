import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Lane } from "@/game/useGameStore";

const LANE_X = [-2.5, 0, 2.5];
const MODEL_SCALE = 0.92;
const MODEL_Y_OFFSET = 0;

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
}

export function Character({ lane, isJumping, isHit, isSliding, onJumpComplete }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/character.glb");

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  const [clonedScene, setClonedScene] = useState<THREE.Object3D | null>(null);

  const jumpProgressRef = useRef(0);
  const hitTimerRef = useRef(0);
  const targetXRef = useRef(LANE_X[lane + 1]);
  const slideTimerRef = useRef(0);
  const prevSlidingRef = useRef(false);

  useEffect(() => { targetXRef.current = LANE_X[lane + 1]; }, [lane]);
  useEffect(() => { if (isJumping) jumpProgressRef.current = 0; }, [isJumping]);
  useEffect(() => { if (isHit) hitTimerRef.current = 0.5; }, [isHit]);

  useEffect(() => {
    if (!scene || animations.length === 0) return;

    const cloned = skeletonClone(scene) as THREE.Object3D;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = mats.map((m: THREE.Material) => {
          const src = m as THREE.MeshStandardMaterial;
          return new THREE.MeshLambertMaterial({
            map: src.map ?? undefined,
            color: src.color ?? new THREE.Color(1, 1, 1),
            skinning: true,
          } as THREE.MeshLambertMaterialParameters & { skinning?: boolean });
        });
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    cloned.position.y = -box.min.y;

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const runClip =
      animations.find((a) => a.name === "Running") ??
      animations.find((a) => a.name === "Run_03") ??
      animations[0];

    if (runClip) {
      const action = mixer.clipAction(runClip);
      action.play();
      runActionRef.current = action;
    }

    setClonedScene(cloned);

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
    };
  }, [scene, animations]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const currentX = groupRef.current.position.x;
    groupRef.current.position.x += (targetXRef.current - currentX) * Math.min(1, delta * 14);

    if (isJumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta * 2.0);
      const arc = Math.sin(jumpProgressRef.current * Math.PI);
      groupRef.current.position.y = MODEL_Y_OFFSET + arc * 2.6;
      groupRef.current.rotation.x = arc * -0.18;
      if (jumpProgressRef.current >= 1) {
        groupRef.current.position.y = MODEL_Y_OFFSET;
        groupRef.current.rotation.x = 0;
        onJumpComplete();
      }
    } else if (isSliding) {
      if (!prevSlidingRef.current) slideTimerRef.current = 0;
      slideTimerRef.current += delta;
      const t = Math.min(slideTimerRef.current * 8, 1);
      const targetY = MODEL_Y_OFFSET - 0.65;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * Math.min(1, delta * 18);
      groupRef.current.rotation.x = -0.25 * t;
      const s = 1 - 0.32 * t;
      groupRef.current.scale.setScalar(MODEL_SCALE * s);
    } else {
      groupRef.current.position.y += (MODEL_Y_OFFSET - groupRef.current.position.y) * Math.min(1, delta * 14);
      groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * Math.min(1, delta * 12);
      groupRef.current.scale.setScalar(MODEL_SCALE);
    }

    prevSlidingRef.current = isSliding;

    if (hitTimerRef.current > 0) {
      hitTimerRef.current -= delta;
      groupRef.current.rotation.z = Math.sin(hitTimerRef.current * 28) * 0.22;
    } else {
      groupRef.current.rotation.z *= 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[LANE_X[1], MODEL_Y_OFFSET, 0]} scale={MODEL_SCALE}>
      {clonedScene && <primitive object={clonedScene} />}
    </group>
  );
}

useGLTF.preload("/models/character.glb");
