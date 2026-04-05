import * as THREE from 'three';
import { SystemConnectionLayout, ConnectionObject } from '../types';
import { createLabel } from './label-factory';

export function createConnection(
  layout: SystemConnectionLayout
): ConnectionObject {
  const group = new THREE.Group();
  group.visible = false;

  const { waypoints, message } = layout;

  // Compute segment lengths for progressive reveal
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = waypoints[i].distanceTo(waypoints[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  // Line geometry — all vertices start at first waypoint
  const positions = new Float32Array(waypoints.length * 3);
  for (let i = 0; i < waypoints.length; i++) {
    positions[i * 3] = waypoints[0].x;
    positions[i * 3 + 1] = waypoints[0].y;
    positions[i * 3 + 2] = waypoints[0].z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const isDashed = message.arrowStyle === 'dashed';
  const material = isDashed
    ? new THREE.LineDashedMaterial({
        color: 0x88bbff,
        dashSize: 0.2,
        gapSize: 0.1,
        transparent: true,
        opacity: 1,
      })
    : new THREE.LineBasicMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: 1,
      });
  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Arrowhead — small cone at the destination end
  const coneGeom = new THREE.ConeGeometry(0.12, 0.3, 8);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff,
    emissive: 0x88bbff,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 1,
  });
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.visible = false;
  group.add(cone);

  // Label at midpoint of the path
  const midIdx = Math.floor(waypoints.length / 2);
  const labelPos = waypoints[midIdx].clone().add(new THREE.Vector3(0, 0.4, 0));
  const label = createLabel(message.label, labelPos, 'message-label');
  label.element.style.opacity = '0';
  group.add(label);

  const animateGrow = (progress: number): void => {
    group.visible = true;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const currentLength = progress * totalLength;

    let accumulated = 0;
    let tipPosition = waypoints[0].clone();

    for (let i = 0; i < waypoints.length; i++) {
      if (i === 0) {
        posAttr.setXYZ(0, waypoints[0].x, waypoints[0].y, waypoints[0].z);
        continue;
      }
      const segLen = segmentLengths[i - 1];
      if (accumulated + segLen <= currentLength) {
        posAttr.setXYZ(i, waypoints[i].x, waypoints[i].y, waypoints[i].z);
        accumulated += segLen;
        tipPosition = waypoints[i].clone();
      } else {
        const t = segLen > 0 ? (currentLength - accumulated) / segLen : 0;
        const p = new THREE.Vector3().lerpVectors(
          waypoints[i - 1],
          waypoints[i],
          t
        );
        tipPosition = p.clone();
        // Fill this and remaining vertices with the interpolated point
        for (let j = i; j < waypoints.length; j++) {
          posAttr.setXYZ(j, p.x, p.y, p.z);
        }
        break;
      }
      // If we're at the last vertex and fully reached it
      if (i === waypoints.length - 1) {
        tipPosition = waypoints[i].clone();
      }
    }

    posAttr.needsUpdate = true;

    if (isDashed) {
      line.computeLineDistances();
    }

    // Orient cone along the direction of the current segment
    cone.position.copy(tipPosition);
    cone.visible = progress > 0.05;
    if (progress > 0.05) {
      // Find which segment we're currently on to orient the cone
      let acc = 0;
      for (let i = 0; i < segmentLengths.length; i++) {
        if (acc + segmentLengths[i] >= currentLength || i === segmentLengths.length - 1) {
          const dir = new THREE.Vector3()
            .subVectors(waypoints[i + 1], waypoints[i])
            .normalize();
          // Point cone along the direction
          const up = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
          cone.setRotationFromQuaternion(quat);
          break;
        }
        acc += segmentLengths[i];
      }
    }

    label.element.style.opacity =
      progress > 0.8 ? String((progress - 0.8) / 0.2) : '0';
  };

  const dissolve = (opacity: number): void => {
    material.opacity = opacity;
    coneMat.opacity = opacity;
    label.element.style.opacity = String(opacity);
    if (opacity <= 0) {
      group.visible = false;
    }
  };

  return { group, animateGrow, dissolve, layout };
}
