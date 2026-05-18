import { useEffect, useMemo, useState } from 'react';
import { getPromptsForIntention } from '../lib/intentions';

const ROTATE_MS = 15000;
const FADE_MS = 500;

interface Props {
  running: boolean;
  override?: string | null;
  intention?: string | null;
}

export function Prompt({ running, override, intention }: Props) {
  const PROMPTS = useMemo(() => getPromptsForIntention(intention ?? null), [intention]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [displayText, setDisplayText] = useState(PROMPTS[0]);

  useEffect(() => {
    if (!running || override) return;
    let swapId: number | null = null;
    const id = window.setInterval(() => {
      setVisible(false);
      swapId = window.setTimeout(() => {
        setIndex((i) => (i + 1) % PROMPTS.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(id);
      if (swapId != null) window.clearTimeout(swapId);
    };
  }, [running, override]);

  useEffect(() => {
    if (!running) {
      setIndex(0);
      setVisible(true);
      setDisplayText(PROMPTS[0]);
    }
  }, [running]);

  useEffect(() => {
    const target = override ?? PROMPTS[index % PROMPTS.length];
    if (target === displayText) return;
    setVisible(false);
    const t = window.setTimeout(() => {
      setDisplayText(target);
      setVisible(true);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [override, index, displayText, PROMPTS]);

  if (!running) return null;

  return (
    <div className={`prompt-block ${override ? 'prompt-face' : ''}`} aria-live="polite">
      <div className="prompt-header">Backin' It Up</div>
      <div className={`prompt ${visible ? 'prompt-visible' : ''}`}>{displayText}</div>
    </div>
  );
}
