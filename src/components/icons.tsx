interface IconProps {
  size?: number;
  className?: string;
}

export function CameraIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

export function CameraOffIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

interface FaceIconProps extends IconProps {
  tension?: number;
}

export function FaceIcon({ size = 22, className, tension = 0 }: FaceIconProps) {
  const t = Math.max(0, Math.min(1, tension));
  // Mouth: relaxed gentle curve when calm → flat tight line when tense.
  const mouthSagY = 15 + 1.5 * (1 - t);
  const mouthQy = 16.5 - 2.5 * (1 - t); // less curve as tension rises
  // Brows: raised arcs when calm → pinched, lower, closer together when tense.
  const browLeftStart = `M ${6 + t * 0.6} ${9 - (1 - t) * 0.4}`;
  const browLeftEnd = `${10 - t * 0.4} ${8.5 - (1 - t) * 0.8}`;
  const browRightStart = `M ${14 + t * 0.4} ${8.5 - (1 - t) * 0.8}`;
  const browRightEnd = `${18 - t * 0.6} ${9 - (1 - t) * 0.4}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d={`${browLeftStart} L ${browLeftEnd}`} />
      <path d={`${browRightStart} L ${browRightEnd}`} />
      <circle cx="9" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <path d={`M 8.5 ${mouthSagY} Q 12 ${mouthQy} 15.5 ${mouthSagY}`} />
    </svg>
  );
}

export function XIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function MaximizeIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
