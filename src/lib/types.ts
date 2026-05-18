export type SpineState = 'good' | 'slouching' | 'sustained';
export type CuePreset = 'bell' | 'chime' | 'drop' | 'sine';
export type DelayChoice = 10 | 30 | 60;
export type FeedbackMode = 'audio' | 'vibration';
export type SpineStyle = 'line' | 'dots' | 'glow';
export type ControlsVisibility = 'subtle' | 'visible';

export interface Settings {
  cue: CuePreset;
  delaySec: DelayChoice;
  feedback: FeedbackMode;
  spineStyle: SpineStyle;
  controls: ControlsVisibility;
}

export interface Sample {
  t: number;
  tilt: number;
  slouchScore: number;
  good: boolean;
}

export interface PostureMetrics {
  tilt: number;
  headForward: number;
  shoulderNarrow: number;
  torsoSlump: number;
  bodyCompress: number;
  earY: number;
  shoulderY: number;
  slouchScore: number;
}

export interface FaceMetrics {
  jawClench: number;
  browFurrow: number;
  tension: number;
  eyeOpenness: number;
}
