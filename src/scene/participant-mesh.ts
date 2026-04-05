import * as THREE from 'three';
import { ParticipantLayout, LAYOUT } from '../types';
import { createLabel } from './label-factory';

const COLORS = [0x4a9eff, 0xff6b6b, 0x51cf66, 0xffd43b, 0xcc5de8, 0x20c997];

export function createParticipantMesh(
  layout: ParticipantLayout,
  index: number
): THREE.Group {
  const group = new THREE.Group();

  const geometry = new THREE.BoxGeometry(
    LAYOUT.PARTICIPANT_BOX_WIDTH,
    LAYOUT.PARTICIPANT_BOX_HEIGHT,
    LAYOUT.PARTICIPANT_BOX_DEPTH
  );
  const material = new THREE.MeshStandardMaterial({
    color: COLORS[index % COLORS.length],
    roughness: 0.4,
    metalness: 0.2,
    emissive: COLORS[index % COLORS.length],
    emissiveIntensity: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(layout.position);
  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  });
  const edgeMesh = new THREE.LineSegments(edges, edgeMat);
  edgeMesh.position.copy(layout.position);
  group.add(edgeMesh);

  const labelPos = layout.position
    .clone()
    .add(new THREE.Vector3(0, LAYOUT.PARTICIPANT_BOX_HEIGHT / 2 + 0.4, 0));
  const label = createLabel(
    layout.participant.name,
    labelPos,
    'participant-label'
  );
  group.add(label);

  return group;
}
