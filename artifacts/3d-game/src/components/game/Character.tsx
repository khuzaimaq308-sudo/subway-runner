import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Lane } from "@/game/useGameStore";

const LANE_X        = [-2.5, 0, 2.5];
const MODEL_SCALE   = 1.0;
const JUMP_TIMESCALE  = 2.8;
const SLIDE_TIMESCALE = 1.7;
const BLEND       = 12;
const JUMP_HEIGHT  = 1.6;
const JUMP_DURATION = 0.85;
const DANCE_DURATION = 8.1;   // matches Bubble_Dance clip length

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  isDancing: boolean;
  isDying: boolean;
  isJetpack: boolean;
  isOnTrain: boolean;
  onJumpComplete: () => void;
  onDanceEnd: () => void;
}

export function Character({
  lane, isJumping, isHit, isSliding, isDancing, isDying,
  isJetpack, isOnTrain, onJumpComplete, onDanceEnd,
}: CharacterProps) {
  const { scene } = useThree();
  const { scene: gltfScene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/character.glb`);
  // Load dance GLB for the Bubble_Dance clip (same skeleton, just extra animation tracks)
  const { animations: danceAnims } = useGLTF(`${import.meta.env.BASE_URL}models/dance.glb`);

  const rootRef         = useRef<THREE.Group>(new THREE.Group());
  const clonedRef       = useRef<THREE.Object3D | null>(null);
  const groundYRef      = useRef(0);
  const rootBoneRef     = useRef<THREE.Bone | null>(null);
  const rootBoneInitY   = useRef(0);

  const mixerRef       = useRef<THREE.AnimationMixer | null>(null);
  const runActionRef   = useRef<THREE.AnimationAction | null>(null);
  const jumpActionRef  = useRef<THREE.AnimationAction | null>(null);
  const slideActionRef = useRef<THREE.AnimationAction | null>(null);
  const danceActionRef = useRef<THREE.AnimationAction | null>(null);

  const jumpProgressRef  = useRef(0);
  const jumpDoneRef      = useRef(false);
  const hitTimerRef      = useRef(0);
  const targetXRef       = useRef(LANE_X[lane + 1]);
  const danceTimeRef     = useRef(0);
  const prevDancingRef   = useRef(false);
  const dyingTimeRef     = useRef(0);
  const prevDyingRef     = useRef(false);

  const isJumpingRef  = useRef(isJumping);
  const isSlidingRef  = useRef(isSliding);
  const isDancingRef  = useRef(isDancing);
  const isDyingRef    = useRef(isDying);
  const onCompleteRef = useRef(onJumpComplete);
  const onDanceEndRef = useRef(onDanceEnd);
  const prevJumpRef   = useRef(false);
  const prevSlideRef  = useRef(false);

  isJumpingRef.current  = isJumping;
  isSlidingRef.current  = isSliding;
  isDancingRef.current  = isDancing;
  isDyingRef.current    = isDying;
  onCompleteRef.current = onJumpComplete;
  onDanceEndRef.current = onDanceEnd;

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
    mixerRef.current?.stopAllAction();
    mixerRef.current = null;

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

    const box = new THREE.Box3().setFromObject(cloned);
    groundYRef.current = -box.min.y;
    cloned.position.set(0, groundYRef.current, 0);
    root.add(cloned);
    clonedRef.current = cloned;

    // Find root bone
    rootBoneRef.current = null;
    cloned.traverse((node) => {
      if (node instanceof THREE.Bone && !(node.parent instanceof THREE.Bone)) {
        if (!rootBoneRef.current) {
          rootBoneRef.current = node;
          rootBoneInitY.current = node.position.y;
        }
      }
    });

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const find = (name: string) => animations.find((a) => a.name === name);
    const runClip   = find("Running") ?? find("Run_03") ?? animations[0];
    const jumpClip  = find("Run_and_Jump");
    const slideClip = find("slide_light");

    const runAction = mixer.clipAction(runClip);
    runAction.loop = THREE.LoopRepeat;
    runAction.play();
    runActionRef.current = runAction;

    if (jumpClip) {
      const a = mixer.clipAction(jumpClip);
      a.loop = THREE.LoopOnce;
      a.clampWhenFinished = true;
      a.timeScale = JUMP_TIMESCALE;
      a.setEffectiveWeight(0);
      jumpActionRef.current = a;
    }

    if (slideClip) {
      const a = mixer.clipAction(slideClip);
      a.loop = THREE.LoopOnce;
      a.clampWhenFinished = true;
      a.timeScale = SLIDE_TIMESCALE;
      a.setEffectiveWeight(0);
      slideActionRef.current = a;
    }

    // Wire up Bubble_Dance from dance.glb (same skeleton → clip works directly)
    const bubbleClip = danceAnims.find((a) => a.name === "Bubble_Dance");
    if (bubbleClip) {
      const da = mixer.clipAction(bubbleClip);
      da.loop = THREE.LoopOnce;
      da.clampWhenFinished = true;
      da.setEffectiveWeight(0);
      danceActionRef.current = da;
    }

    prevJumpRef.current  = false;
    prevSlideRef.current = false;
    prevDancingRef.current = false;
    jumpProgressRef.current = 0;
    jumpDoneRef.current = false;
    danceTimeRef.current = 0;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      root.remove(cloned);
      clonedRef.current = null;
    };
  }, [gltfScene, animations, danceAnims]);

  useFrame((_, delta) => {
    const root   = rootRef.current;
    if (!root || !mixerRef.current) return;

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;
    const dancing = isDancingRef.current;
    const run     = runActionRef.current;
    const jump    = jumpActionRef.current;
    const slide   = slideActionRef.current;
    const dance   = danceActionRef.current;

    // ── Dance mode ──────────────────────────────────────────────────────
    if (dancing) {
      if (!prevDancingRef.current) {
        danceTimeRef.current = 0;
        // Fade out running/jump/slide
        run?.setEffectiveWeight(0);
        jump?.setEffectiveWeight(0);
        slide?.setEffectiveWeight(0);
        // Turn to face camera (+Z)
        const cloned = clonedRef.current;
        if (cloned) cloned.rotation.y = 0;
        // Start Bubble_Dance
        if (dance) {
          dance.reset();
          dance.setEffectiveWeight(1);
          dance.play();
        }
      }
      prevDancingRef.current = true;
      danceTimeRef.current  += delta;

      // Slide character to centre lane while dancing
      root.position.x += (LANE_X[1] - root.position.x) * Math.min(1, delta * 8);

      // Advance mixer for the dance animation
      mixerRef.current.update(delta);

      // Root-motion lock (keep feet planted)
      const cloned = clonedRef.current;
      if (cloned) { cloned.position.x = 0; cloned.position.z = 0; cloned.position.y = groundYRef.current; }
      const rb = rootBoneRef.current;
      if (rb) { rb.position.x = 0; rb.position.z = 0; }

      // Auto-end after clip finishes
      if (danceTimeRef.current >= DANCE_DURATION) {
        if (cloned) cloned.rotation.y = Math.PI;
        root.position.y = 0;
        if (dance) { dance.setEffectiveWeight(0); dance.stop(); }
        onDanceEndRef.current();
      }
      return;
    }

    // Falling edge of dance — restore everything
    if (prevDancingRef.current && !dancing) {
      prevDancingRef.current = false;
      dance?.setEffectiveWeight(0);
      run?.setEffectiveWeight(1);
      jumpProgressRef.current = 0;
      jumpDoneRef.current     = false;
    }

    // ── Dying (fall) animation ───────────────────────────────────────────
    const dying = isDyingRef.current;
    if (dying) {
      if (!prevDyingRef.current) {
        // First frame of dying: stop all anims, freeze hit-shake, reset pose
        dyingTimeRef.current = 0;
        hitTimerRef.current  = 0;
        root.rotation.z      = 0;
        run?.setEffectiveWeight(0);
        jump?.setEffectiveWeight(0);
        slide?.setEffectiveWeight(0);
        dance?.setEffectiveWeight(0);
      }
      prevDyingRef.current = true;
      dyingTimeRef.current += delta;
      const t = Math.min(1, dyingTimeRef.current / 0.9); // 0.9s fall duration

      // Lean forward (rotate around X axis toward +Z = falling forward)
      root.rotation.x = -t * (Math.PI * 0.48);
      // Shift slightly in the direction of fall (forward = -Z for the camera)
      root.position.z = -t * 0.6;
      // Sink into ground as they fall
      root.position.y = Math.max(0, (1 - t) * root.position.y - t * 0.15);

      // Advance mixer with 0 delta to keep pose frozen
      mixerRef.current.update(0);
      return;
    }

    // Falling edge of dying — clear
    if (prevDyingRef.current && !dying) {
      prevDyingRef.current = false;
      root.rotation.x = 0;
      root.position.z = 0;
      root.position.y = 0;
      dyingTimeRef.current = 0;
    }

    // ── Normal running mode ─────────────────────────────────────────────
    if (jumping && !prevJumpRef.current && jump) {
      jump.reset(); jump.play();
      jumpProgressRef.current = 0;
      jumpDoneRef.current = false;
    }
    if (sliding && !prevSlideRef.current && slide) {
      slide.reset(); slide.play();
    }
    prevJumpRef.current  = jumping;
    prevSlideRef.current = sliding;

    mixerRef.current.update(delta);

    const f = Math.min(1, delta * BLEND);
    if (run)   run.setEffectiveWeight(THREE.MathUtils.lerp(run.getEffectiveWeight(),   (!jumping && !sliding) ? 1 : 0, f));
    if (jump)  jump.setEffectiveWeight(THREE.MathUtils.lerp(jump.getEffectiveWeight(),  jumping ? 1 : 0, f));
    if (slide) slide.setEffectiveWeight(THREE.MathUtils.lerp(slide.getEffectiveWeight(), sliding ? 1 : 0, f));

    // Root-motion lock
    const cloned = clonedRef.current;
    if (cloned) { cloned.position.x = 0; cloned.position.z = 0; cloned.position.y = groundYRef.current; }
    const rb = rootBoneRef.current;
    if (rb) { rb.position.x = 0; rb.position.z = 0; if (jumping) rb.position.y = rootBoneInitY.current; }

    // Ground level depends on surface the player is on
    const groundLevel = isOnTrain ? 2.2 : 0;

    // Jetpack: float up and hold at 3.0
    if (isJetpack && !isOnTrain) {
      root.position.y = THREE.MathUtils.lerp(root.position.y, 3.0, Math.min(1, delta * 3.5));
      jumpProgressRef.current = 0;
      jumpDoneRef.current     = false;
    }
    // Jump arc (from current ground level)
    else if (jumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta / JUMP_DURATION);
      root.position.y = groundLevel + Math.sin(jumpProgressRef.current * Math.PI) * JUMP_HEIGHT;
      if (jumpProgressRef.current >= 0.92 && !jumpDoneRef.current) {
        jumpDoneRef.current = true;
        onCompleteRef.current();
      }
    } else {
      jumpProgressRef.current = 0;
      jumpDoneRef.current     = false;
      root.position.y = THREE.MathUtils.lerp(root.position.y, groundLevel, Math.min(1, delta * 12));
    }

    // Lane switching
    root.position.x += (targetXRef.current - root.position.x) * Math.min(1, delta * 14);

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

useGLTF.preload(`${import.meta.env.BASE_URL}models/character.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/dance.glb`);
