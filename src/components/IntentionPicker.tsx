import { useEffect, useRef, useState } from 'react';
import { PRESET_INTENTIONS } from '../lib/intentions';

interface Props {
  onConfirm: (intention: string) => void;
  onCancel: () => void;
}

export function IntentionPicker({ onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<string | null>(PRESET_INTENTIONS[0].label);
  const [custom, setCustom] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const value = custom.trim() || selected || '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter' && value) {
        e.preventDefault();
        onConfirm(value);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [value, onCancel, onConfirm]);

  return (
    <div className="intention-overlay" role="dialog" aria-modal="true">
      <div className="intention-card">
        <div className="intention-eyebrow">SET YOUR INTENTION</div>
        <h2 className="intention-title">A moment of intention</h2>
        <p className="intention-sub">
          Choose a focus or set your own. Your prompts will rotate around it during the session.
        </p>

        <div className="intention-chips">
          {PRESET_INTENTIONS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`intention-chip ${selected === p.label && !custom.trim() ? 'active' : ''}`}
              onClick={() => {
                setSelected(p.label);
                setCustom('');
                inputRef.current?.blur();
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          className="intention-input"
          placeholder="Or write your own…"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            if (e.target.value.trim()) setSelected(null);
          }}
          maxLength={60}
        />

        <div className="intention-actions">
          <button
            type="button"
            className="pill pill-cream"
            onClick={() => onConfirm(value)}
            disabled={!value}
          >
            <span className="pill-dot" />
            <span>Begin</span>
          </button>
          <button type="button" className="pill pill-dark" onClick={onCancel}>
            <span className="pill-dot dim" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
