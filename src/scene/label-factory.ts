import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createLabel(
  text: string,
  position: THREE.Vector3,
  className: string
): CSS2DObject {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;

  const label = new CSS2DObject(div);
  label.position.copy(position);
  return label;
}
