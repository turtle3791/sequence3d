# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Vite dev server (hot reload)
npm run build    # TypeScript check + Vite production build → dist/
npm run preview  # Preview production build locally
npx tsc --noEmit # Type-check without emitting
```

No test runner or linter is configured. TypeScript strict mode is the only static analysis.

## Architecture

The app is a pipeline: **Parser → Layout → Scene → Animation**, orchestrated by `src/main.ts`.

### Pipeline stages

1. **Parser** (`src/parser/plantuml-parser.ts`) — Regex-based, line-by-line. Parses `participant`, `actor`, `database`, `entity` declarations and arrow messages (`->`, `-->`, `<-`). Auto-creates participants from messages if undeclared. Returns `ParsedDiagram` (participants + messages).

2. **Layout Engine** (`src/layout/layout-engine.ts`) — Pure function. Spaces participants along X-axis, messages descend along Y-axis. Computes lifeline endpoints and arrow start/end/mid points. Self-messages produce a 3-segment rectangular loop path. Returns `SceneLayout` with bounding box for camera framing.

3. **Scene** (`src/scene/`) — Three.js object factories. `SceneManager` runs dual renderers: `WebGLRenderer` for 3D geometry and `CSS2DRenderer` overlaid for crisp text labels (`pointer-events: none`). Each factory returns a `THREE.Group` or `THREE.Line` added to a diagram group that gets cleared on replay.

4. **Animation** (`src/animation/`) — GSAP-based. `CameraController` computes FOV-aware camera poses (overview vs per-message framing with 30% padding and Y-blending to avoid jumps). `timeline-sequencer` builds a single `gsap.timeline` that interleaves camera tweens and arrow growth tweens with slight overlap. Arrow growth works by updating `BufferGeometry` vertex positions each frame via an `animateGrow(progress: 0→1)` closure. Labels fade in at 80% progress.

### Key conventions

- All layout constants live in `LAYOUT` object in `src/types.ts` — these are the tuning knobs for spacing and sizing.
- `ArrowObject` wraps a Three.js group with an `animateGrow` closure — this is the extension point for new arrow styles.
- `main.ts` maintains a `currentTimeline` singleton that is killed and rebuilt on each Play click. OrbitControls are disabled during animation and re-enabled on completion.
- Participant colors cycle through a 6-color array in `participant-mesh.ts`.
- Self-loop arrows (`from === to`) branch into separate geometry/animation logic in `arrow-mesh.ts`.

## Deployment

Static site deployed to Vercel. `vercel.json` is configured with framework `vite`, output `dist/`.
