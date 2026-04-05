import * as THREE from 'three';
import { ParticipantLayout } from '../types';

export function createLifeline(layout: ParticipantLayout): THREE.Line {
  const points = [layout.lifelineStart, layout.lifelineEnd];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x4466aa,
    dashSize: 0.3,
    gapSize: 0.15,
    transparent: true,
    opacity: 0.5,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}
