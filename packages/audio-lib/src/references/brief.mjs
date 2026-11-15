// Builds a launch-video brief from analyzed references. Pure and deterministic:
// numbers come from the references when they're known, otherwise from the
// LaunchReel defaults, and every value says which one it used.
import {detectTone, UNKNOWN} from './analyze.mjs';

/** @typedef {import('./analyze.mjs').ReferenceNotes} ReferenceNotes */

const DEFAULT_LENGTH = 30;
// LaunchReel's proven structure (see skills/launch-video/SKILL.md), as weights.
const SCENES = [
  {scene: 'hook', weight: 6, purpose: '2 short lines naming the pain or tension'},
  {scene: 'logo', weight: 5, purpose: 'the drop: brand reveal + tagline'},
  {scene: 'screenshot', weight: 8, purpose: 'hero product shot with a one-line caption'},
  {scene: 'features', weight: 9, purpose: '3 cards: verb + outcome'},
  {scene: 'screenshot', weight: 7, purpose: 'second angle (phone or scrolling page)'},
  {scene: 'cta', weight: 8, purpose: 'headline + URL + button label from the site'},
];

const MUSIC_BY_TONE = /** @type {Record<string, string[]>} */ ({
  energetic: ['upbeat electronic', 'driving beat'],
  cinematic: ['cinematic build', 'epic trailer'],
  minimal: ['minimal ambient', 'soft piano'],
  playful: ['playful', 'quirky pop'],
  technical: ['modern tech', 'lo-fi electronic'],
  human: ['warm acoustic', 'inspiring'],
  premium: ['elegant minimal', 'luxury ambient'],
  futuristic: ['futuristic synth', 'electronic pulse'],
});
const SFX_BY_TONE = /** @type {Record<string, string[]>} */ ({
  energetic: ['fast whoosh', 'impact'],
  cinematic: ['boom', 'riser', 'cinematic hit'],
  minimal: ['soft click', 'subtle swoosh'],
  playful: ['pop', 'bubble'],
  technical: ['keyboard typing', 'ui click', 'notification'],
  futuristic: ['digital glitch', 'synth riser'],
});

/** @param {number[]} xs */
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * @param {string} productDescription
 * @param {ReferenceNotes[]} refs
 */
export function buildBrief(productDescription, refs) {
  /** @type {string[]} */
  const unknowns = [];

  // Length: median of known reference lengths, clamped to what works for a launch spot.
  const lengths = refs.map((r) => (r.durationSec === UNKNOWN ? null : r.durationSec)).filter((x) => x !== null);
  /** @type {{seconds: number, basis: string}} */
  let length;
  if (lengths.length) {
    const m = median(lengths);
    const clamped = Math.max(15, Math.min(90, Math.round(m)));
    length = {
      seconds: clamped,
      basis: `median of ${lengths.length} reference length(s) = ${Math.round(m)}s${clamped !== Math.round(m) ? `, clamped to 15–90s for a launch spot` : ''}`,
    };
  } else {
    length = {seconds: DEFAULT_LENGTH, basis: 'LaunchReel default (no reference lengths known)'};
    unknowns.push('reference lengths');
  }

  // Pacing → BPM: shorter sections in the references mean a faster grid.
  const sectionLens = refs.flatMap((r) => (r.pacing !== UNKNOWN && 'medianSectionSec' in r.pacing ? [r.pacing.medianSectionSec] : []));
  /** @type {{bpm: number, avgSceneSec: number, basis: string}} */
  let pacing;
  if (sectionLens.length) {
    const avg = median(sectionLens);
    const bpm = avg < 4 ? 128 : avg <= 8 ? 120 : 100;
    pacing = {bpm, avgSceneSec: 0, basis: `reference sections run ~${avg}s (median) → ${bpm} BPM grid`};
  } else {
    pacing = {bpm: 120, avgSceneSec: 0, basis: 'LaunchReel default 120 BPM (no reference chapter timings known)'};
    unknowns.push('reference pacing');
  }

  // Scene structure scaled to the length on the beat grid (transitions overlap one beat each).
  const totalBeats = Math.round((length.seconds * pacing.bpm) / 60) + (SCENES.length - 1);
  const weightSum = SCENES.reduce((n, s) => n + s.weight, 0);
  const beatsPer = SCENES.map((s) => Math.max(4, Math.round((s.weight / weightSum) * totalBeats)));
  const spb = 60 / pacing.bpm;
  const sceneStructure = SCENES.map((s, i) => ({
    scene: s.scene,
    beats: beatsPer[i],
    seconds: Math.round(beatsPer[i] * spb * 10) / 10,
    purpose: s.purpose,
  }));
  pacing.avgSceneSec = Math.round((length.seconds / SCENES.length) * 10) / 10;

  // Hook: reference hooks as patterns (with their evidence), plus a template.
  const patterns = refs.flatMap((r) => (r.hook !== UNKNOWN ? [{from: r.title, text: r.hook.text, basis: r.hook.basis}] : []));
  if (!patterns.length) unknowns.push('reference hooks');
  const pain = productDescription.split(/[.!?\n]/)[0].trim();
  const hook = {
    suggestion: `Problem-first: name the pain "${pain}" addresses in ≤6 words, then cut to the logo on the downbeat.`,
    basis: patterns.length ? 'template, informed by the reference hooks below' : 'template (no reference hooks known)',
    referencePatterns: patterns,
  };

  // Mood: tone from references plus the product description.
  const refTones = refs.flatMap((r) => (r.tone !== UNKNOWN ? r.tone.labels : []));
  const productTone = detectTone(productDescription).labels;
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const t of [...refTones, ...productTone]) counts.set(t, (counts.get(t) ?? 0) + 1);
  const tones = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 3);
  if (!refTones.length) unknowns.push('reference tone');
  const musicMood = [...new Set(tones.flatMap((t) => MUSIC_BY_TONE[t] ?? []))].slice(0, 5);
  if (!musicMood.length) musicMood.push('upbeat electronic', 'modern tech');
  const sfx = [...new Set(['whoosh', 'riser', 'impact', ...tones.flatMap((t) => SFX_BY_TONE[t] ?? [])])].slice(0, 7);

  return {
    productDescription,
    references: refs.map((r) => ({
      url: r.url,
      title: r.title,
      durationSec: r.durationSec,
      hook: r.hook === UNKNOWN ? UNKNOWN : r.hook.text,
      sections: r.structure === UNKNOWN ? UNKNOWN : r.structure.length,
      tone: r.tone === UNKNOWN ? UNKNOWN : r.tone.labels,
    })),
    suggestedLength: length,
    hook,
    sceneStructure,
    pacing,
    tone: tones.length ? tones : UNKNOWN,
    music: {
      moodKeywords: musicMood,
      searchAudio: musicMood.slice(0, 2).map((q) => ({query: q, type: 'music', minDurationSec: length.seconds})),
    },
    sfx: {
      keywords: sfx,
      searchAudio: sfx.slice(0, 3).map((q) => ({query: q, type: 'sfx', maxDurationSec: 5})),
    },
    unknowns,
  };
}
