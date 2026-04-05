import * as THREE from 'three';

export type ParticipantType = 'participant' | 'actor' | 'database' | 'entity';
export type ArrowStyle = 'solid' | 'dashed';

export interface Participant {
  name: string;
  alias: string;
  type: ParticipantType;
  order: number;
}

export interface Message {
  from: string;
  to: string;
  label: string;
  arrowStyle: ArrowStyle;
  index: number;
}

export interface ParsedDiagram {
  participants: Participant[];
  messages: Message[];
}

export interface ParticipantLayout {
  participant: Participant;
  position: THREE.Vector3;
  lifelineStart: THREE.Vector3;
  lifelineEnd: THREE.Vector3;
}

export interface ArrowLayout {
  message: Message;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  midPoint: THREE.Vector3;
  isSelfMessage: boolean;
  selfLoopPoints?: THREE.Vector3[];
}

export interface SceneLayout {
  participants: ParticipantLayout[];
  arrows: ArrowLayout[];
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  };
}

export interface ArrowObject {
  group: THREE.Group;
  animateGrow: (progress: number) => void;
  layout: ArrowLayout;
}

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const LAYOUT = {
  PARTICIPANT_SPACING: 5.0,
  PARTICIPANT_BOX_WIDTH: 3.0,
  PARTICIPANT_BOX_HEIGHT: 1.0,
  PARTICIPANT_BOX_DEPTH: 0.4,
  MESSAGE_Y_STEP: 1.8,
  LIFELINE_BOTTOM_PADDING: 2.0,
  PARTICIPANT_Y: 8.0,
  ARROW_Z_OFFSET: 0.05,
} as const;

// ── System Diagram Types ──

export type DiagramMode = 'sequence' | 'system';

export interface SystemNodeLayout {
  participant: Participant;
  position: THREE.Vector3; // center of node on XZ plane (y = 0)
  index: number;
  /** 0–1 normalized connectivity; drives visual size */
  scale: number;
  /** Actual half-extents after scaling (for edge exit points) */
  halfWidth: number;  // along X
  halfDepth: number;  // along Z
  halfHeight: number; // along Y
}

export interface SystemConnectionLayout {
  message: Message;
  /** Ordered waypoints forming an orthogonal path (axis-aligned segments only) */
  waypoints: THREE.Vector3[];
  fromNode: SystemNodeLayout;
  toNode: SystemNodeLayout;
  isSelfConnection: boolean;
}

export interface SystemLayout {
  nodes: SystemNodeLayout[];
  connections: SystemConnectionLayout[];
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  };
}

export interface ConnectionObject {
  group: THREE.Group;
  animateGrow: (progress: number) => void;
  /** Fade out all visuals (line, arrowhead, label). Call after grow completes. */
  dissolve: (opacity: number) => void;
  layout: SystemConnectionLayout;
}

export const SYSTEM_LAYOUT = {
  NODE_MIN_SIZE: 1.4,       // width/depth for lowest-connectivity node
  NODE_MAX_SIZE: 3.0,       // width/depth for highest-connectivity node
  NODE_MIN_HEIGHT: 0.8,
  NODE_MAX_HEIGHT: 2.0,
  GRID_SPACING: 7.0,
  /** Small lateral offset between parallel connections sharing a corridor */
  CONNECTION_OFFSET_STEP: 0.25,
} as const;
