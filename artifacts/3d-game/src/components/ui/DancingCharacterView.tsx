import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const BASE = import.meta.env.BASE_URL as string;

function Lights() {
  const { scene } = useThree();
  useEffect(() => {
    const amb = new THREE.AmbientLight(0xffeedd, 1.6);
    const dir = new THREE.DirectionalLight(0xffffff, 2.4);
    dir.position.set(2, 4, 3);
    const rim = new THREE.DirectionalLight(0x9977ff, 1.0);
    rim.position.set(-3, 2, -2);
    const bot = new THREE.DirectionalLight(0xFFD700, 0.6);
    bot.position.set(0, -2, 1);
    scene.add(amb, dir, rim, bot);
    return () => { scene.remove(amb, dir, rim, bot); };
  }, [scene]);
  return null;
}

function DancerMesh() {
  const { scene: gltfScene, animations } = useGLTF(`${BASE}models/character.glb`);
  const { animations: danceAnims }       = useGLTF(`${BASE}models/dance.glb`);
  const { scene } = useThree();

  const rootRef   = useRef<THREE.Group>(new THREE.Group());
  const mixerRef  = useRef<THREE.AnimationMixer | null>(null);
  const timeRef   = useRef(0);

  useEffect(() => {
    const root   = rootRef.current;
    const cloned = skeletonClone(gltfScene);

    cloned.rotation.y = 0;       // face camera
    cloned.scale.setScalar(1.0);
    root.position.set(0, -1.05, 0);
    root.add(cloned);
    scene.add(root);

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const clip =
      danceAnims.find((a) => a.name === "Bubble_Dance" || a.name.toLowerCase().includes("dance")) ??
      danceAnims[0] ??
      animations[0];

    if (clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }

    return () => {
      scene.remove(root);
      mixer.stopAllAction();
    };
  }, [gltfScene, danceAnims, animations, scene]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    const root = rootRef.current;
    // lock root-motion translation so character stays planted
    root.children[0]?.position.set(0, 0, 0);
    const rb = root.children[0]?.getObjectByName("Root") as THREE.Bone | undefined;
    if (rb) { rb.position.x = 0; rb.position.z = 0; }
    // gentle bob
    timeRef.current += delta;
    root.position.y = -1.05 + Math.sin(timeRef.current * 1.9) * 0.04;
  });

  return null;
}

export function DancingCharacterView() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.55, 3.2], fov: 50 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <Lights />
      <DancerMesh />
    </Canvas>
  );
}

useGLTF.preload(`${BASE}models/character.glb`);
useGLTF.preload(`${BASE}models/dance.glb`);
