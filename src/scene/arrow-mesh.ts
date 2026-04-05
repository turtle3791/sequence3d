import * as THREE from 'three';
import { ArrowLayout, ArrowObject } from '../types';
import { createLabel } from './label-factory';

export function createArrow(layout: ArrowLayout): ArrowObject {
  const group = new THREE.Group();
  group.visible = false;

  if (layout.isSelfMessage && layout.selfLoopPoints) {
    return createSelfArrow(layout, group);
  }

  return createStraightArrow(layout, group);
}

function createStraightArrow(
  layout: ArrowLayout,
  group: THREE.Group
): ArrowObject {
  const { startPoint, endPoint, message } = layout;

  // Line
  const positions = new Float32Array([
    startPoint.x, startPoint.y, startPoint.z,
    startPoint.x, startPoint.y, startPoint.z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const isDashed = message.arrowStyle === 'dashed';
  const material = isDashed
    ? new THREE.LineDashedMaterial({
        color: 0x88bbff,
        dashSize: 0.2,
        gapSize: 0.1,
        linewidth: 1,
      })
    : new THREE.LineBasicMaterial({ color: 0x88bbff, linewidth: 1 });

  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Arrowhead
  const coneGeom = new THREE.ConeGeometry(0.12, 0.3, 8);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff,
    emissive: 0x88bbff,
    emissiveIntensity: 0.3,
  });
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.position.copy(startPoint);
  cone.visible = false;

  // Orient arrowhead along arrow direction
  const dir = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  const angle = Math.atan2(dir.x, dir.y);
  cone.rotation.z = -angle;

  group.add(cone);

  // Label
  const label = createLabel(message.label, layout.midPoint, 'message-label');
  label.element.style.opacity = '0';
  group.add(label);

  const animateGrow = (progress: number): void => {
    group.visible = true;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const cx = startPoint.x + (endPoint.x - startPoint.x) * progress;
    const cy = startPoint.y + (endPoint.y - startPoint.y) * progress;
    const cz = startPoint.z + (endPoint.z - startPoint.z) * progress;

    posAttr.setXYZ(1, cx, cy, cz);
    posAttr.needsUpdate = true;

    if (isDashed) {
      line.computeLineDistances();
    }

    cone.position.set(cx, cy, cz);
    cone.visible = progress > 0.05;

    label.element.style.opacity = progress > 0.8 ? String((progress - 0.8) / 0.2) : '0';
  };

  return { group, animateGrow, layout };
}

function createSelfArrow(
  layout: ArrowLayout,
  group: THREE.Group
): ArrowObject {
  const pts = layout.selfLoopPoints!;
  const { message } = layout;

  // We'll draw 3 segments: right, down, left
  const allPoints = [pts[0], pts[1], pts[2], pts[3]];
  const totalSegments = allPoints.length - 1;
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < totalSegments; i++) {
    const len = allPoints[i].distanceTo(allPoints[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  // Single line with all points
  const positions = new Float32Array(allPoints.length * 3);
  for (let i = 0; i < allPoints.length; i++) {
    positions[i * 3] = pts[0].x;
    positions[i * 3 + 1] = pts[0].y;
    positions[i * 3 + 2] = pts[0].z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({ color: 0x88bbff });
  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Arrowhead
  const coneGeom = new THREE.ConeGeometry(0.1, 0.25, 8);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff,
    emissive: 0x88bbff,
    emissiveIntensity: 0.3,
  });
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.rotation.z = Math.PI / 2; // points left for the return leg
  cone.visible = false;
  group.add(cone);

  // Label
  const label = createLabel(message.label, layout.midPoint, 'message-label');
  label.element.style.opacity = '0';
  group.add(label);

  const animateGrow = (progress: number): void => {
    group.visible = true;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const currentLength = progress * totalLength;

    let accumulated = 0;
    for (let i = 0; i < allPoints.length; i++) {
      if (i === 0) {
        posAttr.setXYZ(0, allPoints[0].x, allPoints[0].y, allPoints[0].z);
        continue;
      }
      const segLen = segmentLengths[i - 1];
      if (accumulated + segLen <= currentLength) {
        posAttr.setXYZ(i, allPoints[i].x, allPoints[i].y, allPoints[i].z);
        accumulated += segLen;
      } else {
        const t = (currentLength - accumulated) / segLen;
        const p = new THREE.Vector3().lerpVectors(allPoints[i - 1], allPoints[i], t);
        posAttr.setXYZ(i, p.x, p.y, p.z);
        // Fill rest with same point
        for (let j = i + 1; j < allPoints.length; j++) {
          posAttr.setXYZ(j, p.x, p.y, p.z);
        }
        cone.position.copy(p);
        break;
      }
      if (i === allPoints.length - 1) {
        cone.position.copy(allPoints[i]);
      }
    }
    posAttr.needsUpdate = true;
    cone.visible = progress > 0.05;
    label.element.style.opacity = progress > 0.8 ? String((progress - 0.8) / 0.2) : '0';
  };

  return { group, animateGrow, layout };
}
