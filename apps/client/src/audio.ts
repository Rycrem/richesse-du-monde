// Every sound is synthesized with Web Audio: no files to load. The music is a generative loop, jazz or lofi.
export type MusicStyle = "jazz" | "lofi";

export interface AudioSettings {
  style: MusicStyle;
  music: number;
  sfx: number;
  muted: boolean;
}

// v2: lofi became the default, earlier saved choices start over
const KEY = "stonks-audio-v2";
const DEFAULTS: AudioSettings = { style: "lofi", music: 0.5, sfx: 0.7, muted: false };

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

export type Sfx = "click" | "dice" | "card" | "coin" | "loss" | "buy" | "bid" | "win" | "bankrupt" | "cash";

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
    case "cash":
      // cash register: drawer clunk, bell, then a cascade of coins
      hiss(t, 0.08, { type: "lowpass", freq: 400, gain: 0.5 });
      tone(midi(96), t + 0.06, 0.9, { gain: 0.16 });
      tone(midi(103), t + 0.06, 0.7, { gain: 0.08 });
      for (let i = 0; i < 8; i++) tone(midi(86 + ((i * 5) % 12)), t + 0.25 + i * 0.06, 0.18, { gain: 0.1, type: "square" });
      break;
  }
}

export function steps(n: number, delay: number, every: number) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + delay;
  for (let i = 0; i < n; i++) tone(220, t + i * every, 0.08, { gain: 0.12, type: "triangle", to: 160 });
}

// Generative jazz combo: swung ii-V-I changes, walking bass, ride cymbal, piano comping, a horn section
// (trumpet, sax, trombone) and a soloist that switches between vibraphone and trumpet
let started = false;

function startMusic() {
  if (started || !ctx) return;
  started = true;
  startJazz(ctx);
  startLofi(ctx);
}

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
const JAZZ_BPM = 116;

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const inRange = (pc: number, lo: number) => lo + ((pc - lo) % 12 + 12) % 12;

function startJazz(c: AudioContext) {
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;
  filter.connect(musicBus);
  const beat = 60 / JAZZ_BPM;
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
  // brass: detuned saws through a lowpass that opens on the attack ("blat"), with a slow vibrato on long notes
  const brass = (n: number, at: number, dur: number, gain: number, bright = 2600) => {
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 2;
    f.frequency.setValueAtTime(300, at);
    f.frequency.exponentialRampToValueAtTime(bright, at + 0.05);
    f.frequency.exponentialRampToValueAtTime(bright * 0.5, at + dur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.04);
    g.gain.setValueAtTime(gain * 0.8, at + Math.max(0.05, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.08);
    f.connect(g).connect(musicBus);
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(dur > beat ? 18 : 0, at + dur);
    lfo.connect(depth);
    for (const detune of [-7, 7]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midi(n);
      o.detune.value = detune;
      depth.connect(o.detune);
      o.connect(f);
      o.start(at);
      o.stop(at + dur + 0.1);
    }
    lfo.start(at);
    lfo.stop(at + dur + 0.1);
  };
  // horn section voicing: trombone on the 3rd or 7th, sax on the 5th or 9th, trumpet on top
  const horns = (root: number, q: (typeof QUALITY)[keyof typeof QUALITY], at: number, dur: number, gain: number) => {
    const top = inRange(root + pick([q.chord[3]!, 14, q.chord[1]!]), 70);
    const mid = inRange(root + pick([q.chord[2]!, 14]), 62);
    const lowN = inRange(root + pick([q.chord[1]!, q.chord[3]!]), 50);
    brass(top, at, dur, gain, 3200);
    brass(mid, at, dur, gain * 0.8, 2200);
    brass(lowN, at, dur, gain * 0.9, 1400);
  };
  let soloist: "vibes" | "trumpet" = "vibes";
  const ride = (at: number, accent: boolean) => hiss(at, 0.45, { type: "highpass", freq: 6000, gain: accent ? 0.07 : 0.045, out: musicBus });

  const schedule = () => {
    if (settings.style !== "jazz") {
      barStart = c.currentTime + 0.1;
      return;
    }
    while (barStart < c.currentTime + 0.6) {
      if (bar % 4 === 0) {
        if (Math.random() < 0.35) prog = pick(PROGRESSIONS);
        soloist = Math.random() < 0.5 ? "vibes" : "trumpet";
      }
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

      // horns: a shout chorus of syncopated stabs on the turnaround bar, soft held pads behind the trumpet otherwise
      if (bar % 4 === 3 && Math.random() < 0.7) {
        horns(root, q, at(1, true), beat * 0.45, 0.035);
        horns(root, q, at(2, true), beat * 0.3, 0.03);
        horns(root, q, at(3), beat * 1.1, 0.04);
      } else if (soloist === "vibes" && Math.random() < 0.4) horns(root, q, at(0), beat * 3.6, 0.014);

      // soloist (vibraphone or trumpet): phrases of swung eighths through the chord scale, landing on chord tones
      if (phrase === 0 && Math.random() < 0.45) phrase = 1 + Math.floor(Math.random() * 2);
      if (phrase > 0) {
        const options = [60, 72, 84].flatMap((o) => q.scale.map((s) => o + ((root + s) % 12))).filter((n) => n >= 67 && n <= 86);
        const tones = options.filter((n) => q.chord.includes((n - root + 120) % 12));
        for (let e = 0; e < 8; e++) {
          if (Math.random() > 0.7) continue;
          const pool = e % 2 === 0 ? tones : options;
          const near = pool.filter((n) => Math.abs(n - note) <= 4 && n !== note);
          note = near.length ? pick(near) : pick(pool);
          const t = at(Math.floor(e / 2), e % 2 === 1);
          if (soloist === "vibes") vibes(note, t, beat * (e === 7 ? 1.2 : 0.6));
          else brass(note - 5, t, beat * (e === 7 ? 1.4 : 0.55), 0.05, 3000);
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

// Generative lofi: a jazzy 4-chord loop picked at random, soft drums with swing, a wandering pentatonic melody and vinyl crackle
const LOFI_PROGRESSIONS = [
  [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]],
  [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]],
  [[45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]],
];
const SCALE = [0, 2, 4, 7, 9];
const LOFI_BPM = 74;

function startLofi(c: AudioContext) {
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.connect(musicBus);
  const beat = 60 / LOFI_BPM;
  let next = c.currentTime + 0.2;
  let step = 0;
  let prog = LOFI_PROGRESSIONS[0]!;
  let note = 72;

  const schedule = () => {
    if (settings.style !== "lofi") {
      next = c.currentTime + 0.1;
      return;
    }
    while (next < c.currentTime + 0.5) {
      const bar = Math.floor(step / 8) % 4;
      const eighth = step % 8;
      const swing = eighth % 2 ? beat * 0.12 : 0;
      const at = next + swing;
      if (step % 32 === 0 && Math.random() < 0.4) prog = LOFI_PROGRESSIONS[Math.floor(Math.random() * LOFI_PROGRESSIONS.length)]!;
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
