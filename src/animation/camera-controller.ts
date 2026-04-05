import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import {
  ArrowLayout,
  CameraPose,
  SceneLayout,
  SystemLayout,
  SystemConnectionLayout,
} from '../types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  computeOverviewPose(layout: SceneLayout): CameraPose {
    const { bounds } = layout;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect;

    // Distance needed to fit height
    const distH = (height / 2) / Math.tan(fov / 2);
    // Distance needed to fit width
    const distW = (width / 2) / Math.tan((fov * aspect) / 2);
    const dist = Math.max(distH, distW) * 1.3; // 30% padding

    return {
      position: new THREE.Vector3(bounds.center.x, bounds.center.y, dist),
      target: bounds.center.clone(),
    };
  }

  computeMessagePose(arrow: ArrowLayout, layout: SceneLayout): CameraPose {
    const { startPoint, endPoint } = arrow;
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = startPoint.y;

    // Frame just the two participants involved
    const spanX = Math.abs(endPoint.x - startPoint.x) + 4;
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect;
    const distW = (spanX / 2) / Math.tan((fov * aspect) / 2);
    const dist = Math.max(distW, 6) * 1.2;

    // Keep Y slightly above the arrow for context
    const overviewPose = this.computeOverviewPose(layout);
    const targetY = midY + 1.5;
    // Blend between overview Y and message Y to avoid jerky vertical jumps
    const blendedY = targetY * 0.7 + overviewPose.target.y * 0.3;

    return {
      position: new THREE.Vector3(midX, blendedY, dist),
      target: new THREE.Vector3(midX, midY, 0),
    };
  }

  tweenTo(pose: CameraPose, duration: number): gsap.core.Tween {
    const tl = gsap.timeline();

    tl.to(
      this.camera.position,
      {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    tl.to(
      this.controls.target,
      {
        x: pose.target.x,
        y: pose.target.y,
        z: pose.target.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.controls.update();
        },
      },
      0
    );

    return tl as unknown as gsap.core.Tween;
  }

  // ── System Diagram Camera ──

  computeSystemOverviewPose(layout: SystemLayout): CameraPose {
    const { bounds } = layout;
    const spanX = bounds.max.x - bounds.min.x;
    const spanZ = bounds.max.z - bounds.min.z;
    const span = Math.max(spanX, spanZ);

    const fov = this.camera.fov * (Math.PI / 180);
    const dist = (span / 2) / Math.tan(fov / 2) * 1.3;

    // Elevated angle: camera above and slightly in front
    const cx = bounds.center.x;
    const cz = bounds.center.z;
    return {
      position: new THREE.Vector3(cx, dist * 0.7, cz + dist * 0.7),
      target: new THREE.Vector3(cx, 0, cz),
    };
  }

  computeConnectionPose(
    conn: SystemConnectionLayout,
    layout: SystemLayout
  ): CameraPose {
    const fromPos = conn.fromNode.position;
    const toPos = conn.toNode.position;

    const midX = (fromPos.x + toPos.x) / 2;
    const midZ = (fromPos.z + toPos.z) / 2;

    // Frame the two nodes with padding
    const dx = Math.abs(fromPos.x - toPos.x) + 6;
    const dz = Math.abs(fromPos.z - toPos.z) + 6;
    const span = Math.max(dx, dz);

    const fov = this.camera.fov * (Math.PI / 180);
    const dist = Math.max((span / 2) / Math.tan(fov / 2) * 1.1, 8);

    // Blend between connection-specific view and overview to keep orientation
    const overview = this.computeSystemOverviewPose(layout);
    const blendedX = midX * 0.7 + overview.target.x * 0.3;
    const blendedZ = midZ * 0.7 + overview.target.z * 0.3;

    return {
      position: new THREE.Vector3(blendedX, dist * 0.6, blendedZ + dist * 0.65),
      target: new THREE.Vector3(midX, 0, midZ),
    };
  }

  setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }
}
