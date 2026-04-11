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

function playFootstep(ctx: AudioContext, leftFoot: boolean) {
  const dur = 0.09;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = leftFoot ? 280 : 320;
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

// ── Hip-hop beat ─────────────────────────────────────────────────────────
let beatSources: AudioBufferSourceNode[] = [];
let beatOscillators: OscillatorNode[]   = [];
let beatGainNode: GainNode | null       = null;

function scheduleKick(ctx: AudioContext, master: GainNode, t: number) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(master);
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.38);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  osc.start(t); osc.stop(t + 0.45);
  beatOscillators.push(osc);
}

function scheduleSnare(ctx: AudioContext, master: GainNode, t: number) {
  const sr  = ctx.sampleRate;
  const dur = 0.22;
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.28));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
  beatSources.push(src);

  const osc = ctx.createOscillator();
  const g2  = ctx.createGain();
  osc.connect(g2); g2.connect(master);
  osc.frequency.value = 200;
  g2.gain.setValueAtTime(0.25, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.start(t); osc.stop(t + 0.1);
  beatOscillators.push(osc);
}

function scheduleHiHat(ctx: AudioContext, master: GainNode, t: number, vol: number) {
  const sr  = ctx.sampleRate;
  const dur = 0.045;
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.5));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass"; f.frequency.value = 9000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
  beatSources.push(src);
}

function scheduleBass(ctx: AudioContext, master: GainNode, t: number, freq: number, dur: number) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(master);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.5, t);
  g.gain.setValueAtTime(0.5, t + dur - 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
  beatOscillators.push(osc);
}

export function startHipHopBeat() {
  stopHipHopBeat();
  try {
    const ctx    = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.72;
    master.connect(ctx.destination);
    beatGainNode = master;

    const bpm   = 92;
    const step  = 60 / bpm / 4;   // 16th-note duration
    const bars  = 5;               // schedule 5 bars (covers 8-sec dance with headroom)

    // Bass line pattern (root notes, per bar): Gm feel
    const bassLine = [98.0, 98.0, 87.3, 116.5];  // G2, G2, F2, Bb2

    for (let bar = 0; bar < bars; bar++) {
      const bOff = bar * 16 * step;

      // Bass note — one per beat
      for (let b = 0; b < 4; b++) {
        scheduleBass(ctx, master, ctx.currentTime + bOff + b * 4 * step,
          bassLine[b % bassLine.length], 4 * step - 0.04);
      }

      for (let s = 0; s < 16; s++) {
        const t = ctx.currentTime + bOff + s * step;

        // Kick: steps 0, 8   (beats 1 & 3)
        if (s === 0 || s === 8)  scheduleKick(ctx, master, t);
        // Extra soft kick pickup: step 10
        if (s === 10) scheduleKick(ctx, master, t);

        // Snare: steps 4, 12  (beats 2 & 4)
        if (s === 4 || s === 12) scheduleSnare(ctx, master, t);

        // Closed hi-hat every odd step (8th-note off-beats)
        if (s % 2 === 1) scheduleHiHat(ctx, master, t, 0.18);

        // Open hat accent on step 6 (and of beat 2) and step 14 (and of beat 4)
        if (s === 6 || s === 14) scheduleHiHat(ctx, master, t, 0.28);
      }
    }
  } catch (_) {}
}

export function stopHipHopBeat() {
  beatSources.forEach((s) => { try { s.stop(); } catch (_) {} });
  beatOscillators.forEach((o) => { try { o.stop(); } catch (_) {} });
  if (beatGainNode) {
    try { beatGainNode.gain.setValueAtTime(beatGainNode.gain.value, beatGainNode.context.currentTime);
          beatGainNode.gain.exponentialRampToValueAtTime(0.001, beatGainNode.context.currentTime + 0.2);
    } catch (_) {}
  }
  beatSources     = [];
  beatOscillators = [];
  beatGainNode    = null;
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
