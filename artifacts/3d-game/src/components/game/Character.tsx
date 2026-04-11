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
const DANCE_DURATION = 5.5;   // seconds before auto-end

interface CharacterProps {
  lane: Lane;
  isJumping: boolean;
  isHit: boolean;
  isSliding: boolean;
  isDancing: boolean;
  onJumpComplete: () => void;
  onDanceEnd: () => void;
}

// ── Bone lookup helpers ──────────────────────────────────────────────────
interface DanceBones {
  hips:     THREE.Bone | null;
  spine:    THREE.Bone | null;
  head:     THREE.Bone | null;
  leftArm:  THREE.Bone | null;
  rightArm: THREE.Bone | null;
  leftFore: THREE.Bone | null;
  rightFore:THREE.Bone | null;
  leftLeg:  THREE.Bone | null;
  rightLeg: THREE.Bone | null;
}

function findBones(root: THREE.Object3D): DanceBones {
  const result: DanceBones = {
    hips: null, spine: null, head: null,
    leftArm: null, rightArm: null,
    leftFore: null, rightFore: null,
    leftLeg: null, rightLeg: null,
  };
  root.traverse((n) => {
    if (!(n instanceof THREE.Bone)) return;
    const name = n.name.toLowerCase();
    if (!result.hips      && (name.includes("hip")))                          result.hips      = n;
    if (!result.spine     && (name.includes("spine") && !name.includes("2"))) result.spine     = n;
    if (!result.head      && (name.includes("head")))                         result.head      = n;
    // arm: prefer "arm" without "forearm"
    if (!result.leftArm   && name.includes("left")  && name.includes("arm") && !name.includes("fore")) result.leftArm  = n;
    if (!result.rightArm  && name.includes("right") && name.includes("arm") && !name.includes("fore")) result.rightArm = n;
    if (!result.leftFore  && name.includes("left")  && name.includes("fore"))                          result.leftFore = n;
    if (!result.rightFore && name.includes("right") && name.includes("fore"))                          result.rightFore = n;
    if (!result.leftLeg   && name.includes("left")  && (name.includes("upleg") || name.includes("thigh"))) result.leftLeg  = n;
    if (!result.rightLeg  && name.includes("right") && (name.includes("upleg") || name.includes("thigh"))) result.rightLeg = n;
  });
  return result;
}

// ── Procedural dance ─────────────────────────────────────────────────────
function applyDance(bones: DanceBones, t: number, root: THREE.Group) {
  const beat  = t * 3.0;        // ~3 Hz "bounce"
  const slow  = t * 1.5;

  // Body bob
  root.position.y = Math.abs(Math.sin(beat)) * 0.14;

  // Hip sway + rotation
  if (bones.hips) {
    bones.hips.rotation.y = Math.sin(slow) * 0.4;
    bones.hips.rotation.z = Math.sin(beat) * 0.08;
  }
  // Spine lean
  if (bones.spine) {
    bones.spine.rotation.z = Math.sin(slow + 1) * 0.15;
    bones.spine.rotation.y = Math.sin(slow * 0.7) * 0.18;
  }
  // Head groove
  if (bones.head) {
    bones.head.rotation.z = Math.sin(beat + 0.5) * 0.12;
    bones.head.rotation.y = Math.sin(slow * 0.9) * 0.25;
  }
  // Left arm wave
  if (bones.leftArm) {
    bones.leftArm.rotation.z = 0.8 + Math.sin(beat) * 0.6;
    bones.leftArm.rotation.x = Math.sin(beat * 0.8) * 0.3;
  }
  // Right arm wave (opposite phase)
  if (bones.rightArm) {
    bones.rightArm.rotation.z = -(0.8 + Math.sin(beat + Math.PI) * 0.6);
    bones.rightArm.rotation.x = Math.sin(beat * 0.8 + Math.PI) * 0.3;
  }
  // Forearm bends
  if (bones.leftFore) {
    bones.leftFore.rotation.y = -0.4 + Math.sin(beat * 1.1) * 0.4;
  }
  if (bones.rightFore) {
    bones.rightFore.rotation.y = 0.4 - Math.sin(beat * 1.1 + Math.PI) * 0.4;
  }
  // Leg shuffle
  if (bones.leftLeg) {
    bones.leftLeg.rotation.x = Math.sin(beat + Math.PI) * 0.22;
  }
  if (bones.rightLeg) {
    bones.rightLeg.rotation.x = Math.sin(beat) * 0.22;
  }
}

export function Character({
  lane, isJumping, isHit, isSliding, isDancing, onJumpComplete, onDanceEnd,
}: CharacterProps) {
  const { scene } = useThree();
  const { scene: gltfScene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/character.glb`);

  const rootRef         = useRef<THREE.Group>(new THREE.Group());
  const clonedRef       = useRef<THREE.Object3D | null>(null);
  const groundYRef      = useRef(0);
  const rootBoneRef     = useRef<THREE.Bone | null>(null);
  const rootBoneInitY   = useRef(0);
  const danceBonesRef   = useRef<DanceBones | null>(null);

  const mixerRef      = useRef<THREE.AnimationMixer | null>(null);
  const runActionRef  = useRef<THREE.AnimationAction | null>(null);
  const jumpActionRef = useRef<THREE.AnimationAction | null>(null);
  const slideActionRef = useRef<THREE.AnimationAction | null>(null);

  const jumpProgressRef  = useRef(0);
  const jumpDoneRef      = useRef(false);
  const hitTimerRef      = useRef(0);
  const targetXRef       = useRef(LANE_X[lane + 1]);
  const danceTimeRef     = useRef(0);
  const dancingRef       = useRef(false);
  const prevDancingRef   = useRef(false);

  const isJumpingRef  = useRef(isJumping);
  const isSlidingRef  = useRef(isSliding);
  const isDancingRef  = useRef(isDancing);
  const onCompleteRef = useRef(onJumpComplete);
  const onDanceEndRef = useRef(onDanceEnd);
  const prevJumpRef   = useRef(false);
  const prevSlideRef  = useRef(false);

  isJumpingRef.current  = isJumping;
  isSlidingRef.current  = isSliding;
  isDancingRef.current  = isDancing;
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

    // Find dance bones
    danceBonesRef.current = findBones(cloned);

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

    prevJumpRef.current  = false;
    prevSlideRef.current = false;
    prevDancingRef.current = false;
    jumpProgressRef.current = 0;
    jumpDoneRef.current = false;
    danceTimeRef.current = 0;
    dancingRef.current = false;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(cloned);
      root.remove(cloned);
      clonedRef.current = null;
    };
  }, [gltfScene, animations]);

  useFrame((_, delta) => {
    const root    = rootRef.current;
    if (!root || !mixerRef.current) return;

    const jumping = isJumpingRef.current;
    const sliding = isSlidingRef.current;
    const dancing = isDancingRef.current;
    const run   = runActionRef.current;
    const jump  = jumpActionRef.current;
    const slide = slideActionRef.current;

    // ── Dance mode ──────────────────────────────────────────────────────
    if (dancing) {
      // Rising edge — freeze all anim actions, face camera
      if (!prevDancingRef.current) {
        danceTimeRef.current = 0;
        run?.setEffectiveWeight(0);
        jump?.setEffectiveWeight(0);
        slide?.setEffectiveWeight(0);
        // Turn to face camera (+Z)
        const cloned = clonedRef.current;
        if (cloned) cloned.rotation.y = 0;
      }
      prevDancingRef.current = true;
      danceTimeRef.current  += delta;

      // Lock X to centre while dancing
      root.position.x += (LANE_X[1] - root.position.x) * Math.min(1, delta * 8);

      // Procedural dance (no mixer update)
      if (danceBonesRef.current) {
        applyDance(danceBonesRef.current, danceTimeRef.current, root);
      } else {
        // fallback: just bob
        root.position.y = Math.abs(Math.sin(danceTimeRef.current * 3)) * 0.15;
      }

      // Auto-end
      if (danceTimeRef.current >= DANCE_DURATION) {
        // Restore character orientation
        const cloned = clonedRef.current;
        if (cloned) cloned.rotation.y = Math.PI;
        root.position.y = 0;
        onDanceEndRef.current();
      }
      return; // Skip normal update
    }

    // Falling edge of dance — restore everything
    if (prevDancingRef.current && !dancing) {
      prevDancingRef.current = false;
      run?.setEffectiveWeight(1);
      jumpProgressRef.current = 0;
      jumpDoneRef.current     = false;
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

    // Jump arc
    if (jumping) {
      jumpProgressRef.current = Math.min(1, jumpProgressRef.current + delta / JUMP_DURATION);
      root.position.y = Math.sin(jumpProgressRef.current * Math.PI) * JUMP_HEIGHT;
      if (jumpProgressRef.current >= 0.92 && !jumpDoneRef.current) {
        jumpDoneRef.current = true;
        onCompleteRef.current();
      }
    } else {
      jumpProgressRef.current = 0;
      jumpDoneRef.current     = false;
      root.position.y = THREE.MathUtils.lerp(root.position.y, 0, Math.min(1, delta * 12));
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
