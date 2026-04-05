import gsap from 'gsap';
import { ArrowObject, SceneLayout } from '../types';
import { CameraController } from './camera-controller';
import { createArrowTween } from './arrow-animator';

export function buildTimeline(
  layout: SceneLayout,
  arrowObjects: ArrowObject[],
  cameraController: CameraController
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });

  // Start with overview
  const overviewPose = cameraController.computeOverviewPose(layout);
  tl.add(cameraController.tweenTo(overviewPose, 1.2));
  tl.add('start', '+=0.3');

  arrowObjects.forEach((arrow, i) => {
    const label = `msg-${i}`;

    // Camera moves to frame this message (starts slightly before arrow)
    const messagePose = cameraController.computeMessagePose(arrow.layout, layout);
    tl.add(cameraController.tweenTo(messagePose, 0.6), `${label}-cam`);

    // Arrow grows (overlaps with camera movement end)
    const arrowTween = createArrowTween(arrow, 0.8);
    tl.add(arrowTween, `${label}-cam+=0.3`);

    // Brief pause before next message
    tl.add(`${label}-done`, '+=0.4');
  });

  // Return to overview at the end
  tl.add(cameraController.tweenTo(overviewPose, 1.0), '+=0.5');

  return tl;
}
