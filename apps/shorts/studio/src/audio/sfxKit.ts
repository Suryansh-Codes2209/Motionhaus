// Real-recording SFX kit (packages/audio-lib/src/sfxkit.mjs) as the studio
// sees it: how many takes each role has and where each file's peak sits.
// Pure functions so they can be unit-tested with plain `node --test`.
import type {LaunchConfig} from '../types';

// variants: role → number of distinct takes (pop: 3 → pop-1..pop-3 exist).
// peakMs: file name (variants and base names) → ms from file start to its peak.
export type SfxKit = {variants: Record<string, number>; peakMs: Record<string, number>};

// Whoosh peaks land this many frames after the cut (taps lead, whooshes trail).
export const WHOOSH_LAG_FRAMES = 2;

// The kit rides on the config as an optional extra (episode props set it), so
// configs written before it existed keep working.
export const kitOf = (c: LaunchConfig): SfxKit | undefined => (c as LaunchConfig & {sfxKit?: SfxKit}).sfxKit;

// whoosh-2 → whoosh, pop-3 → pop, impact → impact
export const roleOf = (name: string) => name.replace(/-\d+$/, '');

// The file for the i-th hit of a cue. No kit, no index or a single take → the
// name as written (always on disk), so a render never asks for a missing file.
export function variantFile(name: string, i: number | undefined, kit: SfxKit | undefined): string {
  if (!kit || i === undefined) return name;
  const role = roleOf(name);
  const n = kit.variants[role] ?? 0;
  if (n < 2) return name;
  return `${role}-${(((Math.round(i) % n) + n) % n) + 1}`;
}

// Start frame that puts the file's peak on eventFrame (0 offset without a kit).
export const peakStart = (eventFrame: number, file: string, kit: SfxKit | undefined, fps: number) =>
  Math.round(eventFrame - ((kit?.peakMs[file] ?? 0) * fps) / 1000);
