import { works } from '../data/works';

/**
 * Shared, mutable journey state. Written by the scroll/RAF loop in Gallery,
 * read every frame by the canvas and the overlays (no React re-renders per frame).
 */
export const journey = {
  /** Raw target from scroll, 0 … works.length - 1 */
  target: 0,
  /** Smoothed position */
  g: 0,
  reduced: false,
};

export const LAST = works.length - 1;

/** Each segment rests on a work for a moment before zooming in. */
const DWELL = 0.16;

export function segment(g: number) {
  const i = Math.min(Math.floor(g), LAST);
  const raw = i >= LAST ? 0 : g - i;
  const f = Math.min(1, Math.max(0, (raw - DWELL) / (1 - DWELL)));
  // transition into the next work during the second half of the zoom
  const s = Math.min(1, Math.max(0, (f - 0.5) / 0.5));
  const mix = s * s * (3 - 2 * s);
  return { i, f, mix, next: Math.min(i + 1, LAST) };
}
