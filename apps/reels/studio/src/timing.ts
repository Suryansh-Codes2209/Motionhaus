import type {Span, Zoom} from './types';

// Punch-in zoom at `frame`: hold each step, snapping to the next over `ease`
// frames (fast enough to read as a cut, soft enough not to strobe).
export function zoomAt(frame: number, zooms: Zoom[], ease = 2): number {
  if (!zooms.length) return 1;
  let i = 0;
  while (i + 1 < zooms.length && zooms[i + 1].frame <= frame) i++;
  const cur = zooms[i];
  if (i === 0 || frame >= cur.frame + ease) return cur.scale;
  const t = (frame - cur.frame) / ease;
  const k = 1 - Math.pow(1 - t, 3);
  return zooms[i - 1].scale + (cur.scale - zooms[i - 1].scale) * k;
}

export const inSpans = (frame: number, spans: Span[]) => spans.some((s) => frame >= s.from && frame < s.to);

// Fade the source audio over 2 frames at each jump cut so cuts don't click.
export function edgeGain(local: number, dur: number, edge = 2): number {
  return Math.max(0, Math.min(1, (local + 1) / edge, (dur - local) / edge));
}
