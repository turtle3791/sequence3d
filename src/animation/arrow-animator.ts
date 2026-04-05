import gsap from 'gsap';
import { ArrowObject } from '../types';

export function createArrowTween(
  arrow: ArrowObject,
  duration: number
): gsap.core.Tween {
  const proxy = { progress: 0 };
  return gsap.to(proxy, {
    progress: 1,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      arrow.animateGrow(proxy.progress);
    },
  });
}
