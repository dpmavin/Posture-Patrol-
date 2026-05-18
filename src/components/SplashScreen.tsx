import { useEffect } from 'react';

interface Props {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onDismiss]);

  return (
    <div className="splash-overlay" role="dialog" aria-modal="true">
      <div className="splash-card">
        <div className="splash-eyebrow">POSTURE PATROL</div>
        <h2 className="splash-title">Meet Your Posture Officer</h2>
        <p className="splash-body">
          Meditate with your eyes closed. We&apos;ll listen to your posture through sound. When you
          slouch, a gentle audio cue and voice guidance corrects you. No watching screens. No judgment.
          Just better posture.
        </p>
        <div className="splash-actions">
          <button type="button" className="splash-btn splash-btn-primary" onClick={onDismiss}>
            Let&apos;s Begin
          </button>
        </div>
      </div>
    </div>
  );
}
