import type { Sample } from '../lib/types';

interface Props {
  samples: Sample[];
  totalMs: number;
  intention: string | null;
  corrections: number;
  onClose: () => void;
  onReturnHome: () => void;
}

function encouragement(quality: number): string {
  if (quality >= 80) return 'Great focus today.';
  if (quality >= 60) return 'Solid practice.';
  if (quality >= 40) return 'Each session builds awareness.';
  return 'Notice without judgment.';
}

function formatMinutes(totalMs: number): { value: number; label: string } {
  const totalSec = Math.round(totalMs / 1000);
  if (totalSec < 60) return { value: totalSec, label: totalSec === 1 ? 'second' : 'seconds' };
  const mins = Math.round(totalSec / 60);
  return { value: mins, label: mins === 1 ? 'minute' : 'minutes' };
}

export function SessionSummary({
  samples,
  totalMs,
  intention,
  corrections,
  onClose,
  onReturnHome,
}: Props) {
  const goodCount = samples.filter((s) => s.good).length;
  const quality = samples.length ? (goodCount / samples.length) * 100 : 0;
  const avgTilt = samples.length
    ? samples.reduce((acc, s) => acc + Math.abs(s.tilt), 0) / samples.length
    : 0;

  const mm = Math.floor(totalMs / 60000);
  const ss = Math.floor((totalMs / 1000) % 60);
  const durStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  // Time held in good posture, rounded for the human-readable summary line.
  const goodMs = samples.length ? (goodCount / samples.length) * totalMs : 0;
  const goodTime = formatMinutes(goodMs);
  const correctionWord = corrections === 1 ? 'correction' : 'corrections';

  return (
    <div className="summary-overlay" role="dialog" aria-modal="true">
      <div className="summary-card">
        <div className="summary-eyebrow">SESSION REVIEW</div>
        <h2 className="summary-title">Stillness recorded.</h2>

        {intention && (
          <div className="summary-intention">
            <div className="intention-label">You meditated with intention</div>
            <div className="intention-value">{intention}</div>
          </div>
        )}

        <div className="summary-stats">
          <Stat label="Duration" value={durStr} />
          <Stat label="Posture quality" value={`${quality.toFixed(0)}%`} />
          <Stat label="Avg tilt" value={`${avgTilt.toFixed(1)}°`} />
          <Stat label="Corrections" value={String(corrections)} />
        </div>

        <div className="quality-meter">
          <div className="quality-meter-label">
            <span>Posture quality</span>
            <span>{quality.toFixed(0)}%</span>
          </div>
          <div className="quality-meter-track">
            <div className="quality-meter-fill" style={{ width: `${quality.toFixed(0)}%` }} />
          </div>
        </div>

        <p className="summary-prose">
          You held good posture for {goodTime.value} {goodTime.label} with {corrections}{' '}
          slouch {correctionWord}. {encouragement(quality)}
        </p>

        <div className="summary-actions">
          <button type="button" className="pill pill-cream" onClick={onClose}>
            <span className="pill-dot" />
            <span>Begin again</span>
          </button>
          <button type="button" className="pill pill-dark" onClick={onReturnHome}>
            <span className="pill-dot dim" />
            <span>Close · camera off</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
