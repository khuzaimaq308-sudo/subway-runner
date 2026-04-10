import { useRef, useCallback } from "react";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

function playCoin(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1047, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2); gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1319, ctx.currentTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(2637, ctx.currentTime + 0.13);
  gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc2.start(ctx.currentTime + 0.05); osc2.stop(ctx.currentTime + 0.3);
}

function playSlide(ctx: AudioContext) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.45, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playJump(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
  osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.28);
}

function playHit(ctx: AudioContext) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1.0, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(ctx.currentTime);

  const osc = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc.connect(gain2); gain2.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
  gain2.gain.setValueAtTime(0.4, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
}

function playTrainHorn(ctx: AudioContext) {
  const freqs = [220, 277, 330, 415];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.01);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.01 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime + i * 0.01);
    osc.stop(ctx.currentTime + 0.9);
  });
}

/** Short muffled thud — left and right feet alternate in pitch */
function playFootstep(ctx: AudioContext, leftFoot: boolean) {
  const dur = 0.09;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // White noise with a fast exponential decay
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Low-pass for a muffled concrete thud; slightly different freq per foot
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = leftFoot ? 280 : 320;

  // Subtle pitch oscillator underneath for body to the thud
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(leftFoot ? 65 : 72, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + dur);
  oscGain.gain.setValueAtTime(0.18, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(oscGain); oscGain.connect(ctx.destination);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.38, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

type SoundType = "coin" | "slide" | "jump" | "hit" | "trainhorn" | "footstep";

export function useSound() {
  const cooldowns = useRef<Record<SoundType, number>>({
    coin: 0, slide: 0, jump: 0, hit: 0, trainhorn: 0, footstep: 0,
  });
  const footLeft = useRef(true);

  const play = useCallback((type: SoundType) => {
    const now = Date.now();
    const gaps: Record<SoundType, number> = {
      coin: 120, slide: 200, jump: 300, hit: 600, trainhorn: 4000, footstep: 60,
    };
    if (now - cooldowns.current[type] < gaps[type]) return;
    cooldowns.current[type] = now;

    try {
      const ctx = getCtx();
      if (type === "coin")      playCoin(ctx);
      else if (type === "slide") playSlide(ctx);
      else if (type === "jump")  playJump(ctx);
      else if (type === "hit")   playHit(ctx);
      else if (type === "trainhorn") playTrainHorn(ctx);
      else if (type === "footstep") {
        playFootstep(ctx, footLeft.current);
        footLeft.current = !footLeft.current;
      }
    } catch (_) {}
  }, []);

  return { play };
}
