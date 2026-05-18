interface Props {
  onAllow: () => void;
  requesting: boolean;
  error: string | null;
}

export function AllowCamera({ onAllow, requesting, error }: Props) {
  return (
    <div className="allow-cam">
      <div className="allow-eyebrow">POSTURE PATROL · V1</div>
      <h1 className="allow-headline">Backin' It Up.</h1>
      <p className="allow-subtitle">Get your spine in line, officer.</p>
      <p className="allow-body">On-device only · no faces · no uploads.</p>
      <button className="pill pill-cream" onClick={onAllow} disabled={requesting} type="button">
        <span className="pill-dot" />
        <span>{requesting ? 'Requesting…' : 'Allow camera'}</span>
      </button>
      {error && <div className="allow-error">{error}</div>}
    </div>
  );
}
