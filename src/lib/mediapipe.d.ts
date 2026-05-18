import type { Pose as PoseClass, Results as PoseResults } from '@mediapipe/pose';
import type { Camera as CameraClass } from '@mediapipe/camera_utils';

export interface FaceMeshLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks?: FaceMeshLandmark[][];
}

export interface FaceMeshOptions {
  maxNumFaces?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface FaceMeshInstance {
  setOptions(options: FaceMeshOptions): void;
  onResults(cb: (results: FaceMeshResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void>;
}

interface FaceMeshCtor {
  new (config: { locateFile: (file: string) => string }): FaceMeshInstance;
}

declare global {
  interface Window {
    Pose: typeof PoseClass;
    Camera: typeof CameraClass;
    FaceMesh: FaceMeshCtor;
  }
}

export type Results = PoseResults;
export type Pose = PoseClass;
export type Camera = CameraClass;
