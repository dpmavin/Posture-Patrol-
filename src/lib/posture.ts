import type { PostureMetrics, SpineState } from './types';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

const TILT_DIVISOR = 8;
const SLOUCH_THRESHOLD = 0.35;
const HIP_VIS_MIN = 0.25;

// All component scores below are normalized 0–1 where 1 is "fully slouched."
// They are designed to work from a front-facing webcam where MediaPipe's z-axis
// is unreliable, so everything is derived from 2D x/y landmarks scaled by the
// person's own shoulder width (so distance from the camera cancels out).

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function mid(a: Landmark, b: Landmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function dist2D(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function computeMetrics(lm: Landmark[]): PostureMetrics | null {
  const ls = lm[11], rs = lm[12];
  const le = lm[7], re = lm[8];
  const lh = lm[23], rh = lm[24];
  if (!ls || !rs || !le || !re) return null;

  const upperVis =
    ((ls.visibility ?? 1) + (rs.visibility ?? 1) + (le.visibility ?? 1) + (re.visibility ?? 1)) / 4;
  if (upperVis < 0.4) return null;

  const shoulder = mid(ls, rs);
  const ear = mid(le, re);
  const shoulderWidth = dist2D(ls, rs);
  if (shoulderWidth < 0.02) return null; // person too far / not detected well

  // 1. Lateral head tilt — angle of ear-over-shoulder from vertical.
  //    -dx flips for the mirrored video so positive tilt = visual right lean.
  const dxHead = ear.x - shoulder.x;
  const dyHead = ear.y - shoulder.y; // ear is above shoulder → dy < 0
  const tilt = (Math.atan2(-dxHead, -dyHead) * 180) / Math.PI;
  const tiltScore = clamp01(Math.abs(tilt) / TILT_DIVISOR);

  // 2. Forward head posture — ear vertical distance above shoulders, scaled by
  //    shoulder width. Upright posture keeps the head up and gives a ratio
  //    around 0.85–1.4. Forward-head / chin-jut collapses this ratio.
  const earVertical = Math.abs(dyHead);
  const headHeightRatio = earVertical / shoulderWidth;
  const headForward = clamp01((0.5 - headHeightRatio) / 0.3);

  // 3 & 4 depend on hip landmarks being visible. From front-facing seated views
  // this is usually true; if hips are out of frame these scores stay at 0 and
  // we fall back to head-only detection.
  let shoulderNarrow = 0;
  let torsoSlump = 0;
  let bodyCompress = 0;
  if (lh && rh) {
    const hipVis = ((lh.visibility ?? 1) + (rh.visibility ?? 1)) / 2;
    if (hipVis >= HIP_VIS_MIN) {
      const hipWidth = dist2D(lh, rh);
      if (hipWidth > 0.02) {
        // 3. Rounded shoulders narrow the apparent shoulder span relative to
        //    hip span. Open chest: ratio > 1.0. Curled-in shoulders drop the
        //    ratio below 1.0.
        const widthRatio = shoulderWidth / hipWidth;
        shoulderNarrow = clamp01((1.0 - widthRatio) / 0.4);

        // 4. Torso slump — vertical shoulder→hip distance divided by hip
        //    width. Upright torso reads roughly 1.3× hip width tall.
        //    Slouching collapses this ratio.
        const hip = mid(lh, rh);
        const torsoHeight = hip.y - shoulder.y;
        if (torsoHeight > 0) {
          const torsoRatio = torsoHeight / hipWidth;
          torsoSlump = clamp01((1.3 - torsoRatio) / 0.6);
        }

        // 5. Body compression — the full ear→hip vertical span, normalized by
        //    shoulder width (camera-distance invariant). When the user slouches
        //    forward, head drops AND torso compresses; this aggregates both.
        const fullHeight = hip.y - ear.y;
        if (fullHeight > 0) {
          const heightRatio = fullHeight / shoulderWidth;
          bodyCompress = clamp01((2.0 - heightRatio) / 0.8);
        }
      }
    }
  }

  // 6. Raw ear-Y position — direct head-drop signal. Robust to any framing,
  //    and used relative to baseline in App.tsx. y is normalized [0,1] with
  //    y=0 at the top of the image, so a higher value = head dropped.
  const earY = ear.y;

  // 7. Raw shoulder-Y position — direct shoulder-drop signal. Slumping
  //    front-on causes shoulders to lower in the frame even when the head
  //    barely moves. Baseline-relative in App.tsx.
  const shoulderY = shoulder.y;

  const slouchScore = Math.max(
    tiltScore,
    headForward,
    shoulderNarrow,
    torsoSlump,
    bodyCompress,
  );

  return {
    tilt,
    headForward,
    shoulderNarrow,
    torsoSlump,
    bodyCompress,
    earY,
    shoulderY,
    slouchScore,
  };
}

export function smooth(prev: number, target: number, alpha = 0.08): number {
  return prev + (target - prev) * alpha;
}

export function classify(
  slouchScore: number,
  slouchElapsedSec: number,
  delaySec: number,
): SpineState {
  if (slouchScore < SLOUCH_THRESHOLD) return 'good';
  return slouchElapsedSec >= delaySec ? 'sustained' : 'slouching';
}

export const SLOUCH_TRIGGER = SLOUCH_THRESHOLD;
export const TILT_SCALE = TILT_DIVISOR;
