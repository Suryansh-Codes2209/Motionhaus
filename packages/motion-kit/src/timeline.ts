import type {LaunchConfig, Scene} from './types';

export type TimelineItem = {
  scene: Scene;
  index: number;
  from: number; // absolute start frame (transition overlap begins here)
  duration: number;
  enter: number; // local frame where the scene's content starts animating
  startBeat: number;
};

export type Timeline = {
  fpb: number; // frames per beat (may be fractional)
  T: number; // transition length in frames (one beat)
  items: TimelineItem[];
  total: number;
  hits: number[]; // absolute frames of big moments (logo reveal, stats)
};

// Every transition lasts exactly one beat and the next scene starts on a beat,
// so cuts always land on the music grid.
export const getTimeline = (c: LaunchConfig): Timeline => {
  const fpb = (c.fps * 60) / c.bpm;
  const T = Math.max(1, Math.round(fpb));
  const scenes = c.scenes.map((s) => ({...s, beats: Math.max(2, s.beats)}));

  let beat = 0;
  const startBeats = scenes.map((s) => {
    const b = beat;
    beat += s.beats - 1;
    return b;
  });
  const startFrames = startBeats.map((b) => Math.round(b * fpb));

  const items: TimelineItem[] = scenes.map((scene, index) => {
    const from = startFrames[index];
    const duration =
      index < scenes.length - 1
        ? startFrames[index + 1] - from + T
        : Math.round(scene.beats * fpb);
    // Big reveals land exactly on the downbeat after the transition (where the
    // music drops); other scenes start slightly earlier so they overlap it.
    const isHit = scene.type === 'logo' || scene.type === 'stat';
    const enter = index === 0 ? 4 : isHit ? T : Math.round(T * 0.6);
    return {scene, index, from, duration, enter, startBeat: startBeats[index]};
  });

  const last = items[items.length - 1];
  const hits = items
    .filter((i) => i.scene.type === 'logo' || i.scene.type === 'stat')
    .map((i) => i.from + i.enter);

  return {fpb, T, items, total: last.from + last.duration, hits};
};
