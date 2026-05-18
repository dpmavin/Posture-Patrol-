import type { SpineState } from './types';

export const POSTURE_COPY: Record<SpineState, { main: string; sub: string }> = {
  good: { main: 'Good posture', sub: 'Shoulders back · chin parallel · spine tall' },
  slouching: { main: 'A gentle drift', sub: 'Lengthen through the crown · shoulders down' },
  sustained: {
    main: 'Slouching detected',
    sub: 'Roll shoulders back · lift chest · align ears over shoulders',
  },
};

// Visual sub-text uses middle dots as separators; speech reads better with
// commas, which the TTS engine renders as small natural pauses.
export function postureSubForSpeech(state: SpineState): string {
  return POSTURE_COPY[state].sub.replace(/ · /g, ', ');
}
