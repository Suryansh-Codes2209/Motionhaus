// Scene lengths driven by the voiceover (spec §7.2). Cuts stay on the beat
// grid, and each scene's VO is guaranteed to finish `tailSec` (a breath)
// before the next scene's VO starts, and not much more: dead air between
// lines kills retention.
//
// Why the formula holds: in the studio timeline a scene's VO starts as its
// transition begins (a J-cut: the voice leads the picture by up to a beat),
// except the first, which waits for the hook's first frames (≈0.3 beat). The
// next scene starts (beats − 1) beats later, so beats − 1 ≥ lead + vo + tail.
// The last scene runs its full length into the outro, whose voice starts
// 2 frames before the film ends, so there beats ≥ lead + vo + tail + 0.1.
//
// The leftover is the round-up to a whole beat, so bestBpm picks the tempo
// (the music bed is generated at any BPM) where the lines fit the grid best.

/** Shortest a scene may be, in beats, so its animation can play out. */
export const MIN_BEATS = /** @type {const} */ ({
  hook: 4,
  logo: 4,
  screenshot: 6,
  spotlight: 7,
  features: 7,
  stat: 4,
  quote: 5,
  cta: 6,
  type: 4,
  code: 6,
  chart: 6,
  steps: 6,
  chat: 7,
  comment: 8,
  versus: 8,
  clipping: 7,
  document: 7,
  flow: 7,
  bento: 7,
  log: 7,
  tiles: 7,
  stack: 7,
  photo: 5,
  crack: 9,
  art: 4,
  clip: 6,
});

/** Tempos bestBpm may pick: around the old fixed 120, all still upbeat. */
export const BPM_RANGE = /** @type {const} */ ([112, 132]);

/** Beats a scene's VO waits after the scene starts (the first scene only). */
const leadBeats = (/** @type {number} */ i) => (i === 0 ? 0.3 : 0);

/**
 * @template {{type: string}} S
 * @param {S[]} scenes
 * @param {(number | null | undefined)[]} voiceSec  VO length per scene (null = no VO)
 * @param {number} bpm
 * @param {{tailSec?: number}} [o]
 * @returns {(S & {beats: number})[]}
 */
export function fitBeats(scenes, voiceSec, bpm, {tailSec = 0.12} = {}) {
  const last = scenes.length - 1;
  return scenes.map((s, i) => {
    // minBeats: a scene that must run at least this long (a clip's own duration)
    const min = Math.max(/** @type {Record<string, number>} */ (MIN_BEATS)[s.type] ?? 4, /** @type {any} */ (s).minBeats ?? 0);
    const vo = voiceSec[i];
    if (!vo) return {...s, beats: min};
    const need = i === last ? Math.ceil(leadBeats(i) + ((vo + tailSec) * bpm) / 60 + 0.1) : Math.ceil(leadBeats(i) + ((vo + tailSec) * bpm) / 60) + 1;
    return {...s, beats: Math.max(min, need)};
  });
}

/**
 * Silence between the voice lines (seconds, summed) once scenes are fitted
 * at `bpm`: each line's end to the next line's start.
 * @param {{beats: number}[]} fitted @param {(number | null | undefined)[]} voiceSec @param {number} bpm
 */
export function voiceGaps(fitted, voiceSec, bpm) {
  const spb = 60 / bpm;
  const last = fitted.length - 1;
  return fitted.reduce((sum, s, i) => {
    const vo = voiceSec[i];
    if (!vo) return sum;
    return sum + (s.beats - (i === last ? 0.1 : 1) - leadBeats(i)) * spb - vo;
  }, 0);
}

/**
 * The tempo in BPM_RANGE that leaves the least silence between the lines
 * (ties go to the one nearest 120).
 * @param {{type: string}[]} scenes @param {(number | null | undefined)[]} voiceSec
 */
export function bestBpm(scenes, voiceSec) {
  let best = {bpm: 120, cost: Infinity};
  for (let bpm = BPM_RANGE[0]; bpm <= BPM_RANGE[1]; bpm++) {
    const cost = voiceGaps(fitBeats(scenes, voiceSec, bpm), voiceSec, bpm) + Math.abs(bpm - 120) * 0.002;
    if (cost < best.cost) best = {bpm, cost};
  }
  return best.bpm;
}
