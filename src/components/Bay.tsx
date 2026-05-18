interface Props {
  running: boolean;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
  cameraReady: boolean;
}

function formatTime(ms: number): { mmss: string; deci: string } {
  const totalDeci = Math.max(0, Math.floor(ms / 100));
  const mm = Math.floor(totalDeci / 600);
  const ss = Math.floor((totalDeci / 10) % 60);
  const d = totalDeci % 10;
  return {
    mmss: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
    deci: `.${d}`,
  };
}

export function Bay({ running, elapsedMs, onStart, onStop, cameraReady }: Props) {
  const { mmss, deci } = formatTime(elapsedMs);

  return (
    <footer className="bay">
      <div className="bay-left">
        <div className="session-indicator">
          <div className={`brand-dot ${running ? 'pulsing' : ''}`} aria-hidden="true" />
          <div className={`session-chip ${running ? 'session-running' : ''}`}>
            {running ? 'session · running' : 'session · idle'}
          </div>
        </div>
        <div className="timer">
          <span className="timer-main">{mmss}</span>
          <span className="timer-deci">{deci}</span>
        </div>
        <div className="bay-buttons">
          <button
            type="button"
            className="pill pill-cream"
            onClick={onStart}
            disabled={!cameraReady || running}
          >
            <span className="pill-dot" />
            <span>Start</span>
          </button>
          <button
            type="button"
            className="pill pill-dark"
            onClick={onStop}
            disabled={!running}
          >
            <span className="pill-dot dim" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      <div className="bay-right">
        <div className={`breathing ${running ? 'active' : ''}`} aria-hidden="true" />
        <div className="breathing-text">
          {running ? 'Breathe with the ring · 4s in · 4s out' : 'Posture review appears after you stop'}
        </div>
      </div>
    </footer>
  );
}
