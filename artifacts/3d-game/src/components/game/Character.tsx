import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Lane } from "@/game/useGameStore";

const LANE_X = [-2.5, 0, 2.5];
const MODEL_SCALE = 1.0;

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
}

export function Character({ lane, isJumping, isHit, isSliding, onJumpComplete }: CharacterProps) {
  const { scene } = useThree();
  const { scene: gltfScene, animations } = useGLTF("/models/character.glb");

  const rootRef = useRef<THREE.Group>(new THREE.Group());
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const jumpProgressRef = useRef(0);
  const hitTimerRef = useRef(0);
  const targetXRef = useRef(LANE_X[lane + 1]);
  const isJumpingRef = useRef(isJumping);
  const isHitRef = useRef(isHit);
  const isSlidingRef = useRef(isSliding);
  const onJumpCompleteRef = useRef(onJumpComplete);

  isJumpingRef.current = isJumping;
  isSlidingRef.current = isSliding;
  onJumpCompleteRef.current = onJumpComplete;

  useEffect(() => { targetXRef.current = LANE_X[lane + 1]; }, [lane]);
  useEffect(() => { if (isJumping) jumpProgressRef.current = 0; }, [isJumping]);
  useEffect(() => { if (isHit) { hitTimerRef.current = 0.5; } }, [isHit]);

  useEffect(() => {
    const root = rootRef.current;
    root.position.set(LANE_X[1], 0, 0);
    root.scale.setScalar(MODEL_SCALE);
    scene.add(root);
    return () => { scene.remove(root); };
  }, [scene]);

  useEffect(() => {
    if (!gltfScene || animations.length === 0) return;
    const root = rootRef.current;

    while (root.children.length > 0) root.remove(root.children[0]);
    if (mixerRef.current) { mixerRef.current.stopAllAction(); mixerRef.current = null; }

    const cloned = skeletonClone(gltfScene) as THREE.Object3D;

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    cloned.position.y = -box.min.y;

    root.add(cloned);

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const runClip =
      animations.find((a) => a.name === "Running") ??
      animations.find((a) => a.name === "Run_03") ??
      animations[0];

    if (runClip) mixer.clipAction(runClip).play();

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      root.remove(cloned);
    };
  }, [gltfScene, animations]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    if (mixerRef.current) mixerRef.current.update(delta);

    const currentX = root.position.x;
    root.position.x += (targetXRef.current - currentX) * Math.min(1, delta * 14);

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;

    if (jumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta * 2.2);
      const arc = Math.sin(jumpProgressRef.current * Math.PI);
      root.position.y = arc * 2.6;
      root.rotation.x = arc * -0.18;
      if (jumpProgressRef.current >= 1) {
        root.position.y = 0;
        root.rotation.x = 0;
        isJumpingRef.current = false;
        jumpProgressRef.current = 0;
        onJumpCompleteRef.current();
      }
    } else if (sliding) {
      root.position.y += (-0.6 - root.position.y) * Math.min(1, delta * 18);
      root.rotation.x = -0.28;
      root.scale.setScalar(MODEL_SCALE * 0.7);
    } else {
      root.position.y += (0 - root.position.y) * Math.min(1, delta * 14);
      root.rotation.x += (0 - root.rotation.x) * Math.min(1, delta * 12);
      root.scale.setScalar(MODEL_SCALE);
    }

    if (hitTimerRef.current > 0) {
      hitTimerRef.current -= delta;
      root.rotation.z = Math.sin(hitTimerRef.current * 28) * 0.22;
    } else {
      root.rotation.z *= 0.8;
    }
  });

  return null;
}

useGLTF.preload("/models/character.glb");
