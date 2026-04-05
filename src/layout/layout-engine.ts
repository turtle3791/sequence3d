import * as THREE from 'three';
import { ParsedDiagram, ParticipantLayout, ArrowLayout, SceneLayout, LAYOUT } from '../types';

export function computeLayout(diagram: ParsedDiagram): SceneLayout {
  const { participants, messages } = diagram;
  const totalWidth = (participants.length - 1) * LAYOUT.PARTICIPANT_SPACING;
  const startX = -totalWidth / 2;

  const participantPositions = new Map<string, THREE.Vector3>();

  const lastMessageY =
    LAYOUT.PARTICIPANT_Y - LAYOUT.MESSAGE_Y_STEP * (messages.length + 1);
  const lifelineEndY = lastMessageY - LAYOUT.LIFELINE_BOTTOM_PADDING;

  const participantLayouts: ParticipantLayout[] = participants.map((p, i) => {
    const x = startX + i * LAYOUT.PARTICIPANT_SPACING;
    const position = new THREE.Vector3(x, LAYOUT.PARTICIPANT_Y, 0);
    participantPositions.set(p.alias, position);

    return {
      participant: p,
      position,
      lifelineStart: new THREE.Vector3(
        x,
        LAYOUT.PARTICIPANT_Y - LAYOUT.PARTICIPANT_BOX_HEIGHT / 2,
        0
      ),
      lifelineEnd: new THREE.Vector3(x, lifelineEndY, 0),
    };
  });

  const arrows: ArrowLayout[] = messages.map((msg, i) => {
    const fromPos = participantPositions.get(msg.from)!;
    const toPos = participantPositions.get(msg.to)!;
    const y = LAYOUT.PARTICIPANT_Y - LAYOUT.MESSAGE_Y_STEP * (i + 1);
    const z = LAYOUT.ARROW_Z_OFFSET;
    const isSelfMessage = msg.from === msg.to;

    if (isSelfMessage) {
      const loopWidth = 1.2;
      const loopHeight = 0.8;
      const x = fromPos.x;
      const selfLoopPoints = [
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + loopWidth, y, z),
        new THREE.Vector3(x + loopWidth, y - loopHeight, z),
        new THREE.Vector3(x, y - loopHeight, z),
      ];
      return {
        message: msg,
        startPoint: selfLoopPoints[0],
        endPoint: selfLoopPoints[3],
        midPoint: new THREE.Vector3(x + loopWidth / 2, y + 0.3, z),
        isSelfMessage: true,
        selfLoopPoints,
      };
    }

    const startPoint = new THREE.Vector3(fromPos.x, y, z);
    const endPoint = new THREE.Vector3(toPos.x, y, z);
    const midPoint = new THREE.Vector3(
      (fromPos.x + toPos.x) / 2,
      y + 0.3,
      z
    );

    return {
      message: msg,
      startPoint,
      endPoint,
      midPoint,
      isSelfMessage: false,
    };
  });

  const allX = participantLayouts.map((p) => p.position.x);
  const minX = Math.min(...allX) - LAYOUT.PARTICIPANT_BOX_WIDTH;
  const maxX = Math.max(...allX) + LAYOUT.PARTICIPANT_BOX_WIDTH;
  const minY = lifelineEndY;
  const maxY = LAYOUT.PARTICIPANT_Y + LAYOUT.PARTICIPANT_BOX_HEIGHT;

  return {
    participants: participantLayouts,
    arrows,
    bounds: {
      min: new THREE.Vector3(minX, minY, -1),
      max: new THREE.Vector3(maxX, maxY, 1),
      center: new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, 0),
    },
  };
}
