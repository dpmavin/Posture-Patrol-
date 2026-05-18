import type { RefObject } from 'react';
import type { PostureMetrics, SpineState, SpineStyle } from '../lib/types';
import { POSTURE_COPY } from '../lib/copy';
import { SpineOverlay } from './SpineOverlay';
import { AllowCamera } from './AllowCamera';
import { Prompt } from './Prompt';
import { CameraIcon, CameraOffIcon, FaceIcon, XIcon } from './icons';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  cameraOn: boolean;
  togglingCamera: boolean;
  onToggleCamera: () => void;
  onExit: () => void;
  requesting: boolean;
  error: string | null;
  onAllow: () => void;
  tilt: number;
  state: SpineState;
  spineStyle: SpineStyle;
  running: boolean;
  metrics: PostureMetrics | null;
  showDebug: boolean;
  faceTension: number;
  faceOverride: string | null;
  intention: string | null;
}

export function Stage({
  videoRef,
  cameraReady,
  cameraOn,
  togglingCamera,
  onToggleCamera,
  onExit,
  requesting,
  error,
  onAllow,
  tilt,
  state,
  spineStyle,
  running,
  metrics,
  showDebug,
  faceTension,
  faceOverride,
  intention,
}: Props) {
  const copy = POSTURE_COPY[state];
  const sign = tilt >= 0 ? '+' : '';
  const tiltStr = `${sign}${tilt.toFixed(1)}°`;

  return (
    <main className="stage">
      <div className="frame">
        <video
          ref={videoRef}
          className={`video ${cameraOn ? '' : 'video-hidden'}`}
          autoPlay
          playsInline
          muted
        />
        <SpineOverlay tilt={tilt} state={state} spineStyle={spineStyle} />

        {cameraReady && !cameraOn && (
          <div className="camera-off-overlay">
            <CameraOffIcon size={36} />
            <div className="camera-off-text">Camera paused</div>
          </div>
        )}

        {cameraReady && !cameraOn && (
          <button
            type="button"
            className="frame-exit"
            onClick={onExit}
            aria-label="Exit to home"
            title="Exit to home"
          >
            <XIcon size={15} />
          </button>
        )}

        {cameraReady && (
          <button
            type="button"
            className={`frame-camera-toggle ${cameraOn ? '' : 'off'}`}
            onClick={onToggleCamera}
            disabled={togglingCamera}
            aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {cameraOn ? <CameraIcon size={16} /> : <CameraOffIcon size={16} />}
          </button>
        )}

        {cameraReady && cameraOn && (
          <div
            className={`face-indicator ${faceTension >= 0.5 ? 'tense' : ''}`}
            title={`Face tension ${(faceTension * 100).toFixed(0)}%`}
            aria-label={`Face tension ${(faceTension * 100).toFixed(0)} percent`}
          >
            <FaceIcon size={22} tension={faceTension} />
          </div>
        )}

        {cameraReady && cameraOn && (
          <Prompt running={running} override={faceOverride} intention={intention} />
        )}

        {cameraReady && showDebug && metrics && (
          <div className="debug-hud">
            <div>
              <span>score</span>
              <span className={metrics.slouchScore >= 0.4 ? 'hud-warn' : ''}>
                {metrics.slouchScore.toFixed(2)}
              </span>
            </div>
            <div>
              <span>tilt</span>
              <span>{metrics.tilt.toFixed(1)}°</span>
            </div>
            <div>
              <span>head</span>
              <span>{metrics.headForward.toFixed(2)}</span>
            </div>
            <div>
              <span>narrow</span>
              <span>{metrics.shoulderNarrow.toFixed(2)}</span>
            </div>
            <div>
              <span>slump</span>
              <span>{metrics.torsoSlump.toFixed(2)}</span>
            </div>
            <div>
              <span>height</span>
              <span>{metrics.bodyCompress.toFixed(2)}</span>
            </div>
            <div>
              <span>earY</span>
              <span>{metrics.earY.toFixed(3)}</span>
            </div>
            <div>
              <span>shY</span>
              <span>{metrics.shoulderY.toFixed(3)}</span>
            </div>
          </div>
        )}

        {cameraReady && (
          <>
            <div className={`tilt-readout state-${state}`}>
              <div className="tilt-label">TILT</div>
              <div className="tilt-value">{tiltStr}</div>
            </div>
            <div className={`status state-${state}`}>
              <div className="status-main">{copy.main}</div>
              <div className="status-sub">{copy.sub}</div>
            </div>
          </>
        )}

        {!cameraReady && <AllowCamera onAllow={onAllow} requesting={requesting} error={error} />}
      </div>
    </main>
  );
}
