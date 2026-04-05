import gsap from 'gsap';
import { ConnectionObject, SystemLayout } from '../types';
import { CameraController } from './camera-controller';

export function buildSystemTimeline(
  layout: SystemLayout,
  connectionObjects: ConnectionObject[],
  cameraController: CameraController
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });

  // Start with an elevated overview looking down at the system
  const overviewPose = cameraController.computeSystemOverviewPose(layout);
  tl.add(cameraController.tweenTo(overviewPose, 1.2));
  tl.add('start', '+=0.5');

  connectionObjects.forEach((conn, i) => {
    const label = `conn-${i}`;

    // Camera moves to frame this connection's two nodes
    const connPose = cameraController.computeConnectionPose(
      conn.layout,
      layout
    );
    tl.add(cameraController.tweenTo(connPose, 0.7), `${label}-cam`);

    // Connection grows along its orthogonal path
    const proxy = { progress: 0 };
    const growTween = gsap.to(proxy, {
      progress: 1,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => conn.animateGrow(proxy.progress),
    });
    tl.add(growTween, `${label}-cam+=0.3`);

    // Self-connections dissolve away after fully drawn
    if (conn.layout.isSelfConnection) {
      const dissolveProxy = { opacity: 1 };
      const dissolveTween = gsap.to(dissolveProxy, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in',
        onUpdate: () => conn.dissolve(dissolveProxy.opacity),
      });
      tl.add(dissolveTween, '+=0.3');
    }

    tl.add(`${label}-done`, '+=0.35');
  });

  // Return to overview
  tl.add(cameraController.tweenTo(overviewPose, 1.0), '+=0.5');

  return tl;
}
