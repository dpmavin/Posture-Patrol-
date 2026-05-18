import type { CuePreset } from './types';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      console.log('[audio] AudioContext created. state=', ctx.state, 'sampleRate=', ctx.sampleRate);
    } catch (e) {
      console.error('[audio] AudioContext construction failed', e);
      throw e;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().then(
      () => console.log('[audio] resume() resolved. state=', ctx?.state),
      (err) => console.warn('[audio] resume() rejected', err),
    );
  }
  return ctx;
}

function envelope(g: GainNode, dur: number, peak: number, start: number) {
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
}

function playBell(c: AudioContext) {
  const now = c.currentTime;
  const partials = [880, 1320, 1760];
  const gains = [0.18, 0.10, 0.06];
  partials.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    envelope(g, 0.85, gains[i], now);
    osc.connect(g).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.9);
  });
}

function playChime(c: AudioContext) {
  const now = c.currentTime;
  const freqs = [523.25, 659.25, 784];
  freqs.forEach((f, i) => {
    const start = now + i * 0.06;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    envelope(g, 0.7, 0.14, start);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.75);
  });
}

function playDrop(c: AudioContext) {
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.5);
  envelope(g, 0.5, 0.16, now);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}

function playSine(c: AudioContext) {
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = 528;
  envelope(g, 0.4, 0.16, now);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

function doPlay(c: AudioContext, preset: CuePreset) {
  console.log('[audio] doPlay', preset, 'state=', c.state, 'time=', c.currentTime.toFixed(3));
  switch (preset) {
    case 'bell': playBell(c); break;
    case 'chime': playChime(c); break;
    case 'drop': playDrop(c); break;
    case 'sine': playSine(c); break;
  }
}

export function playCue(preset: CuePreset) {
  let c: AudioContext;
  try {
    c = getCtx();
  } catch {
    return;
  }
  // If the context was suspended (e.g., tab lost focus), resume FIRST and
  // only then schedule the oscillators — scheduling against a suspended
  // context schedules into the future but currentTime doesn't advance, so
  // nothing plays until the context resumes anyway.
  if (c.state === 'suspended') {
    c.resume().then(
      () => doPlay(c, preset),
      (err) => console.warn('[audio] resume failed before playCue', err),
    );
  } else {
    doPlay(c, preset);
  }
}

export function primeAudio() {
  try {
    const c = getCtx();
    console.log('[audio] primeAudio called. state=', c.state);
  } catch {
    /* already logged */
  }
}
