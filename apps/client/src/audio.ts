// Every sound is synthesized with Web Audio: no files to load. The music is a generative lofi loop.
export interface AudioSettings {
  music: number;
  sfx: number;
  muted: boolean;
}

const KEY = "stonks-audio";
const DEFAULTS: AudioSettings = { music: 0.5, sfx: 0.7, muted: false };

export function loadSettings(): AudioSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

let settings = loadSettings();
let ctx: AudioContext | null = null;
let musicBus: GainNode;
let sfxBus: GainNode;
let noise: AudioBuffer;

function init(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext();
  const master = ctx.createDynamicsCompressor();
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  apply();
  return ctx;
}

function apply() {
  if (!ctx) return;
  const t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(settings.muted ? 0 : settings.music * 0.35, t, 0.3);
  sfxBus.gain.setTargetAtTime(settings.muted ? 0 : settings.sfx * 0.6, t, 0.05);
}

export function setSettings(next: AudioSettings) {
  settings = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode: settings last for this visit only
  }
  apply();
}

// Browsers only allow sound after a user gesture
export function unlock() {
  const c = init();
  if (c.state === "suspended") void c.resume();
  startMusic();
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

function tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; out?: AudioNode; attack?: number; to?: number } = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, at);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + (opts.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(opts.out ?? sfxBus);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function hiss(at: number, dur: number, opts: { type?: BiquadFilterType; freq?: number; gain?: number; out?: AudioNode; to?: number } = {}) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.setValueAtTime(opts.freq ?? 2000, at);
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.3, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(opts.out ?? sfxBus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
}

export type Sfx = "click" | "dice" | "card" | "coin" | "loss" | "buy" | "bid" | "win" | "bankrupt";

export function play(name: Sfx) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case "click":
      tone(1200, t, 0.05, { gain: 0.08, type: "triangle" });
      break;
    case "dice":
      for (let i = 0; i < 7; i++) hiss(t + i * 0.07 + Math.random() * 0.03, 0.05, { freq: 2500 + Math.random() * 2000, gain: 0.35 });
      hiss(t + 0.62, 0.09, { freq: 1200, gain: 0.5 });
      break;
    case "card":
      hiss(t, 0.3, { freq: 600, to: 3000, gain: 0.15 });
      break;
    case "coin":
      tone(midi(88), t, 0.12, { gain: 0.18, type: "square" });
      tone(midi(93), t + 0.08, 0.35, { gain: 0.18, type: "square" });
      break;
    case "loss":
      tone(midi(64), t, 0.25, { gain: 0.2, type: "triangle" });
      tone(midi(60), t + 0.18, 0.25, { gain: 0.2, type: "triangle" });
      tone(midi(55), t + 0.36, 0.5, { gain: 0.2, type: "triangle" });
      break;
    case "buy":
      [72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.07, 0.4, { gain: 0.14, type: "triangle" }));
      break;
    case "bid":
      tone(midi(79), t, 0.15, { gain: 0.15, type: "triangle" });
      break;
    case "win":
      [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => tone(midi(n), t + i * 0.12, 0.5, { gain: 0.15, type: "square" }));
      break;
    case "bankrupt":
      tone(220, t, 1.2, { gain: 0.25, type: "sawtooth", to: 55 });
      break;
  }
}

export function steps(n: number, delay: number, every: number) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + delay;
  for (let i = 0; i < n; i++) tone(220, t + i * every, 0.08, { gain: 0.12, type: "triangle", to: 160 });
}

// Generative lofi: a jazzy 4-chord loop picked at random, soft drums with swing, a wandering pentatonic melody and vinyl crackle
const PROGRESSIONS = [
  [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]],
  [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]],
  [[45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]],
];
const SCALE = [0, 2, 4, 7, 9];
const BPM = 74;
let started = false;

function startMusic() {
  if (started || !ctx) return;
  started = true;
  const c = ctx;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.connect(musicBus);
  const beat = 60 / BPM;
  let next = c.currentTime + 0.2;
  let step = 0;
  let prog = PROGRESSIONS[0]!;
  let note = 72;

  const schedule = () => {
    while (next < c.currentTime + 0.5) {
      const bar = Math.floor(step / 8) % 4;
      const eighth = step % 8;
      const swing = eighth % 2 ? beat * 0.12 : 0;
      const at = next + swing;
      if (step % 32 === 0 && Math.random() < 0.4) prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)]!;
      const chord = prog[bar]!;
      if (eighth === 0) {
        for (const n of chord) tone(midi(n), at, beat * 4, { gain: 0.06, type: "triangle", attack: 0.08, out: filter });
        tone(midi(chord[0]! - 12), at, beat * 1.8, { gain: 0.22, out: filter });
      }
      if (eighth === 5 && Math.random() < 0.5) tone(midi(chord[0]! - 12), at, beat, { gain: 0.16, out: filter });
      // drums: kick on 1 and the "and" of 3, snare on 2 and 4, hats on every eighth
      if (eighth === 0 || (eighth === 5 && Math.random() < 0.6)) tone(110, at, 0.3, { gain: 0.5, to: 40, out: filter });
      if (eighth === 2 || eighth === 6) hiss(at, 0.18, { freq: 1800, gain: 0.18, out: filter });
      hiss(at, 0.04, { type: "highpass", freq: 7000, gain: eighth % 2 ? 0.04 : 0.07, out: musicBus });
      // melody: a step or two through the pentatonic scale, with rests
      if (Math.random() < 0.35) {
        const root = 60 + (chord[0]! % 12);
        const options = [-12, 0, 12].flatMap((o) => SCALE.map((s) => root + o + s)).filter((n) => n >= 64 && n <= 84);
        const near = options.filter((n) => Math.abs(n - note) <= 5);
        note = near[Math.floor(Math.random() * near.length)] ?? options[Math.floor(options.length / 2)]!;
        tone(midi(note), at, beat * (Math.random() < 0.3 ? 1.5 : 0.7), { gain: 0.07, out: filter });
        tone(midi(note) * 2, at, beat * 0.4, { gain: 0.015, out: filter });
      }
      if (Math.random() < 0.3) hiss(at + Math.random() * beat * 0.5, 0.01, { type: "highpass", freq: 3000, gain: 0.05, out: musicBus });
      next += beat / 2;
      step++;
    }
  };
  schedule();
  setInterval(schedule, 100);
}
