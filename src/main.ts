import * as THREE from 'three';
import gsap from 'gsap';
import { parse } from './parser/plantuml-parser';
import { computeLayout } from './layout/layout-engine';
import { computeSystemLayout } from './layout/system-layout-engine';
import { SceneManager } from './scene/scene-manager';
import { createParticipantMesh } from './scene/participant-mesh';
import { createLifeline } from './scene/lifeline-mesh';
import { createArrow } from './scene/arrow-mesh';
import { createNodeMesh } from './scene/node-mesh';
import { createConnection } from './scene/connection-mesh';
import { CameraController } from './animation/camera-controller';
import { buildTimeline } from './animation/timeline-sequencer';
import { buildSystemTimeline } from './animation/system-timeline-sequencer';
import { EditorPanel } from './ui/editor-panel';
import { ArrowObject, ConnectionObject, DiagramMode } from './types';

const app = document.getElementById('app')!;
const sceneManager = new SceneManager(app);
const cameraController = new CameraController(
  sceneManager.camera,
  sceneManager.controls
);

let currentTimeline: gsap.core.Timeline | null = null;
let currentMode: DiagramMode = 'sequence';

function play(input: string): void {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }

  sceneManager.clearDiagram();
  const group = sceneManager.getDiagramGroup();

  const diagram = parse(input);
  if (diagram.participants.length === 0) return;

  if (currentMode === 'system') {
    playSystem(input, diagram, group);
  } else {
    playSequence(input, diagram, group);
  }
}

function playSequence(
  _input: string,
  diagram: ReturnType<typeof parse>,
  group: THREE.Group
): void {
  const layout = computeLayout(diagram);

  layout.participants.forEach((pl, i) => {
    group.add(createParticipantMesh(pl, i));
    group.add(createLifeline(pl));
  });

  const arrowObjects: ArrowObject[] = layout.arrows.map((al) => {
    const arrow = createArrow(al);
    group.add(arrow.group);
    return arrow;
  });

  cameraController.setEnabled(false);

  currentTimeline = buildTimeline(layout, arrowObjects, cameraController);
  currentTimeline.eventCallback('onComplete', () => {
    cameraController.setEnabled(true);
  });
  currentTimeline.play();
}

function playSystem(
  _input: string,
  diagram: ReturnType<typeof parse>,
  group: THREE.Group
): void {
  const layout = computeSystemLayout(diagram);

  // All nodes visible from the start
  layout.nodes.forEach((node) => {
    group.add(createNodeMesh(node));
  });

  const connectionObjects: ConnectionObject[] = layout.connections.map((cl) => {
    const conn = createConnection(cl);
    group.add(conn.group);
    return conn;
  });

  cameraController.setEnabled(false);

  currentTimeline = buildSystemTimeline(
    layout,
    connectionObjects,
    cameraController
  );
  currentTimeline.eventCallback('onComplete', () => {
    cameraController.setEnabled(true);
  });
  currentTimeline.play();
}

function pause(): void {
  currentTimeline?.pause();
}

function resume(): void {
  currentTimeline?.resume();
}

function setSpeed(speed: number): void {
  currentTimeline?.timeScale(speed);
}

function reset(): void {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
  sceneManager.clearDiagram();
  cameraController.setEnabled(true);

  gsap.to(sceneManager.camera.position, {
    x: 0, y: 4, z: 25,
    duration: 0.8,
    ease: 'power2.inOut',
  });
  gsap.to(sceneManager.controls.target, {
    x: 0, y: 4, z: 0,
    duration: 0.8,
    ease: 'power2.inOut',
  });
}

function onModeChange(mode: DiagramMode): void {
  currentMode = mode;
}

new EditorPanel(app, {
  onPlay: play,
  onPause: pause,
  onResume: resume,
  onReset: reset,
  onSpeedChange: setSpeed,
  onModeChange,
});
