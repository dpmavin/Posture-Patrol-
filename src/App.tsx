import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera, FaceMeshInstance, FaceMeshResults, Pose, Results } from './lib/mediapipe';

import { Stage } from './components/Stage';
import { Bay } from './components/Bay';
import { TweaksPanel } from './components/TweaksPanel';
import { SessionSummary } from './components/SessionSummary';
import { IntentionPicker } from './components/IntentionPicker';
import { SplashScreen } from './components/SplashScreen';

const SPLASH_KEY = 'posture-patrol-splash-seen';
import { SLOUCH_TRIGGER, TILT_SCALE, classify, computeMetrics, smooth } from './lib/posture';
import {
  EYE_CLOSED_THRESHOLD,
  FACE_PROMPTS,
  FACE_PROMPT_ROTATE_MS,
  FACE_TENSION_SUSTAIN_SEC,
  FACE_TENSION_THRESHOLD,
  computeFaceMetrics,
} from './lib/face';
import { playCue, primeAudio } from './lib/audio';
import { type GuidanceHint, primeVoice, speak, stopSpeaking } from './lib/voice';
import { postureSubForSpeech } from './lib/copy';
import type { PostureMetrics, Sample, Settings, SpineState } from './lib/types';

import './App.css';

const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/';
const FACE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';

const DEFAULT_SETTINGS: Settings = {
  cue: 'bell',
  delaySec: 10,
  feedback: 'audio',
  spineStyle: 'line',
  controls: 'subtle',
};

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const faceRef = useRef<FaceMeshInstance | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const tiltRef = useRef(0);
  const scoreRef = useRef(0);
  const compRef = useRef({ head: 0, narrow: 0, slump: 0, compress: 0, earY: 0, shoulderY: 0 });
  const baselineRef = useRef<{
    tilt: number;
    head: number;
    narrow: number;
    slump: number;
    compress: number;
    earY: number;
    shoulderY: number;
  } | null>(null);
  const baselineAccRef = useRef({
    count: 0,
    tilt: 0,
    head: 0,
    narrow: 0,
    slump: 0,
    compress: 0,
    earY: 0,
    shoulderY: 0,
  });
  const slouchStartRef = useRef<number | null>(null);
  const lastCueRef = useRef(0);
  const debugFrameRef = useRef(0);
  const faceTensionRef = useRef(0);
  const faceTenseStartRef = useRef<number | null>(null);
  const faceDebugFrameRef = useRef(0);
  const eyeOpennessRef = useRef(0.15);
  const eyesClosedRef = useRef(false);
  const dominantHintRef = useRef<GuidanceHint>(null);
  const cueCountRef = useRef(0);
  const poseLogFrameRef = useRef(0);
  const faceLogFrameRef = useRef(0);
  const poseSeenRef = useRef(false);
  const faceSeenRef = useRef(false);
  const sessionStartRef = useRef<number | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const runningRef = useRef(false);
  const stateRef = useRef<SpineState>('good');

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [togglingCamera, setTogglingCamera] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState(0);
  const [metrics, setMetrics] = useState<PostureMetrics | null>(null);
  const [state, setState] = useState<SpineState>('good');
  const [faceTension, setFaceTension] = useState(0);
  const [faceOverride, setFaceOverride] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [summary, setSummary] = useState<{
    samples: Sample[];
    totalMs: number;
    intention: string | null;
    corrections: number;
  } | null>(null);
  const [intention, setIntention] = useState<string | null>(null);
  const [intentionOpen, setIntentionOpen] = useState(false);
  const [splashOpen, setSplashOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !window.sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return true;
    }
  });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (sessionStartRef.current != null) {
        setElapsedMs(performance.now() - sessionStartRef.current);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) {
      setFaceOverride(null);
      return;
    }
    let idx = 0;
    const tick = () => {
      const start = faceTenseStartRef.current;
      const sustained =
        start != null && (performance.now() - start) / 1000 >= FACE_TENSION_SUSTAIN_SEC;
      if (sustained) {
        setFaceOverride((curr) => {
          if (curr === null) {
            idx = 0;
            return FACE_PROMPTS[0];
          }
          idx = (idx + 1) % FACE_PROMPTS.length;
          return FACE_PROMPTS[idx];
        });
      } else {
        setFaceOverride(null);
        idx = 0;
      }
    };
    tick();
    const id = window.setInterval(tick, FACE_PROMPT_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const handleResults = useCallback((res: Results) => {
    if (!poseSeenRef.current) {
      console.log('[pose] first results received', {
        hasLandmarks: !!res.poseLandmarks,
        landmarkCount: res.poseLandmarks?.length ?? 0,
      });
      poseSeenRef.current = true;
    }
    if (!res.poseLandmarks) {
      if (runningRef.current && poseLogFrameRef.current % 30 === 0) {
        console.warn('[pose] no landmarks this frame');
      }
      poseLogFrameRef.current++;
      return;
    }
    const m = computeMetrics(res.poseLandmarks);
    if (m == null) {
      if (runningRef.current && poseLogFrameRef.current % 30 === 0) {
        const ls = res.poseLandmarks[11];
        const rs = res.poseLandmarks[12];
        const le = res.poseLandmarks[7];
        const re = res.poseLandmarks[8];
        console.warn('[pose] computeMetrics returned null — likely low visibility', {
          leftShoulderVis: ls?.visibility?.toFixed(2),
          rightShoulderVis: rs?.visibility?.toFixed(2),
          leftEarVis: le?.visibility?.toFixed(2),
          rightEarVis: re?.visibility?.toFixed(2),
        });
      }
      poseLogFrameRef.current++;
      return;
    }

    tiltRef.current = smooth(tiltRef.current, m.tilt, 0.08);
    compRef.current.head = smooth(compRef.current.head, m.headForward, 0.18);
    compRef.current.narrow = smooth(compRef.current.narrow, m.shoulderNarrow, 0.18);
    compRef.current.slump = smooth(compRef.current.slump, m.torsoSlump, 0.18);
    compRef.current.compress = smooth(compRef.current.compress, m.bodyCompress, 0.18);
    compRef.current.earY = smooth(compRef.current.earY, m.earY, 0.18);
    compRef.current.shoulderY = smooth(compRef.current.shoulderY, m.shoulderY, 0.18);

    // Session baseline calibration: average the first ~2s of smoothed values
    // after Start, locking each user's natural "upright" pose as the reference.
    // Slouch scores then become deviations *above* baseline rather than
    // absolute readings — adapts to body proportions, camera framing, distance.
    const BASELINE_FRAMES = 50;
    if (runningRef.current && !baselineRef.current) {
      const acc = baselineAccRef.current;
      acc.count++;
      acc.tilt += Math.abs(tiltRef.current);
      acc.head += compRef.current.head;
      acc.narrow += compRef.current.narrow;
      acc.slump += compRef.current.slump;
      acc.compress += compRef.current.compress;
      acc.earY += compRef.current.earY;
      acc.shoulderY += compRef.current.shoulderY;
      if (acc.count >= BASELINE_FRAMES) {
        baselineRef.current = {
          tilt: acc.tilt / acc.count,
          head: acc.head / acc.count,
          narrow: acc.narrow / acc.count,
          slump: acc.slump / acc.count,
          compress: acc.compress / acc.count,
          earY: acc.earY / acc.count,
          shoulderY: acc.shoulderY / acc.count,
        };
      }
    }

    const tiltScore = Math.min(1, Math.abs(tiltRef.current) / TILT_SCALE);
    if (runningRef.current && baselineRef.current) {
      const b = baselineRef.current;
      const tiltDev = Math.max(
        0,
        Math.min(1, (Math.abs(tiltRef.current) - b.tilt) / TILT_SCALE),
      );
      const headDev = Math.max(0, Math.min(1, (compRef.current.head - b.head) / 0.15));
      const narrowDev = Math.max(0, Math.min(1, (compRef.current.narrow - b.narrow) / 0.15));
      const slumpDev = Math.max(0, Math.min(1, (compRef.current.slump - b.slump) / 0.15));
      const compressDev = Math.max(
        0,
        Math.min(1, (compRef.current.compress - b.compress) / 0.15),
      );
      // Raw head drop: ear.y increasing means the head dropped in the frame.
      // 0.05 normalized image height (~50px on a 1080p stream) = full score.
      const earDrop = Math.max(0, Math.min(1, (compRef.current.earY - b.earY) / 0.05));
      // Raw shoulder drop: same idea for the shoulder line — catches the
      // "whole upper body collapses" case from a front-facing angle even when
      // the head barely moves. ~40px on a 1080p stream = full score.
      const shoulderDrop = Math.max(
        0,
        Math.min(1, (compRef.current.shoulderY - b.shoulderY) / 0.04),
      );
      const devs: Array<[GuidanceHint, number]> = [
        ['tilt', tiltDev],
        ['head', headDev],
        ['narrow', narrowDev],
        ['slump', slumpDev],
        ['compress', compressDev],
        ['earDrop', earDrop],
        ['shoulderDrop', shoulderDrop],
      ];
      let maxName: GuidanceHint = null;
      let maxVal = 0;
      for (const [name, val] of devs) {
        if (val > maxVal) {
          maxVal = val;
          maxName = name;
        }
      }
      scoreRef.current = maxVal;
      dominantHintRef.current = maxName;
    } else {
      scoreRef.current = Math.max(
        tiltScore,
        compRef.current.head,
        compRef.current.narrow,
        compRef.current.slump,
        compRef.current.compress,
      );
    }
    setTilt(tiltRef.current);

    debugFrameRef.current = (debugFrameRef.current + 1) % 4;
    if (debugFrameRef.current === 0) {
      setMetrics({
        tilt: tiltRef.current,
        headForward: compRef.current.head,
        shoulderNarrow: compRef.current.narrow,
        torsoSlump: compRef.current.slump,
        bodyCompress: compRef.current.compress,
        earY: compRef.current.earY,
        shoulderY: compRef.current.shoulderY,
        slouchScore: scoreRef.current,
      });
    }

    if (runningRef.current) {
      poseLogFrameRef.current++;
      if (poseLogFrameRef.current % 30 === 0) {
        const ls = res.poseLandmarks[11];
        const rs = res.poseLandmarks[12];
        const lh = res.poseLandmarks[23];
        const rh = res.poseLandmarks[24];
        console.log('[pose]', {
          vis: {
            ls: ls?.visibility?.toFixed(2),
            rs: rs?.visibility?.toFixed(2),
            lh: lh?.visibility?.toFixed(2),
            rh: rh?.visibility?.toFixed(2),
          },
          raw: {
            tilt: m.tilt.toFixed(2),
            head: m.headForward.toFixed(2),
            narrow: m.shoulderNarrow.toFixed(2),
            slump: m.torsoSlump.toFixed(2),
            compress: m.bodyCompress.toFixed(2),
            earY: m.earY.toFixed(3),
          },
          smoothed: {
            tilt: tiltRef.current.toFixed(2),
            head: compRef.current.head.toFixed(2),
            narrow: compRef.current.narrow.toFixed(2),
            slump: compRef.current.slump.toFixed(2),
            compress: compRef.current.compress.toFixed(2),
            earY: compRef.current.earY.toFixed(3),
          },
          baseline: baselineRef.current
            ? Object.fromEntries(
                Object.entries(baselineRef.current).map(([k, v]) => [k, v.toFixed(3)]),
              )
            : 'calibrating',
          score: scoreRef.current.toFixed(2),
          state: stateRef.current,
        });
      }
    }

    const now = performance.now();
    // Hysteresis: enter slouching at score ≥ TRIGGER, but don't reset the
    // sustained-slouch timer until the score drops well below — otherwise tiny
    // dips around the threshold zero the counter and "sustained" never fires.
    const isSlouch = scoreRef.current >= SLOUCH_TRIGGER;
    const isClearlyGood = scoreRef.current < SLOUCH_TRIGGER * 0.55;
    if (isSlouch && slouchStartRef.current == null) {
      slouchStartRef.current = now;
    } else if (isClearlyGood) {
      slouchStartRef.current = null;
    }
    const slouchElapsedSec = slouchStartRef.current ? (now - slouchStartRef.current) / 1000 : 0;
    const next = classify(scoreRef.current, slouchElapsedSec, settingsRef.current.delaySec);

    const prev = stateRef.current;
    if (next !== prev) setState(next);

    if (sessionStartRef.current != null) {
      samplesRef.current.push({
        t: now - sessionStartRef.current,
        tilt: tiltRef.current,
        slouchScore: scoreRef.current,
        good: scoreRef.current < SLOUCH_TRIGGER,
      });
    }

    if (next === 'sustained' && runningRef.current && now - lastCueRef.current >= 6000) {
      lastCueRef.current = now;
      cueCountRef.current += 1;
      console.log('Slouch detected', {
        feedback: settingsRef.current.feedback,
        cue: settingsRef.current.cue,
        elapsedSec: slouchElapsedSec.toFixed(1),
        delaySec: settingsRef.current.delaySec,
        cueNumber: cueCountRef.current,
      });
      if (settingsRef.current.feedback === 'audio') {
        console.log('Audio cue playing', { preset: settingsRef.current.cue });
        playCue(settingsRef.current.cue);
      } else if (typeof navigator.vibrate === 'function') {
        navigator.vibrate([90, 60, 90]);
      } else {
        console.warn('[cue] feedback is vibration but navigator.vibrate is unavailable');
      }
      // 500 ms after the cue, read out the same correction text shown on
      // screen. Captured here (not at timeout time) so the spoken phrase
      // matches the state at the moment the cue fired.
      const phraseState = stateRef.current;
      const phrase = postureSubForSpeech(phraseState);
      window.setTimeout(() => {
        console.log('Voice guidance speaking', { state: phraseState, phrase });
        speak(phrase);
      }, 500);
    }
  }, []);

  const handleFaceResults = useCallback((res: FaceMeshResults) => {
    if (!faceSeenRef.current) {
      console.log('[face] first results received', {
        faceCount: res.multiFaceLandmarks?.length ?? 0,
      });
      faceSeenRef.current = true;
    }
    const lm = res.multiFaceLandmarks?.[0];
    if (!lm) {
      if (runningRef.current && faceLogFrameRef.current % 30 === 0) {
        console.warn('[face] no face landmarks this frame');
      }
      faceLogFrameRef.current++;
      return;
    }
    const f = computeFaceMetrics(lm);
    if (!f) {
      if (runningRef.current && faceLogFrameRef.current % 30 === 0) {
        console.warn('[face] computeFaceMetrics returned null');
      }
      faceLogFrameRef.current++;
      return;
    }

    faceTensionRef.current = smooth(faceTensionRef.current, f.tension, 0.15);
    // Heavy smoothing on eye openness so blinks don't flip the state — only a
    // sustained closure (>~0.7s) drops the smoothed value below threshold.
    eyeOpennessRef.current = smooth(eyeOpennessRef.current, f.eyeOpenness, 0.1);
    eyesClosedRef.current = eyeOpennessRef.current < EYE_CLOSED_THRESHOLD;

    const now = performance.now();
    const tense = faceTensionRef.current >= FACE_TENSION_THRESHOLD;
    if (tense) {
      if (faceTenseStartRef.current == null) faceTenseStartRef.current = now;
    } else {
      faceTenseStartRef.current = null;
    }

    faceDebugFrameRef.current = (faceDebugFrameRef.current + 1) % 6;
    if (faceDebugFrameRef.current === 0) {
      setFaceTension(faceTensionRef.current);
    }

    if (runningRef.current) {
      faceLogFrameRef.current++;
      if (faceLogFrameRef.current % 30 === 0) {
        console.log('[face]', {
          jawClench: f.jawClench.toFixed(2),
          browFurrow: f.browFurrow.toFixed(2),
          tension: f.tension.toFixed(2),
          smoothed: faceTensionRef.current.toFixed(2),
          sustainedSec: faceTenseStartRef.current
            ? ((now - faceTenseStartRef.current) / 1000).toFixed(1)
            : '-',
        });
      }
    }
  }, []);

  const allowCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setRequesting(true);
    setError(null);
    primeAudio();
    primeVoice();
    try {
      if (
        typeof window.Pose !== 'function' ||
        typeof window.Camera !== 'function' ||
        typeof window.FaceMesh !== 'function'
      ) {
        throw new Error('MediaPipe scripts failed to load');
      }
      const pose = new window.Pose({
        locateFile: (file: string) => `${POSE_CDN}${file}`,
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults(handleResults);
      poseRef.current = pose;

      const face = new window.FaceMesh({
        locateFile: (file: string) => `${FACE_CDN}${file}`,
      });
      face.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      face.onResults(handleFaceResults);
      faceRef.current = face;

      const video = videoRef.current;
      const cam = new window.Camera(video, {
        onFrame: async () => {
          if (video.readyState < 2) return;
          if (poseRef.current) await poseRef.current.send({ image: video });
          if (faceRef.current) await faceRef.current.send({ image: video });
        },
        width: 1280,
        height: 720,
      });
      await cam.start();
      cameraRef.current = cam;
      setCameraReady(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera unavailable';
      setError(msg);
    } finally {
      setRequesting(false);
    }
  }, [handleResults, handleFaceResults]);

  useEffect(() => {
    return () => {
      void cameraRef.current?.stop();
      void poseRef.current?.close();
      void faceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    // Belt-and-suspenders: the very first user gesture anywhere in the app
    // resumes the AudioContext and warms up the speech-synthesis voice list.
    // primeAudio/primeVoice are also called inside allowCamera and start, but
    // a global once-listener catches odd entry paths (e.g. dev-tool focus).
    const onFirstInteraction = () => {
      console.log('[audio] first interaction detected — priming');
      primeAudio();
      primeVoice();
    };
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, []);

  const requestStart = () => {
    setIntentionOpen(true);
  };

  const confirmIntention = (value: string) => {
    setIntention(value);
    setIntentionOpen(false);
    startSession();
  };

  const cancelIntention = () => {
    setIntentionOpen(false);
  };

  const startSession = () => {
    primeAudio();
    primeVoice();
    samplesRef.current = [];
    sessionStartRef.current = performance.now();
    lastCueRef.current = 0;
    cueCountRef.current = 0;
    slouchStartRef.current = null;
    baselineRef.current = null;
    baselineAccRef.current = { count: 0, tilt: 0, head: 0, narrow: 0, slump: 0, compress: 0, earY: 0, shoulderY: 0 };
    poseLogFrameRef.current = 0;
    faceLogFrameRef.current = 0;
    poseSeenRef.current = false;
    faceSeenRef.current = false;
    console.log('[session] start. cameraReady=', cameraReady, 'cameraOn=', cameraOn,
      'poseInited=', !!poseRef.current, 'faceInited=', !!faceRef.current);
    setElapsedMs(0);
    setRunning(true);
  };

  const returnHome = useCallback(async () => {
    stopSpeaking();
    setRunning(false);
    setSummary(null);
    setFaceOverride(null);
    setError(null);
    setTilt(0);
    setMetrics(null);
    setFaceTension(0);
    setState('good');
    setElapsedMs(0);
    setIntention(null);
    setIntentionOpen(false);

    samplesRef.current = [];
    sessionStartRef.current = null;
    slouchStartRef.current = null;
    lastCueRef.current = 0;
    tiltRef.current = 0;
    scoreRef.current = 0;
    compRef.current = { head: 0, narrow: 0, slump: 0, compress: 0, earY: 0, shoulderY: 0 };
    baselineRef.current = null;
    baselineAccRef.current = { count: 0, tilt: 0, head: 0, narrow: 0, slump: 0, compress: 0, earY: 0, shoulderY: 0 };
    faceTensionRef.current = 0;
    faceTenseStartRef.current = null;

    try {
      await cameraRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      await poseRef.current?.close();
    } catch {
      /* ignore */
    }
    try {
      await faceRef.current?.close();
    } catch {
      /* ignore */
    }
    cameraRef.current = null;
    poseRef.current = null;
    faceRef.current = null;

    setCameraReady(false);
    setCameraOn(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (summary) {
        setSummary(null);
        return;
      }
      if (cameraReady) {
        void returnHome();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [summary, cameraReady, returnHome]);

  const toggleCamera = async () => {
    if (!cameraReady || togglingCamera || !cameraRef.current) return;
    setTogglingCamera(true);
    try {
      if (cameraOn) {
        await cameraRef.current.stop();
        setCameraOn(false);
      } else {
        await cameraRef.current.start();
        setCameraOn(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera toggle failed';
      setError(msg);
    } finally {
      setTogglingCamera(false);
    }
  };

  const stopSession = () => {
    stopSpeaking();
    const totalMs =
      sessionStartRef.current != null ? performance.now() - sessionStartRef.current : 0;
    setRunning(false);
    setSummary({
      samples: samplesRef.current.slice(),
      totalMs,
      intention,
      corrections: cueCountRef.current,
    });
    sessionStartRef.current = null;
    baselineRef.current = null;
  };

  return (
    <div className={`app controls-${settings.controls}`}>
      <header className="brand-row">
        <button
          type="button"
          className="brand-name brand-name-button"
          onClick={() => void returnHome()}
          aria-label="Return to home"
          title="Return to home"
        >
          Posture Patrol
        </button>
      </header>

      <Stage
        videoRef={videoRef}
        cameraReady={cameraReady}
        cameraOn={cameraOn}
        togglingCamera={togglingCamera}
        onToggleCamera={toggleCamera}
        onExit={() => void returnHome()}
        requesting={requesting}
        error={error}
        onAllow={allowCamera}
        tilt={tilt}
        state={state}
        spineStyle={settings.spineStyle}
        running={running}
        metrics={metrics}
        showDebug={settings.controls === 'visible'}
        faceTension={faceTension}
        faceOverride={faceOverride}
        intention={intention}
      />

      <Bay
        running={running}
        elapsedMs={elapsedMs}
        onStart={requestStart}
        onStop={stopSession}
        cameraReady={cameraReady}
      />

      <TweaksPanel
        settings={settings}
        onChange={setSettings}
        onPreviewCue={(c) => {
          primeAudio();
          playCue(c);
        }}
      />

      {summary && (
        <SessionSummary
          samples={summary.samples}
          totalMs={summary.totalMs}
          intention={summary.intention}
          corrections={summary.corrections}
          onClose={() => setSummary(null)}
          onReturnHome={() => {
            void returnHome();
          }}
        />
      )}

      {intentionOpen && (
        <IntentionPicker onConfirm={confirmIntention} onCancel={cancelIntention} />
      )}

      {splashOpen && (
        <SplashScreen
          onDismiss={() => {
            try {
              window.sessionStorage.setItem(SPLASH_KEY, '1');
            } catch {
              /* private mode / disabled storage — ignore */
            }
            setSplashOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
