import { useEffect, useRef, useState } from 'react';

/** ease-out-expo — matches the balance count-up curve in docs/ui-design.md §7. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Animates a number from its previous value to `target` with requestAnimationFrame.
 * First mount counts up from 0; later changes animate old→new (never from 0 again).
 * Pass `animate=false` (e.g. Reduce Motion) to snap instantly.
 */
export function useCountUp(target: number, duration = 800, animate = true): number {
  const [display, setDisplay] = useState(animate ? 0 : target);
  const currentRef = useRef(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const from = currentRef.current;
    if (from === target) return;

    let startTs: number | null = null;
    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const progress = Math.min(1, (ts - startTs) / duration);
      const next = from + (target - from) * easeOutExpo(progress);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, animate]);

  return display;
}
