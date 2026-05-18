import type { FaceMetrics } from './types';
import type { FaceMeshLandmark } from './mediapipe';

// Indices on MediaPipe FaceMesh's 468-point mesh.
const LIP_UPPER_INNER = 13;
const LIP_LOWER_INNER = 14;
const BROW_INNER_LEFT = 55;
const BROW_INNER_RIGHT = 285;
const EYE_OUTER_RIGHT = 33;
const EYE_OUTER_LEFT = 263;
const EYE_UPPER_LID_RIGHT = 160;
const EYE_UPPER_LID_LEFT = 387;

export const EYE_CLOSED_THRESHOLD = 0.06;

const JAW_RELAXED = 0.06; // mouth gap / face-width ratio above which jaw is relaxed
const JAW_CLENCHED = 0.02; // …below which it reads as clenched
const BROW_RELAXED = 0.16; // inter-brow gap / face-width ratio when relaxed
const BROW_FURROWED = 0.11; // …below which brows are pulled together

export const FACE_TENSION_THRESHOLD = 0.5;
export const FACE_TENSION_SUSTAIN_SEC = 10;
export const FACE_PROMPT_ROTATE_MS = 5000;

export const FACE_PROMPTS = [
  'Soften your face',
  'Release tension from your jaw',
  'Let your expression be at ease',
  'Relax the space between your brows',
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function dist2D(a: FaceMeshLandmark, b: FaceMeshLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function computeFaceMetrics(lm: FaceMeshLandmark[]): FaceMetrics | null {
  const lipU = lm[LIP_UPPER_INNER];
  const lipL = lm[LIP_LOWER_INNER];
  const browL = lm[BROW_INNER_LEFT];
  const browR = lm[BROW_INNER_RIGHT];
  const eyeR = lm[EYE_OUTER_RIGHT];
  const eyeL = lm[EYE_OUTER_LEFT];
  if (!lipU || !lipL || !browL || !browR || !eyeR || !eyeL) return null;

  const faceWidth = dist2D(eyeR, eyeL);
  if (faceWidth < 0.04) return null;

  // 1. Jaw clench — small inner-lip gap relative to face width = tight jaw.
  const lipGap = dist2D(lipU, lipL);
  const lipRatio = lipGap / faceWidth;
  const jawClench = clamp01((JAW_RELAXED - lipRatio) / (JAW_RELAXED - JAW_CLENCHED));

  // 2. Brow furrow — inner-brow points pulled together (small horizontal gap).
  const browGap = dist2D(browL, browR);
  const browRatio = browGap / faceWidth;
  const browFurrow = clamp01((BROW_RELAXED - browRatio) / (BROW_RELAXED - BROW_FURROWED));

  const tension = Math.max(jawClench, browFurrow);

  // Eye openness — vertical distance from upper eyelid landmark to outer
  // corner, normalized by face width. Wide-open eye reads ~0.10-0.25;
  // a fully closed eye drops below ~0.04. A short blink barely budges the
  // smoothed value in App.tsx, but sustained closure crosses the threshold.
  const lidRight = lm[EYE_UPPER_LID_RIGHT];
  const lidLeft = lm[EYE_UPPER_LID_LEFT];
  let eyeOpenness = 0;
  if (lidRight && lidLeft) {
    const rOpen = Math.abs(eyeR.y - lidRight.y) / faceWidth;
    const lOpen = Math.abs(eyeL.y - lidLeft.y) / faceWidth;
    eyeOpenness = (rOpen + lOpen) / 2;
  }

  return { jawClench, browFurrow, tension, eyeOpenness };
}
