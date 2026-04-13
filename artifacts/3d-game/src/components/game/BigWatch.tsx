/**
 * BigWatch — a large golden watch that spawns once every 3 minutes.
 * Collecting it triggers the dance celebration sequence.
 */
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface BigWatchProps {
  speed: number;
  playing: boolean;
  playerLane: number;   // 0-2
  onCollect: () => void;
}

const LANE_X         = [-2.5, 0, 2.5];
const SPAWN_Z        = -70;
const DESPAWN_Z      = 8;
const PLAYER_Z       = 0;
// Between 2 min and 2.5 min — randomised each spawn
const SPAWN_INTERVAL_MIN = 120;
const SPAWN_INTERVAL_MAX = 150;
const WATCH_Y        = 1.2;
const WATCH_SCALE    = 3.2;
const SPAWN_LANE     = 1;    // always centre

// ── Geometry (shared) ────────────────────────────────────────────────────
const bezelGeo = new THREE.TorusGeometry(0.28, 0.052, 16, 40);
const caseGeo  = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 28);
const dialGeo  = new THREE.CircleGeometry(0.21, 40);
const hrGeo    = new THREE.BoxGeometry(0.026, 0.13, 0.012);
const minGeo   = new THREE.BoxGeometry(0.017, 0.175, 0.012);
const crownGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.075, 10);
const strapGeo = new THREE.BoxGeometry(0.17, 0.24, 0.065);
const ringGeo  = new THREE.TorusGeometry(1.15, 0.028, 8, 52);

// ── Materials ─────────────────────────────────────────────────────────────
const goldMat  = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 1.1 });
const dialMat  = new THREE.MeshLambertMaterial({ color: 0xFFFDF0, emissive: 0xFFFFCC, emissiveIntensity: 0.7, side: THREE.FrontSide });
const handMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
const strapMat = new THREE.MeshLambertMaterial({ color: 0x3A1204 });
const ringMat  = new THREE.MeshLambertMaterial({ color: 0xFFEE44, emissive: 0xFFDD00, emissiveIntensity: 1.8 });

function makeBigWatch(): THREE.Group {
  const g = new THREE.Group();

  g.add(new THREE.Mesh(bezelGeo, goldMat));

  const body = new THREE.Mesh(caseGeo, goldMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.position.z = 0.048;
  g.add(dial);

  const hr = new THREE.Mesh(hrGeo, handMat);
  hr.position.set(-0.025, 0.038, 0.055);
  hr.rotation.z = -0.52;
  g.add(hr);

  const min = new THREE.Mesh(minGeo, handMat);
  min.position.set(0.04, 0.05, 0.055);
  min.rotation.z = 0.95;
  g.add(min);

  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.35, 0.025, 0);
  g.add(crown);

  const st = new THREE.Mesh(strapGeo, strapMat);
  st.position.y = 0.40;
  g.add(st);
  const sb = new THREE.Mesh(strapGeo, strapMat);
  sb.position.y = -0.40;
  g.add(sb);

  // Two spinning orbit rings
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 3;
  g.add(ring1);
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.z = Math.PI / 2;
  g.add(ring2);

  g.scale.setScalar(WATCH_SCALE);
  return g;
}

export function BigWatch({ speed, playing, playerLane, onCollect }: BigWatchProps) {
  const { scene }    = useThree();
  const groupRef     = useRef(new THREE.Group());
  const watchRef     = useRef<THREE.Group | null>(null);
  const activeRef    = useRef(false);
  const watchZRef    = useRef(SPAWN_Z);
  const timerRef     = useRef(SPAWN_INTERVAL_MIN);
  const timeRef      = useRef(0);
  const onCollectRef = useRef(onCollect);
  const speedRef     = useRef(speed);
  onCollectRef.current = onCollect;
  speedRef.current     = speed;

  useEffect(() => {
    scene.add(groupRef.current);
    return () => { scene.remove(groupRef.current); };
  }, [scene]);

  useEffect(() => {
    const g = groupRef.current;
    if (watchRef.current) { g.remove(watchRef.current); watchRef.current = null; }
    activeRef.current = false;
    timerRef.current  = SPAWN_INTERVAL_MIN;
    timeRef.current   = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;
    timeRef.current  += delta;
    timerRef.current -= delta;

    // Spawn when timer fires — randomise next interval between 2–2.5 min
    if (timerRef.current <= 0 && !activeRef.current) {
      timerRef.current = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      const watch = makeBigWatch();
      watch.position.set(LANE_X[SPAWN_LANE], WATCH_Y, SPAWN_Z);
      groupRef.current.add(watch);
      watchRef.current  = watch;
      watchZRef.current = SPAWN_Z;
      activeRef.current = true;
    }

    if (!activeRef.current || !watchRef.current) return;

    const w = watchRef.current;
    const t = timeRef.current;

    // Scroll
    watchZRef.current += speedRef.current * delta;
    w.position.z = watchZRef.current;

    // Bob
    w.position.y = WATCH_Y + Math.sin(t * 2.2) * 0.18;

    // Spin
    w.rotation.y = t * 0.9;

    // Pulse
    const pulse = 1 + Math.sin(t * 5) * 0.07;
    w.scale.setScalar(WATCH_SCALE * pulse);

    // Missed
    if (watchZRef.current > DESPAWN_Z) {
      groupRef.current.remove(w);
      watchRef.current  = null;
      activeRef.current = false;
      return;
    }

    // Collision
    const dx = Math.abs(LANE_X[SPAWN_LANE] - LANE_X[playerLane]);
    const dz = Math.abs(watchZRef.current - PLAYER_Z);
    if (dx < 2.4 && dz < 3.5) {
      groupRef.current.remove(w);
      watchRef.current  = null;
      activeRef.current = false;
      onCollectRef.current();
    }
  });

  return null;
}
