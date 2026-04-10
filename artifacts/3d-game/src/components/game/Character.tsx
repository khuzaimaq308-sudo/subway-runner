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
const BLEND = 12;           // weight lerp speed
const JUMP_HEIGHT = 1.6;    // metres at arc peak
const JUMP_DURATION = 0.85; // seconds (= 2.333s clip / 2.8x speed)

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
}

export function Character({
  lane, isJumping, isHit, isSliding, onJumpComplete,
}: CharacterProps) {
  const { scene } = useThree();
  const { scene: gltfScene, animations } = useGLTF("/models/character.glb");

  const rootRef   = useRef<THREE.Group>(new THREE.Group());
  const clonedRef = useRef<THREE.Object3D | null>(null);
  const groundYRef = useRef(0);

  const mixerRef     = useRef<THREE.AnimationMixer | null>(null);
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  const jumpActionRef = useRef<THREE.AnimationAction | null>(null);
  const slideActionRef = useRef<THREE.AnimationAction | null>(null);

  const jumpProgressRef  = useRef(0);
  const jumpDoneRef      = useRef(false);
  const hitTimerRef      = useRef(0);
  const targetXRef       = useRef(LANE_X[lane + 1]);

  // Always-fresh refs for props used inside useFrame
  const isJumpingRef  = useRef(isJumping);
  const isSlidingRef  = useRef(isSliding);
  const onCompleteRef = useRef(onJumpComplete);
  const prevJumpRef   = useRef(false);
  const prevSlideRef  = useRef(false);

  isJumpingRef.current  = isJumping;
  isSlidingRef.current  = isSliding;
  onCompleteRef.current = onJumpComplete;

  useEffect(() => { targetXRef.current = LANE_X[lane + 1]; }, [lane]);
  useEffect(() => { if (isHit) hitTimerRef.current = 0.5; }, [isHit]);

  // Add root group to scene once
  useEffect(() => {
    const root = rootRef.current;
    root.position.set(LANE_X[1], 0, 0);
    root.scale.setScalar(MODEL_SCALE);
    scene.add(root);
    return () => { scene.remove(root); };
  }, [scene]);

  // Clone model + build AnimationMixer
  useEffect(() => {
    if (!gltfScene || animations.length === 0) return;
    const root = rootRef.current;

    while (root.children.length > 0) root.remove(root.children[0]);
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;
    runActionRef.current = null;
    jumpActionRef.current = null;
    slideActionRef.current = null;
    clonedRef.current = null;

    const cloned = skeletonClone(gltfScene) as THREE.Object3D;
    cloned.rotation.y = Math.PI;

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        m.alphaTest   = 0.05;
        m.transparent = false;
        (m as THREE.MeshStandardMaterial).depthWrite = true;
        m.needsUpdate = true;
      });
    });

    // Ground the model — store offset so we can lock it every frame
    const box = new THREE.Box3().setFromObject(cloned);
    groundYRef.current   = -box.min.y;
    cloned.position.set(0, groundYRef.current, 0);
    root.add(cloned);
    clonedRef.current = cloned;

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const find = (name: string) => animations.find((a) => a.name === name);
    const runClip   = find("Running") ?? find("Run_03") ?? animations[0];
    const jumpClip  = find("Run_and_Jump");
    const slideClip = find("slide_light");

    // Run: always playing, weight handled manually
    const runAction = mixer.clipAction(runClip);
    runAction.loop = THREE.LoopRepeat;
    runAction.play();
    runActionRef.current = runAction;

    // Jump: NOT pre-started (pre-starting causes silent completion before first press)
    if (jumpClip) {
      const a = mixer.clipAction(jumpClip);
      a.loop = THREE.LoopOnce;
      a.clampWhenFinished = true;
      a.timeScale = JUMP_TIMESCALE;
      a.setEffectiveWeight(0);
      jumpActionRef.current = a;
    }

    // Slide: same — NOT pre-started
    if (slideClip) {
      const a = mixer.clipAction(slideClip);
      a.loop = THREE.LoopOnce;
      a.clampWhenFinished = true;
      a.timeScale = SLIDE_TIMESCALE;
      a.setEffectiveWeight(0);
      slideActionRef.current = a;
    }

    prevJumpRef.current  = false;
    prevSlideRef.current = false;
    jumpProgressRef.current = 0;
    jumpDoneRef.current = false;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      root.remove(cloned);
      clonedRef.current = null;
    };
  }, [gltfScene, animations]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root || !mixerRef.current) return;

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;
    const run   = runActionRef.current;
    const jump  = jumpActionRef.current;
    const slide = slideActionRef.current;

    // Rising edge: start one-shot animations fresh
    if (jumping && !prevJumpRef.current && jump) {
      jump.reset();
      jump.play();
      jumpProgressRef.current = 0;
      jumpDoneRef.current = false;
    }
    if (sliding && !prevSlideRef.current && slide) {
      slide.reset();
      slide.play();
    }

    prevJumpRef.current  = jumping;
    prevSlideRef.current = sliding;

    // Advance mixer
    mixerRef.current.update(delta);

    // ── Manual weight blending (far more reliable than crossFadeTo) ──
    const f = Math.min(1, delta * BLEND);
    if (run)   run.setEffectiveWeight(THREE.MathUtils.lerp(run.getEffectiveWeight(),   (!jumping && !sliding) ? 1 : 0, f));
    if (jump)  jump.setEffectiveWeight(THREE.MathUtils.lerp(jump.getEffectiveWeight(),  jumping ? 1 : 0, f));
    if (slide) slide.setEffectiveWeight(THREE.MathUtils.lerp(slide.getEffectiveWeight(), sliding ? 1 : 0, f));

    // ── Root-motion lock: zero out X/Z every frame so character stays at Z=0 ──
    // Y is locked to groundY (jump height lives on the root GROUP instead)
    const cloned = clonedRef.current;
    if (cloned) {
      cloned.position.x = 0;
      cloned.position.z = 0;
      cloned.position.y = groundYRef.current; // keep model grounded; jump = root group Y
    }

    // ── Jump arc: sine curve on the root group's Y ──
    if (jumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta / JUMP_DURATION);
      root.position.y = Math.sin(jumpProgressRef.current * Math.PI) * JUMP_HEIGHT;

      // Notify Game.tsx slightly before animation ends so landing is smooth
      if (jumpProgressRef.current >= 0.92 && !jumpDoneRef.current) {
        jumpDoneRef.current = true;
        onCompleteRef.current();
      }
    } else {
      jumpProgressRef.current = 0;
      jumpDoneRef.current = false;
      // Smooth landing — lerp Y back to 0
      root.position.y = THREE.MathUtils.lerp(root.position.y, 0, Math.min(1, delta * 12));
    }

    // ── Lane switching (smooth on X) ──
    root.position.x += (targetXRef.current - root.position.x) * Math.min(1, delta * 14);

    // ── Hit shake ──
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
