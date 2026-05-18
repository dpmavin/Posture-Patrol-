import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { CuePreset, Settings } from '../lib/types';
import { MaximizeIcon } from './icons';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onPreviewCue: (c: CuePreset) => void;
}

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function TweaksPanel({ settings, onChange, onPreviewCue }: Props) {
  const [open, setOpen] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);

  const setPanelRef = useCallback((el: HTMLElement | null) => {
    panelRef.current = el;
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.hypot(dx, dy) > 3) didDragRef.current = true;
      const nextX = clampNum(d.origX + dx, d.minX, d.maxX);
      const nextY = clampNum(d.origY + dy, d.minY, d.maxY);
      setPos({ x: nextX, y: nextY });
    }
    function onMouseUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    onChange({ ...settings, [k]: v });
  }

  const onDragMouseDown = (e: ReactMouseEvent<HTMLElement>) => {
    if (e.target instanceof Element && e.target.closest('.tweaks-min')) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    didDragRef.current = false;
    // Bounds derived from the current rect: the rect currently reflects
    // pos=(pos.x, pos.y). Any new pos shifts the rect by the delta. We solve
    // for the deltas that keep all four edges inside the viewport.
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      minX: pos.x - rect.left,
      maxX: pos.x + (window.innerWidth - rect.right),
      minY: pos.y - rect.top,
      maxY: pos.y + (window.innerHeight - rect.bottom),
    };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const onPillClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="tweaks-pill"
        ref={setPanelRef}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onMouseDown={onDragMouseDown}
        onClick={onPillClick}
        aria-label="Expand tweaks panel"
      >
        <span className="tweaks-pulse" aria-hidden="true" />
        <span>Tweaks</span>
        <MaximizeIcon size={11} />
      </button>
    );
  }

  return (
    <aside className="tweaks" ref={setPanelRef} style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      <div className="tweaks-head" onMouseDown={onDragMouseDown}>
        <span className="tweaks-title">Tweaks</span>
        <button type="button" className="tweaks-min" onClick={() => setOpen(false)} aria-label="Minimize">
          —
        </button>
      </div>

      <Row label="Audio cue">
        <select
          className="tweaks-select"
          value={settings.cue}
          onChange={(e) => {
            const c = e.target.value as CuePreset;
            update('cue', c);
            onPreviewCue(c);
          }}
        >
          <option value="bell">Gentle Bell</option>
          <option value="chime">Soft Chime</option>
          <option value="drop">Nature Drop</option>
          <option value="sine">Sine Tone</option>
        </select>
      </Row>

      <Row label="Cue after">
        <Seg value={10} current={settings.delaySec} onSelect={(v) => update('delaySec', v as Settings['delaySec'])}>10s</Seg>
        <Seg value={30} current={settings.delaySec} onSelect={(v) => update('delaySec', v as Settings['delaySec'])}>30s</Seg>
        <Seg value={60} current={settings.delaySec} onSelect={(v) => update('delaySec', v as Settings['delaySec'])}>1m</Seg>
      </Row>

      <Row label="Feedback">
        <Seg value="audio" current={settings.feedback} onSelect={(v) => update('feedback', v as Settings['feedback'])}>Audio</Seg>
        <Seg value="vibration" current={settings.feedback} onSelect={(v) => update('feedback', v as Settings['feedback'])}>Vibration</Seg>
      </Row>

      <Row label="Spine style">
        <Seg value="line" current={settings.spineStyle} onSelect={(v) => update('spineStyle', v as Settings['spineStyle'])}>Line</Seg>
        <Seg value="dots" current={settings.spineStyle} onSelect={(v) => update('spineStyle', v as Settings['spineStyle'])}>Dots</Seg>
        <Seg value="glow" current={settings.spineStyle} onSelect={(v) => update('spineStyle', v as Settings['spineStyle'])}>Glow</Seg>
      </Row>

      <Row label="Controls">
        <Seg value="subtle" current={settings.controls} onSelect={(v) => update('controls', v as Settings['controls'])}>Subtle</Seg>
        <Seg value="visible" current={settings.controls} onSelect={(v) => update('controls', v as Settings['controls'])}>Visible</Seg>
      </Row>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tweaks-row">
      <div className="tweaks-label">{label}</div>
      <div className="tweaks-controls">{children}</div>
    </div>
  );
}

function Seg<T extends string | number>({
  value,
  current,
  onSelect,
  children,
}: {
  value: T;
  current: T;
  onSelect: (v: T) => void;
  children: ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      className={`seg ${active ? 'seg-active' : ''}`}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}
