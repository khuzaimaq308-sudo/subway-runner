import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type ObstacleType = "barrier" | "train" | "box" | "incoming_train" | "low_gate";

interface ObstacleData {
  mesh: THREE.Group;
  lane: number;
  z: number;
  type: ObstacleType;
  jumpable: boolean;
  slideOnly: boolean;
  extraSpeed: number;
}

interface ObstaclesProps {
  speed: number;
  playing: boolean;
  playerLane: number;
  playerJumping: boolean;
  playerSliding: boolean;
  onHit: () => void;
  onTrainHorn: () => void;
}

const LANE_X  = [-2.5, 0, 2.5];
const SPAWN_Z = -65;
const PLAYER_Z = 0;
const DESPAWN_Z = 12;

// ── non-train shared materials (unchanged) ────────────────────────────────
const matOrange  = new THREE.MeshLambertMaterial({ color: 0xFF8C00 });
const matYellow  = new THREE.MeshLambertMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.4 });
const matBox     = new THREE.MeshLambertMaterial({ color: 0xD4A020 });
const matBoxEdge = new THREE.MeshLambertMaterial({ color: 0x8B6010, wireframe: true });
const matGate    = new THREE.MeshLambertMaterial({ color: 0xDD3300 });
const matGateDk  = new THREE.MeshLambertMaterial({ color: 0xAA2200 });
const matBlack   = new THREE.MeshLambertMaterial({ color: 0x111111 });
const matYellowT = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });

// ── Image-based region texture helper ────────────────────────────────────
/**
 * Crop a specific region (normalised 0-1 coords, top-left origin) from an
 * image file and return it as a CanvasTexture.  The canvas is pre-filled
 * with a placeholder colour so the mesh isn't black while the image loads.
 */
function makeRegionTex(
  src: string,
  sx: number, sy: number, sw: number, sh: number,
  canvasW: number, canvasH: number,
  placeholder = "#336699",
): THREE.CanvasTexture {
  const cv  = document.createElement("canvas");
  cv.width  = canvasW;
  cv.height = canvasH;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = placeholder;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const tex   = new THREE.CanvasTexture(cv);
  tex.flipY   = false;   // canvas Y already matches image-file Y
  tex.needsUpdate = true;

  const draw = (img: HTMLImageElement) => {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, sx * iw, sy * ih, sw * iw, sh * ih, 0, 0, canvasW, canvasH);
    tex.needsUpdate = true;
  };

  const img = new Image();
  img.onload = () => draw(img);
  img.src    = src;
  if (img.complete) draw(img);  // already cached

  return tex;
}

// ── Canvas draw helper ────────────────────────────────────────────────────
function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────
// train_car.png  = Image 2 (Subway Surfers style, ~1006×1006)
//   Layout (normalised, top-left origin):
//     SIDE A  – full width, top 17 %      (sy=0.00, sh=0.17)
//     FRONT   – left 23 %, rows 19-57 %   (sx=0.00, sy=0.19, sw=0.23, sh=0.38)
//     SIDE B  – centre, rows 19-42 %      (sx=0.24, sy=0.19, sw=0.54, sh=0.22)
//     ROOF    – centre, rows 43-57 %      (sx=0.24, sy=0.43, sw=0.54, sh=0.14)
//     BACK    – right 20 %, rows 19-57 %  (sx=0.80, sy=0.19, sw=0.20, sh=0.38)
//
// loco_car.png  = Image 1 (blue graffiti, ~1024×1024)
//   Layout:
//     FRONT      – top-left 21 %×19 %     (sx=0.00, sy=0.00, sw=0.21, sh=0.19)
//     LEFT SIDE  – top strip, right 79 %  (sx=0.21, sy=0.00, sw=0.79, sh=0.19)
//     RIGHT SIDE – middle strip, 73 %×19% (sx=0.00, sy=0.25, sw=0.73, sh=0.19)
//     TOP        – bottom-centre 52 %×15% (sx=0.00, sy=0.72, sw=0.52, sh=0.15)
//     BACK       – right col, middle      (sx=0.80, sy=0.19, sw=0.20, sh=0.37)
// ─────────────────────────────────────────────────────────────────────────
const CAR  = "/textures/train_car.png";
const LOCO = "/textures/loco_car.png";

// Pre-built region textures — created lazily on first use
const _r: Record<string, THREE.CanvasTexture> = {};
function R(key: string, src: string, sx: number, sy: number, sw: number, sh: number, w=512, h=256) {
  return _r[key] ??= makeRegionTex(src, sx, sy, sw, sh, w, h);
}
const carSide  = () => R("carSide",  CAR,  0.00, 0.00, 1.00, 0.17, 512, 128);
const carFront = () => R("carFront", CAR,  0.00, 0.19, 0.23, 0.38, 256, 256);
const carBack  = () => R("carBack",  CAR,  0.80, 0.19, 0.20, 0.38, 256, 256);
const carRoof  = () => R("carRoof",  CAR,  0.24, 0.43, 0.54, 0.14, 512, 128);
const locoSide = () => R("locoSide", LOCO, 0.21, 0.00, 0.79, 0.19, 512, 128);
const locoFace = () => R("locoFace", LOCO, 0.00, 0.00, 0.21, 0.19, 256, 256);
const locoRoof = () => R("locoRoof", LOCO, 0.00, 0.72, 0.52, 0.15, 512, 128);
const locoBack = () => R("locoBack", LOCO, 0.80, 0.19, 0.20, 0.37, 256, 256);

function mat(tex: THREE.CanvasTexture) {
  return new THREE.MeshLambertMaterial({ map: tex });
}
const matDarkBot  = new THREE.MeshLambertMaterial({ color: 0x111122 });
const matDarkRoof = new THREE.MeshLambertMaterial({ color: 0x223344 });

// ── DEPRECATED procedural helpers (kept for non-train obstacles) ──────────
/** Side panel of a train car (seen by the player as they run alongside) */
function makeCarSideTex(): THREE.CanvasTexture {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Body gradient — cherry red
  const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
  bodyGrad.addColorStop(0, "#FF3333");
  bodyGrad.addColorStop(0.5, "#CC1111");
  bodyGrad.addColorStop(1,   "#AA0000");
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(0, 0, W, H);

  // Top highlight stripe
  ctx.fillStyle = "rgba(255,180,180,0.3)";
  ctx.fillRect(0, 0, W, 40);

  // Yellow bottom racing stripe
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(0, H - 36, W, 22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, H - 14, W, 14);

  // Windows — two per side
  const wins = [
    { cx: 108, cy: 105 },
    { cx: 298, cy: 105 },
    { cx: 440, cy: 105 },
  ];
  for (const { cx, cy } of wins) {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    rr(ctx, cx - 42, cy - 38, 84, 76, 10);
    ctx.fill();
    // Glass
    const winGrad = ctx.createLinearGradient(cx - 40, cy - 36, cx - 40, cy + 36);
    winGrad.addColorStop(0, "#C5EEFF");
    winGrad.addColorStop(1, "#7EC8E3");
    ctx.fillStyle = winGrad;
    rr(ctx, cx - 40, cy - 36, 80, 72, 10);
    ctx.fill();
    // Glass shine
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 18, 22, 12, -0.35, 0, Math.PI * 2);
    ctx.fill();
    // Frame outline
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 6;
    rr(ctx, cx - 40, cy - 36, 80, 72, 10);
    ctx.stroke();
  }

  // Rivet dots along top and bottom edges
  ctx.fillStyle = "#888";
  for (let x = 24; x < W; x += 52) {
    ctx.beginPath(); ctx.arc(x, 16, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Bold black outline
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  // "METRO" label
  ctx.font = "bold 34px Arial Black, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFD700";
  ctx.fillText("METRO", W / 2, H - 50);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeText("METRO", W / 2, H - 50);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** End panel / door face seen head-on as the train approaches */
function makeCarEndTex(): THREE.CanvasTexture {
  const W = 256, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Body
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#FF3333");
  bg.addColorStop(1, "#AA0000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Door
  const doorGrad = ctx.createLinearGradient(80, 80, 80, H - 20);
  doorGrad.addColorStop(0, "#CC1111");
  doorGrad.addColorStop(1, "#991100");
  ctx.fillStyle = doorGrad;
  rr(ctx, 80, 80, 96, H - 100, 8);
  ctx.fill();
  // Door highlight
  ctx.fillStyle = "rgba(255,150,150,0.25)";
  rr(ctx, 84, 84, 44, H - 108, 6);
  ctx.fill();
  // Door outline
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5;
  rr(ctx, 80, 80, 96, H - 100, 8);
  ctx.stroke();
  // Door handle
  ctx.fillStyle = "#FFD700";
  ctx.beginPath(); ctx.arc(164, H / 2 + 20, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(164, H / 2 + 20, 7, 0, Math.PI * 2); ctx.stroke();

  // Small porthole window
  ctx.fillStyle = "#C5EEFF";
  ctx.beginPath(); ctx.arc(W / 2, 45, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath(); ctx.ellipse(W / 2 - 8, 35, 12, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(W / 2, 45, 28, 0, Math.PI * 2); ctx.stroke();

  // Yellow bottom stripe
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(0, H - 36, W, 22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, H - 14, W, 14);

  // Outer outline
  ctx.strokeStyle = "#000"; ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Roof of the train car */
function makeCarRoofTex(): THREE.CanvasTexture {
  const W = 256, H = 128;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#881111";
  ctx.fillRect(0, 0, W, H);
  // ventilation ridges
  ctx.strokeStyle = "#AA2222";
  ctx.lineWidth = 8;
  for (let x = 20; x < W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

/** Big scary/funny cartoon face on the locomotive front */
function makeLocoFaceTex(): THREE.CanvasTexture {
  const W = 256, H = 286;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // Background — bright yellow-green
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#88DD11");
  bg.addColorStop(1, "#449900");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top highlight
  ctx.fillStyle = "rgba(255,255,200,0.25)";
  ctx.fillRect(0, 0, W, 50);

  // ── Left eye ──────────────────────────────────────────────────────
  // White sclera
  ctx.fillStyle = "#FFFBE8";
  ctx.beginPath(); ctx.ellipse(73, 100, 44, 48, 0, 0, Math.PI * 2); ctx.fill();
  // Pupil
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.ellipse(73, 108, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
  // Shine
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(63, 97, 10, 8, -0.4, 0, Math.PI * 2); ctx.fill();
  // Angry brow
  ctx.strokeStyle = "#111"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(33, 56); ctx.lineTo(110, 70); ctx.stroke();
  // Eye outline
  ctx.strokeStyle = "#111"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(73, 100, 44, 48, 0, 0, Math.PI * 2); ctx.stroke();

  // ── Right eye ─────────────────────────────────────────────────────
  ctx.fillStyle = "#FFFBE8";
  ctx.beginPath(); ctx.ellipse(183, 100, 44, 48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.ellipse(183, 108, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(173, 97, 10, 8, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#111"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(223, 56); ctx.lineTo(146, 70); ctx.stroke();
  ctx.strokeStyle = "#111"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(183, 100, 44, 48, 0, 0, Math.PI * 2); ctx.stroke();

  // ── Grille mouth / smile ──────────────────────────────────────────
  ctx.fillStyle = "#222";
  rr(ctx, 36, 175, W - 72, 65, 12);
  ctx.fill();
  // Grille teeth bars
  ctx.fillStyle = "#FFFBE8";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(44 + i * 38, 180, 22, 55);
  }
  // Grille outline
  ctx.strokeStyle = "#000"; ctx.lineWidth = 6;
  rr(ctx, 36, 175, W - 72, 65, 12);
  ctx.stroke();

  // Headlight shine dots above eyes
  ctx.fillStyle = "rgba(255,255,150,0.85)";
  ctx.beginPath(); ctx.arc(73, 40, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(183, 40, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(73, 40, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(183, 40, 14, 0, Math.PI * 2); ctx.stroke();

  // Bold outer outline
  ctx.strokeStyle = "#000"; ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Green loco body side */
function makeLocoSideTex(): THREE.CanvasTexture {
  const W = 512, H = 300;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#55DD22");
  bg.addColorStop(1, "#228800");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Diagonal stripe accent
  ctx.fillStyle = "rgba(255,220,0,0.3)";
  for (let x = -H; x < W + H; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0);
    ctx.lineTo(x + 40 + H, H); ctx.lineTo(x + H, H);
    ctx.closePath(); ctx.fill();
  }

  // "LOCO" text
  ctx.font = "bold 52px Arial Black, Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFD700";
  ctx.fillText("EXPRESS", W / 2, H / 2 + 10);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
  ctx.strokeText("EXPRESS", W / 2, H / 2 + 10);

  // Yellow bottom stripe
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(0, H - 30, W, 20);

  ctx.strokeStyle = "#000"; ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

// ── Lazy singleton textures ───────────────────────────────────────────────
let _carSide: THREE.CanvasTexture | null = null;
let _carEnd:  THREE.CanvasTexture | null = null;
let _carRoof: THREE.CanvasTexture | null = null;
let _locoFace: THREE.CanvasTexture | null = null;
let _locoSide: THREE.CanvasTexture | null = null;
const getCarSide  = () => (_carSide  ??= makeCarSideTex());
const getCarEnd   = () => (_carEnd   ??= makeCarEndTex());
const getCarRoof  = () => (_carRoof  ??= makeCarRoofTex());
const getLocoFace = () => (_locoFace ??= makeLocoFaceTex());
const getLocoSide = () => (_locoSide ??= makeLocoSideTex());

// BoxGeometry face order: +X(right), -X(left), +Y(roof), -Y(bot), +Z(back/cam-side), -Z(front/far)
function carMats() {
  // Sides  : SIDE A strip from train_car.png
  // Roof   : ROOF region from train_car.png
  // Bottom : dark
  // +Z face (player side, rear end of car) : BACK region
  // -Z face (far end of car, leading edge)  : FRONT region
  return [
    mat(carSide()),   // +X
    mat(carSide()),   // -X
    mat(carRoof()),   // +Y
    matDarkBot,       // -Y
    mat(carBack()),   // +Z  (camera-facing, rear end)
    mat(carFront()),  // -Z  (leading end, far from camera)
  ];
}

function locoBodyMats() {
  return [
    mat(locoSide()),  // +X
    mat(locoSide()),  // -X
    mat(locoRoof()),  // +Y
    matDarkBot,       // -Y
    mat(locoBack()),  // +Z (rear)
    mat(locoSide()),  // -Z (front body, nose added separately)
  ];
}

function locoNoseMats() {
  // Nose box at z=3, body at z=0 → nose +Z face (at z=4) faces the player
  // (headlight glows are placed at z=4.02 confirming this)
  return [
    mat(locoSide()),  // +X
    mat(locoSide()),  // -X
    mat(locoRoof()),  // +Y
    matDarkBot,       // -Y
    mat(locoFace()),  // +Z ← FRONT FACE, player-facing tip
    mat(locoSide()),  // -Z  connects to body
  ];
}

// ── Non-train obstacle builders ───────────────────────────────────────────
function makeBarrier(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const bar    = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.3), matOrange);
  bar.position.set(0, 0.3, 0);
  const leg1   = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.3), matOrange);
  leg1.position.set(-0.9, 0.15, 0);
  const leg2   = leg1.clone(); leg2.position.set(0.9, 0.15, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.35), matYellow);
  stripe.position.set(0, 0.56, 0);
  group.add(bar, leg1, leg2, stripe);
  return { mesh: group, lane, z: SPAWN_Z, type: "barrier", jumpable: true, slideOnly: false, extraSpeed: 0 };
}

function makeLowGate(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const bar    = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.3), matGate);
  bar.position.set(0, 1.05, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.32), matYellow);
  stripe.position.set(0, 1.14, 0);
  const post1  = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.05, 0.3), matGateDk);
  post1.position.set(-1.1, 0.52, 0);
  const post2  = post1.clone(); post2.position.set(1.1, 0.52, 0);
  const diag1  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.32), matYellow);
  diag1.position.set(-1.1, 0.75, 0); diag1.rotation.z = 0.4;
  const diag2  = diag1.clone(); diag2.position.set(1.1, 0.75, 0);
  group.add(bar, stripe, post1, post2, diag1, diag2);
  return { mesh: group, lane, z: SPAWN_Z, type: "low_gate", jumpable: false, slideOnly: true, extraSpeed: 0 };
}

// ── Cartoon train car ─────────────────────────────────────────────────────
function makeTrainCar(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);

  // Body — 6-material array for cartoon textures
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.5), carMats());
  body.position.set(0, 1.1, 0);
  group.add(body);

  // Roof ridge — dark navy to complement the teal texture
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.18, 4.3),
    new THREE.MeshLambertMaterial({ color: 0x1a3a50 }),
  );
  roof.position.set(0, 2.29, 0);
  group.add(roof);

  // Wheels — dark rubber-tyre cylinders
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const hubMat   = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const hubGeo   = new THREE.CylinderGeometry(0.1, 0.1, 0.17, 8);
  for (const z of [-1.5, 1.5]) {
    for (const x of [-1.05, 1.05]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.22, z);
      group.add(w);
      const h = new THREE.Mesh(hubGeo, hubMat);
      h.rotation.z = Math.PI / 2;
      h.position.set(x, 0.22, z);
      group.add(h);
    }
  }

  // Cartoon thick black outline effect — slightly larger semi-transparent box
  const outline = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 2.28, 4.58),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }),
  );
  outline.position.set(0, 1.1, 0);
  group.add(outline);

  return { mesh: group, lane, z: SPAWN_Z, type: "train", jumpable: false, slideOnly: false, extraSpeed: 0 };
}

// ── Cartoon incoming locomotive ───────────────────────────────────────────
function makeIncomingTrain(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z - 20);

  // Main loco body
  const loco = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 5), locoBodyMats());
  loco.position.set(0, 1.4, 0);
  group.add(loco);

  // Nose (front cowcatcher section) — cartoon FACE goes on its +Z face
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2), locoNoseMats());
  nose.position.set(0, 1.1, 3);
  group.add(nose);

  // Cartoon outline on loco body
  const outlineLoco = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.9, 5.1),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }),
  );
  outlineLoco.position.set(0, 1.4, 0);
  group.add(outlineLoco);

  // Chimney / smoke stack
  const chimneyGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.7, 8);
  const chimney    = new THREE.Mesh(chimneyGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
  chimney.position.set(-0.4, 2.95, 0.5);
  group.add(chimney);

  // Smoke puff ring
  const puffGeo = new THREE.TorusGeometry(0.22, 0.07, 6, 12);
  const puff    = new THREE.Mesh(puffGeo, new THREE.MeshLambertMaterial({ color: 0xDDDDDD, transparent: true, opacity: 0.7 }));
  puff.position.set(-0.4, 3.55, 0.5);
  group.add(puff);

  // Headlight glow — on top of the face texture
  const glowGeo  = new THREE.CircleGeometry(0.25, 10);
  const glowMat  = new THREE.MeshLambertMaterial({ color: 0xFFFFBB, emissive: 0xFFFF88, emissiveIntensity: 2 });
  const gL = new THREE.Mesh(glowGeo, glowMat);
  gL.position.set(-0.55, 1.5, 4.02);
  const gR = gL.clone(); gR.position.set(0.55, 1.5, 4.02);
  group.add(gL, gR);

  // Yellow stripe on wheels / base
  const cowcatcher = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.25, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xFFCC00 }),
  );
  cowcatcher.position.set(0, 0.12, 4.3);
  group.add(cowcatcher);

  // Wheels for loco
  const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 10);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const z of [-1.5, 0.5]) {
    for (const x of [-1.1, 1.1]) {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.28, z);
      group.add(w);
    }
  }

  return {
    mesh: group,
    lane,
    z: SPAWN_Z - 20,
    type: "incoming_train",
    jumpable: false,
    slideOnly: false,
    extraSpeed: 6,
  };
}

function makeBox(lane: number): ObstacleData {
  const group = new THREE.Group();
  group.position.set(LANE_X[lane], 0, SPAWN_Z);
  const body  = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matBox);
  body.position.set(0, 0.5, 0);
  const edges = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), matBoxEdge);
  edges.position.set(0, 0.5, 0);
  group.add(body, edges);
  return { mesh: group, lane, z: SPAWN_Z, type: "box", jumpable: true, slideOnly: false, extraSpeed: 0 };
}

// ── Main component ────────────────────────────────────────────────────────
export function Obstacles({
  speed, playing, playerLane, playerJumping, playerSliding, onHit, onTrainHorn,
}: ObstaclesProps) {
  const { scene } = useThree();
  const groupRef         = useRef<THREE.Group>(new THREE.Group());
  const obsRef           = useRef<ObstacleData[]>([]);
  const spawnTimerRef    = useRef(0);
  const incomingTimerRef = useRef(0);
  const hitCooldownRef   = useRef(0);
  const onHitRef  = useRef(onHit);
  const onHornRef = useRef(onTrainHorn);
  onHitRef.current  = onHit;
  onHornRef.current = onTrainHorn;

  useEffect(() => {
    const g = groupRef.current;
    scene.add(g);
    return () => {
      scene.remove(g);
      obsRef.current.forEach((o) => g.remove(o.mesh));
      obsRef.current = [];
    };
  }, [scene]);

  useEffect(() => {
    const g = groupRef.current;
    obsRef.current.forEach((o) => g.remove(o.mesh));
    obsRef.current = [];
    spawnTimerRef.current    = 0;
    incomingTimerRef.current = 0;
    hitCooldownRef.current   = 0;
  }, [playing]);

  useFrame((_, delta) => {
    if (!playing) return;

    spawnTimerRef.current    += delta;
    incomingTimerRef.current += delta;
    if (hitCooldownRef.current > 0) hitCooldownRef.current -= delta;

    // Regular obstacles
    const interval = Math.max(0.9, 2.4 - speed * 0.07);
    if (spawnTimerRef.current >= interval) {
      spawnTimerRef.current = 0;
      const numObs  = Math.random() < 0.3 ? 2 : 1;
      const safeLane = Math.floor(Math.random() * 3);
      const used     = new Set<number>();
      for (let i = 0; i < numObs; i++) {
        let lane = Math.floor(Math.random() * 3);
        let tries = 0;
        while ((used.has(lane) || (numObs > 1 && lane === safeLane)) && tries < 8) {
          lane = Math.floor(Math.random() * 3); tries++;
        }
        used.add(lane);
        const r = Math.random();
        let obs: ObstacleData;
        if      (r < 0.22) obs = makeBarrier(lane);
        else if (r < 0.44) obs = makeTrainCar(lane);
        else if (r < 0.60) obs = makeBox(lane);
        else               obs = makeLowGate(lane);
        groupRef.current.add(obs.mesh);
        obsRef.current.push(obs);
      }
    }

    // Incoming train
    const incomingInterval = Math.max(12, 20 - speed * 0.3);
    if (incomingTimerRef.current >= incomingInterval) {
      incomingTimerRef.current = 0;
      const obs = makeIncomingTrain(Math.floor(Math.random() * 3));
      groupRef.current.add(obs.mesh);
      obsRef.current.push(obs);
      onHornRef.current();
    }

    // Move + collision
    const toRemove: ObstacleData[] = [];
    const frameMove = speed * delta;
    for (const obs of obsRef.current) {
      const actualMove = frameMove + obs.extraSpeed * delta;
      obs.z += actualMove;
      obs.mesh.position.z = obs.z;

      if (hitCooldownRef.current <= 0) {
        const dx  = Math.abs(LANE_X[obs.lane] - LANE_X[playerLane]);
        const dz  = Math.abs(obs.z - PLAYER_Z);
        const hr  = obs.type === "incoming_train" ? 2.2 : obs.type === "train" ? 2.0 : 1.8;
        const dzt = Math.max(2.4, actualMove * 4);

        let blocked = true;
        if (obs.jumpable && playerJumping)         blocked = false;
        if (obs.type === "train" && playerJumping) blocked = false;
        if (playerSliding && !obs.jumpable)        blocked = false;
        if (obs.slideOnly && playerJumping)        blocked = true;

        if (dx < hr && dz < dzt && blocked) {
          hitCooldownRef.current = 1.8;
          onHitRef.current();
        }
      }

      if (obs.z > DESPAWN_Z) toRemove.push(obs);
    }

    for (const obs of toRemove) groupRef.current.remove(obs.mesh);
    obsRef.current = obsRef.current.filter((o) => !toRemove.includes(o));
  });

  return null;
}
