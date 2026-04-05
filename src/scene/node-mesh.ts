import * as THREE from 'three';
import { SystemNodeLayout } from '../types';
import { createLabel } from './label-factory';

const COLORS = [0x4a9eff, 0xff6b6b, 0x51cf66, 0xffd43b, 0xcc5de8, 0x20c997];

export function createNodeMesh(node: SystemNodeLayout): THREE.Group {
  const group = new THREE.Group();
  const color = COLORS[node.index % COLORS.length];

  const w = node.halfWidth * 2;
  const h = node.halfHeight * 2;
  const d = node.halfDepth * 2;

  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.25,
    emissive: color,
    emissiveIntensity: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(node.position);
  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });
  const edgeMesh = new THREE.LineSegments(edges, edgeMat);
  edgeMesh.position.copy(node.position);
  group.add(edgeMesh);

  const labelPos = node.position
    .clone()
    .add(new THREE.Vector3(0, node.halfHeight + 0.5, 0));
  const label = createLabel(
    node.participant.name,
    labelPos,
    'participant-label'
  );
  group.add(label);

  return group;
}
