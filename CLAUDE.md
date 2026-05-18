# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Fresh scaffold from `npm create vite@latest --template react-ts` plus posture/audio dependencies. No application code beyond the Vite starter (`src/App.tsx`, `src/main.tsx`) — no posture-detection wiring, audio cues, routing, state management, or tests yet. Treat the directory name (`meditation-posture-tracker`) as intent.

## Domain libraries

- **`@mediapipe/pose`** — pose landmark detection (33 body keypoints) from a video/camera frame. This is the older MediaPipe **Solutions** API; Google's current path is `@mediapipe/tasks-vision` (Tasks API, `PoseLandmarker`). The Solutions package still works but is no longer actively maintained — flag this trade-off if asked to upgrade.
- **`@mediapipe/camera_utils`** — `Camera` helper that pumps `<video>` frames into a Pose instance on each `requestAnimationFrame`. Pairs specifically with the Solutions API above.
- **`tone`** — Tone.js, presumed for audio meditation cues (chimes/drones triggered by posture state). Tone requires a user-gesture before `Tone.start()` will resume the `AudioContext`; any audio code must gate on a click/tap.

MediaPipe Solutions ships its WASM/asset bundle from a CDN by default. If you self-host, you'll need to set `locateFile` on the `Pose` constructor and ensure the assets are served from a path Vite can resolve (typically `public/`).

## Commands

```bash
npm install          # first-time setup
npm run dev          # Vite dev server with HMR
npm run build        # tsc -b (project references) THEN vite build — type errors fail the build
npm run lint         # ESLint over all .ts/.tsx
npm run preview      # serve the built dist/ locally
```

No test runner is configured. If you add one, wire it into `package.json` scripts and update this file.

## Stack and configuration

- **React 19 + Vite 8 + TypeScript 6**, ESM only (`"type": "module"`).
- **TS project references**: `tsconfig.json` is a solution file that references `tsconfig.app.json` (the `src/` app code) and `tsconfig.node.json` (Vite config). Edit the matching one; the root tsconfig has `"files": []` and compiles nothing itself.
- **Strict TS flags worth knowing** in `tsconfig.app.json`: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (no enums, no `namespace` with runtime emit, no parameter-property constructors — these will fail to build), and `noEmit` (Vite handles emit; `tsc` is type-check only).
- **ESLint flat config** (`eslint.config.js`) extends `js.recommended`, `typescript-eslint.recommended`, `react-hooks.recommended`, and `react-refresh/vite`. The react-refresh rule will warn if a module exports non-component values alongside components — keep component files exporting only components.
- **Vite config** is minimal (`@vitejs/plugin-react` only). No path aliases configured.
