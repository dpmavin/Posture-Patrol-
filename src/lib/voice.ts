// Web Speech API helper for spoken posture guidance.
// Used when the user's eyes are detected as closed so they can correct
// posture without opening their eyes to read a prompt.

const MIN_SPEAK_GAP_MS = 4000;

let lastSpeakAt = 0;
let cachedVoice: SpeechSynthesisVoice | null = null;

export const GUIDANCE_GENERIC = 'Realign your spine';

// Maps a "what's slouching most" hint to a calm spoken correction.
export type GuidanceHint =
  | 'tilt'
  | 'head'
  | 'narrow'
  | 'slump'
  | 'compress'
  | 'earDrop'
  | 'shoulderDrop'
  | null;

const GUIDANCE_BY_HINT: Record<Exclude<GuidanceHint, null>, string> = {
  tilt: 'Center your head',
  head: 'Lift your chin and lengthen your neck',
  narrow: 'Roll your shoulders back',
  slump: 'Sit a little taller',
  compress: 'Lengthen through the crown',
  earDrop: 'Lift the crown of your head',
  shoulderDrop: 'Lift your shoulders up and back',
};

// Ordered priority for meditation-style female voices. The first entry that
// matches an installed voice wins; later entries are progressively more
// fallback-y.
const VOICE_PRIORITY = [
  'Google UK English Female',
  'Samantha',
  'Victoria',
  'Moira',
];

// Fallback regex for the system's best natural-sounding female English voice
// when none of the priority names are installed. Excludes Microsoft voices —
// they tend toward the robotic on most setups.
const FEMALE_FALLBACK_RE = /Female|Karen|Serena|Allison|Susan|Joanna|Tessa|Fiona/i;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  for (const name of VOICE_PRIORITY) {
    const exact = voices.find((v) => v.name === name);
    if (exact) {
      cachedVoice = exact;
      return exact;
    }
    const partial = voices.find((v) => v.name.startsWith(name));
    if (partial) {
      cachedVoice = partial;
      return partial;
    }
  }

  const fallback =
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        FEMALE_FALLBACK_RE.test(v.name) &&
        !/Microsoft/i.test(v.name),
    ) ??
    voices.find((v) => v.lang.startsWith('en') && !/Microsoft/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0];

  cachedVoice = fallback ?? null;
  return cachedVoice;
}

export function primeVoice() {
  if (!('speechSynthesis' in window)) return;
  // Touch the voice list — on some browsers (Chrome) it loads asynchronously
  // and the first getVoices() returns empty. Also re-attach a load handler.
  window.speechSynthesis.getVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null;
      pickVoice();
    };
  }
}

function speakText(text: string): void {
  if (!('speechSynthesis' in window)) {
    console.warn('[voice] speechSynthesis unavailable in this browser');
    return;
  }
  const now = performance.now();
  if (now - lastSpeakAt < MIN_SPEAK_GAP_MS) {
    console.log('[voice] speak suppressed by cooldown', {
      sinceLastMs: (now - lastSpeakAt).toFixed(0),
      minGapMs: MIN_SPEAK_GAP_MS,
    });
    return;
  }
  lastSpeakAt = now;

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.75;
  u.pitch = 0.9;
  u.volume = 1;
  const voice = pickVoice();
  if (voice) {
    u.voice = voice;
    if (voice.lang) u.lang = voice.lang;
  } else {
    console.warn('[voice] no voice selected — using browser default. Voices may not be loaded yet.');
  }

  u.onstart = () => console.log('[voice] utterance start', { text, voice: voice?.name });
  u.onend = () => console.log('[voice] utterance end');
  u.onerror = (e) => console.warn('[voice] utterance error', e);

  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  window.speechSynthesis.speak(u);
  console.log('[voice] speak() invoked', { text, voice: voice?.name ?? '(default)' });
}

export function speakGuidance(hint: GuidanceHint = null): void {
  speakText(hint ? GUIDANCE_BY_HINT[hint] : GUIDANCE_GENERIC);
}

export function speak(text: string): void {
  speakText(text);
}

export function stopSpeaking(): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
