import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Lane } from "@/game/useGameStore";

const LANE_X = [-2.5, 0, 2.5];
const MODEL_SCALE = 1.0;
const JUMP_TIMESCALE = 2.8;
const SLIDE_TIMESCALE = 1.7;
const FADE_IN = 0.1;
const FADE_OUT = 0.2;

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
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  const jumpActionRef = useRef<THREE.AnimationAction | null>(null);
  const slideActionRef = useRef<THREE.AnimationAction | null>(null);

  const hitTimerRef = useRef(0);
  const targetXRef = useRef(LANE_X[lane + 1]);
  const isJumpingRef = useRef(isJumping);
  const isSlidingRef = useRef(isSliding);
  const onJumpCompleteRef = useRef(onJumpComplete);
  const prevJumpingRef = useRef(false);
  const prevSlidingRef = useRef(false);

  isJumpingRef.current = isJumping;
  isSlidingRef.current = isSliding;
  onJumpCompleteRef.current = onJumpComplete;

  useEffect(() => { targetXRef.current = LANE_X[lane + 1]; }, [lane]);
  useEffect(() => { if (isHit) hitTimerRef.current = 0.5; }, [isHit]);

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
    runActionRef.current = null;
    jumpActionRef.current = null;
    slideActionRef.current = null;

    const cloned = skeletonClone(gltfScene) as THREE.Object3D;
    cloned.rotation.y = Math.PI;

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          m.transparent = false;
          m.alphaTest = 0.05;
          (m as THREE.MeshStandardMaterial).depthWrite = true;
          (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    cloned.position.y = -box.min.y;
    root.add(cloned);

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const find = (name: string) => animations.find((a) => a.name === name);
    const runClip = find("Running") ?? find("Run_03") ?? animations[0];
    const jumpClip = find("Run_and_Jump");
    const slideClip = find("slide_light");

    const runAction = mixer.clipAction(runClip);
    runAction.loop = THREE.LoopRepeat;
    runAction.play();
    runActionRef.current = runAction;

    if (jumpClip) {
      const jumpAction = mixer.clipAction(jumpClip);
      jumpAction.loop = THREE.LoopOnce;
      jumpAction.clampWhenFinished = true;
      jumpAction.timeScale = JUMP_TIMESCALE;
      jumpAction.play();
      jumpAction.setEffectiveWeight(0);
      jumpActionRef.current = jumpAction;
    }

    if (slideClip) {
      const slideAction = mixer.clipAction(slideClip);
      slideAction.loop = THREE.LoopOnce;
      slideAction.clampWhenFinished = true;
      slideAction.timeScale = SLIDE_TIMESCALE;
      slideAction.play();
      slideAction.setEffectiveWeight(0);
      slideActionRef.current = slideAction;
    }

    const onFinished = (e: THREE.Event) => {
      const finishedAction = (e as unknown as { action: THREE.AnimationAction }).action;
      const run = runActionRef.current;
      if (!run) return;

      if (finishedAction === jumpActionRef.current) {
        finishedAction.crossFadeTo(run, FADE_OUT, false);
        onJumpCompleteRef.current();
      } else if (finishedAction === slideActionRef.current) {
        finishedAction.crossFadeTo(run, FADE_OUT, false);
      }
    };

    mixer.addEventListener("finished", onFinished);
    prevJumpingRef.current = false;
    prevSlidingRef.current = false;

    return () => {
      mixer.removeEventListener("finished", onFinished);
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      root.remove(cloned);
    };
  }, [gltfScene, animations]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root || !mixerRef.current) return;

    mixerRef.current.update(delta);

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;
    const run = runActionRef.current;
    const jump = jumpActionRef.current;
    const slide = slideActionRef.current;

    if (jumping && !prevJumpingRef.current && jump && run) {
      jump.time = 0;
      jump.enabled = true;
      jump.paused = false;
      run.crossFadeTo(jump, FADE_IN, false);
    }

    if (sliding && !prevSlidingRef.current && slide && run) {
      slide.time = 0;
      slide.enabled = true;
      slide.paused = false;
      run.crossFadeTo(slide, FADE_IN, false);
    }

    if (!sliding && prevSlidingRef.current && slide && run) {
      slide.crossFadeTo(run, FADE_OUT, false);
    }

    prevJumpingRef.current = jumping;
    prevSlidingRef.current = sliding;

    const currentX = root.position.x;
    root.position.x += (targetXRef.current - currentX) * Math.min(1, delta * 14);

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
