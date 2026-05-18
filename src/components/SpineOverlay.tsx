import type { SpineState, SpineStyle } from '../lib/types';

interface Props {
  tilt: number;
  state: SpineState;
  spineStyle: SpineStyle;
}

const N = 10;
const TOP = 12;
const BOTTOM = 92;
const LEN = BOTTOM - TOP;

function catmullRom(pts: Array<[number, number]>): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function SpineOverlay({ tilt, state, spineStyle }: Props) {
  const tiltRad = (tilt * Math.PI) / 180;
  const headDx = Math.sin(tiltRad) * LEN * 0.55;

  const points: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = TOP + LEN * t;
    const x = 50 + headDx * (1 - t);
    points.push([x, y]);
  }
  const path = catmullRom(points);

  const colorVar =
    state === 'good' ? 'var(--good)' : state === 'slouching' ? 'var(--slouch)' : 'var(--sustained)';

  const head = points[0];
  const hip = points[N - 1];

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={`spine-svg style-${spineStyle}`}>
      <line x1="50" y1={TOP - 2} x2="50" y2={BOTTOM + 2} className="spine-ref" />
      {spineStyle === 'glow' && (
        <path d={path} className="spine-glow" style={{ stroke: colorVar }} />
      )}
      {(spineStyle === 'line' || spineStyle === 'glow') && (
        <path d={path} className="spine-path" style={{ stroke: colorVar }} />
      )}
      {spineStyle === 'dots' &&
        points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="1" className="spine-dot" style={{ fill: colorVar }} />
        ))}
      <circle cx={head[0]} cy={head[1] - 2.5} r="3.2" className="spine-head" style={{ stroke: colorVar }} />
      <circle cx={hip[0]} cy={hip[1]} r="1.8" className="spine-hip" style={{ fill: colorVar }} />
    </svg>
  );
}
