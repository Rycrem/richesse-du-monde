// Every sound is synthesized with Web Audio: no files to load. The music is a generative jazz loop.
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

// Generative jazz trio: swung ii-V-I changes, walking bass, ride cymbal, piano comping and a vibraphone line
const QUALITY = {
  maj7: { chord: [0, 4, 7, 11], scale: [0, 2, 4, 7, 9, 11] },
  m7: { chord: [0, 3, 7, 10], scale: [0, 2, 3, 5, 7, 9, 10] },
  "7": { chord: [0, 4, 7, 10], scale: [0, 2, 4, 5, 7, 9, 10] },
  m7b5: { chord: [0, 3, 6, 10], scale: [0, 1, 3, 5, 6, 8, 10] },
};
type Chord = [root: number, quality: keyof typeof QUALITY];
const PROGRESSIONS: Chord[][] = [
  [[2, "m7"], [7, "7"], [0, "maj7"], [9, "7"]],
  [[5, "maj7"], [2, "m7"], [7, "m7"], [0, "7"]],
  [[0, "m7"], [5, "7"], [10, "maj7"], [7, "7"]],
  [[11, "m7b5"], [4, "7"], [9, "m7"], [2, "7"]],
];
const BPM = 116;
let started = false;

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const inRange = (pc: number, lo: number) => lo + ((pc - lo) % 12 + 12) % 12;

function startMusic() {
  if (started || !ctx) return;
  started = true;
  const c = ctx;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;
  filter.connect(musicBus);
  const beat = 60 / BPM;
  let barStart = c.currentTime + 0.2;
  let bar = 0;
  let prog = PROGRESSIONS[0]!;
  let note = 72;
  let phrase = 0;

  const bass = (n: number, at: number) => {
    tone(midi(n), at, beat * 0.95, { gain: 0.26, attack: 0.01, out: filter });
    tone(midi(n) * 2, at, beat * 0.3, { gain: 0.05, type: "triangle", out: filter });
  };
  const piano = (notes: number[], at: number, dur: number) => {
    for (const n of notes) {
      tone(midi(n), at, dur, { gain: 0.045, type: "triangle", out: filter });
      tone(midi(n) * 2, at, dur * 0.5, { gain: 0.012, out: filter });
    }
  };
  const vibes = (n: number, at: number, dur: number) => {
    tone(midi(n), at, dur, { gain: 0.07, attack: 0.004, out: filter });
    tone(midi(n) * 4, at, dur * 0.3, { gain: 0.008, out: filter });
  };
  const ride = (at: number, accent: boolean) => hiss(at, 0.45, { type: "highpass", freq: 6000, gain: accent ? 0.07 : 0.045, out: musicBus });

  const schedule = () => {
    while (barStart < c.currentTime + 0.6) {
      if (bar % 4 === 0 && Math.random() < 0.35) prog = pick(PROGRESSIONS);
      const [root, quality] = prog[bar % 4]!;
      const [nextRoot] = prog[(bar + 1) % 4]!;
      const q = QUALITY[quality];
      const swing = beat * 0.66;
      const at = (b: number, off = false) => barStart + b * beat + (off ? swing : 0);

      // walking bass: root, two chord or scale tones, then a half step into the next root
      const low = inRange(root, 36);
      bass(low, at(0));
      bass(low + pick([q.chord[1]!, q.chord[2]!, 12]), at(1));
      bass(low + pick([q.chord[2]!, q.chord[3]!, q.scale[1]!]), at(2));
      const target = inRange(nextRoot, 36);
      bass(target + pick([-1, 1, 7 - 12]), at(3));

      // drums: ride "ding, ding-da-ding", hi-hat foot on 2 and 4, a few brush ghost notes
      for (let b = 0; b < 4; b++) ride(at(b), b % 2 === 0);
      ride(at(1, true), false);
      ride(at(3, true), false);
      hiss(at(1), 0.05, { freq: 8000, gain: 0.06, out: musicBus });
      hiss(at(3), 0.05, { freq: 8000, gain: 0.06, out: musicBus });
      if (Math.random() < 0.5) hiss(at(pick([0, 1, 2, 3]), true), 0.08, { freq: 2200, gain: 0.04, out: filter });

      // piano: rootless voicing (3rd, 5th, 7th, 9th) on one or two syncopated spots
      const voicing = [q.chord[1]!, q.chord[2]!, q.chord[3]!, 14].map((iv) => inRange(root + iv, 52));
      voicing.sort((a, b) => a - b);
      const spots: [number, boolean][] = [[0, false], [1, true], [2, false], [3, true]];
      piano(voicing, at(...pick(spots)), beat * 0.7);
      if (Math.random() < 0.5) piano(voicing, at(...pick(spots)), beat * 0.4);

      // vibraphone: phrases of swung eighths through the chord scale, landing on chord tones
      if (phrase === 0 && Math.random() < 0.45) phrase = 1 + Math.floor(Math.random() * 2);
      if (phrase > 0) {
        const options = [60, 72, 84].flatMap((o) => q.scale.map((s) => o + ((root + s) % 12))).filter((n) => n >= 67 && n <= 86);
        const tones = options.filter((n) => q.chord.includes((n - root + 120) % 12));
        for (let e = 0; e < 8; e++) {
          if (Math.random() > 0.7) continue;
          const pool = e % 2 === 0 ? tones : options;
          const near = pool.filter((n) => Math.abs(n - note) <= 4 && n !== note);
          note = near.length ? pick(near) : pick(pool);
          vibes(note, at(Math.floor(e / 2), e % 2 === 1), beat * (e === 7 ? 1.2 : 0.6));
        }
        phrase--;
      }

      barStart += beat * 4;
      bar++;
    }
  };
  schedule();
  setInterval(schedule, 150);
}
