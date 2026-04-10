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
const FADE_OUT = 0.22;

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  onJumpComplete: () => void;
}

export function Character({
  lane,
  isJumping,
  isHit,
  isSliding,
  onJumpComplete,
}: CharacterProps) {
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

  useEffect(() => {
    targetXRef.current = LANE_X[lane + 1];
  }, [lane]);

  useEffect(() => {
    if (isHit) hitTimerRef.current = 0.5;
  }, [isHit]);

  // Mount the root group into the scene once
  useEffect(() => {
    const root = rootRef.current;
    root.position.set(LANE_X[1], 0, 0);
    root.scale.setScalar(MODEL_SCALE);
    scene.add(root);
    return () => {
      scene.remove(root);
    };
  }, [scene]);

  // Load + clone character model and set up AnimationMixer
  useEffect(() => {
    if (!gltfScene || animations.length === 0) return;
    const root = rootRef.current;

    // Clean previous model
    while (root.children.length > 0) root.remove(root.children[0]);
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    runActionRef.current = null;
    jumpActionRef.current = null;
    slideActionRef.current = null;

    const cloned = skeletonClone(gltfScene) as THREE.Object3D;
    cloned.rotation.y = Math.PI;

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => {
          // DoubleSide prevents back-face holes during animation deformation
          (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
          // alphaTest handles hair/cloth cutouts without transparent depth sorting
          m.alphaTest = 0.05;
          m.transparent = false;
          (m as THREE.MeshStandardMaterial).depthWrite = true;
          m.needsUpdate = true;
        });
      }
    });

    // Ground the character at y=0
    const box = new THREE.Box3().setFromObject(cloned);
    cloned.position.y = -box.min.y;
    root.add(cloned);

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const find = (name: string) =>
      animations.find((a) => a.name === name);

    const runClip =
      find("Running") ?? find("Run_03") ?? animations[0];
    const jumpClip = find("Run_and_Jump");
    const slideClip = find("slide_light");

    // Run action: starts immediately, loops forever
    const runAction = mixer.clipAction(runClip);
    runAction.loop = THREE.LoopRepeat;
    runAction.play();
    runActionRef.current = runAction;

    // Jump action: configured but NOT started yet.
    // Starting it here would cause it to silently play-through at weight 0
    // and set _loopCount=0 before the player ever jumps, breaking replays.
    if (jumpClip) {
      const jumpAction = mixer.clipAction(jumpClip);
      jumpAction.loop = THREE.LoopOnce;
      jumpAction.clampWhenFinished = true;
      jumpAction.timeScale = JUMP_TIMESCALE;
      jumpActionRef.current = jumpAction;
    }

    // Slide action: same pattern — configured but not started
    if (slideClip) {
      const slideAction = mixer.clipAction(slideClip);
      slideAction.loop = THREE.LoopOnce;
      slideAction.clampWhenFinished = true;
      slideAction.timeScale = SLIDE_TIMESCALE;
      slideActionRef.current = slideAction;
    }

    // Listen for one-shot animations finishing
    const onFinished = (e: THREE.Event) => {
      const done = (e as unknown as { action: THREE.AnimationAction }).action;
      const run = runActionRef.current;
      if (!run) return;

      if (done === jumpActionRef.current) {
        // Crossfade back to run, then notify Game.tsx
        done.crossFadeTo(run, FADE_OUT, false);
        onJumpCompleteRef.current();
      } else if (done === slideActionRef.current) {
        done.crossFadeTo(run, FADE_OUT, false);
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

    // Advance animations
    mixerRef.current.update(delta);

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;
    const run = runActionRef.current;
    const jump = jumpActionRef.current;
    const slide = slideActionRef.current;

    // Jump started this frame
    if (jumping && !prevJumpingRef.current && jump && run) {
      // reset() clears _loopCount → -1 so LoopOnce plays fresh every time
      jump.reset();
      jump.play();
      run.crossFadeTo(jump, FADE_IN, false);
    }

    // Slide started this frame
    if (sliding && !prevSlidingRef.current && slide && run) {
      slide.reset();
      slide.play();
      run.crossFadeTo(slide, FADE_IN, false);
    }

    // Slide ended before animation finished (timeout in Game.tsx)
    if (!sliding && prevSlidingRef.current && slide && run) {
      slide.crossFadeTo(run, FADE_OUT, false);
    }

    prevJumpingRef.current = jumping;
    prevSlidingRef.current = sliding;

    // Smooth lane sliding
    const currentX = root.position.x;
    root.position.x += (targetXRef.current - currentX) * Math.min(1, delta * 14);

    // Hit shake
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
