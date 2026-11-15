// Turns whatever is known about a video (metadata, description chapters,
// curated notes, an optional transcript) into structured notes. Pure: no I/O.
// Rule: a field we can't support with evidence is the string "unknown".
import {parseTimestamp} from './util.mjs';

/** @typedef {import('./types.mjs').VideoDetails} VideoDetails */
/** @typedef {import('./transcript.mjs').Transcript} Transcript */
/** @typedef {import('./sources/curated.mjs').CuratedEntry} CuratedEntry */
/** @typedef {{start: number, end: number | null, title: string}} Chapter */

export const UNKNOWN = 'unknown';

/**
 * @typedef {object} ReferenceNotes
 * @property {string} url
 * @property {string} title
 * @property {string} creator
 * @property {string} publishedAt
 * @property {number | 'unknown'} durationSec
 * @property {number | 'unknown'} viewCount
 * @property {{seconds: number, bucket: string} | 'unknown'} length
 * @property {{text: string, basis: string} | 'unknown'} hook
 * @property {Chapter[] | 'unknown'} structure
 * @property {{sections: number, medianSectionSec: number, basis: string} | {wordsPerMinute: number, basis: string} | 'unknown'} pacing
 * @property {{labels: string[], evidence: string[], basis: string} | 'unknown'} tone
 * @property {{available: boolean, reason?: string, language?: string, opening?: string}} transcript
 * @property {string[]} basedOn      which inputs were actually available
 * @property {string[]} warnings
 */

const CHAPTER_LINE = /^\s*[[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*(?:[-–—:|•]\s*)?(.+?)\s*$/;
const GENERIC_CHAPTER = /^(intro(duction)?|start|opening|beginning|overview)$/i;

/**
 * YouTube-style chapters from a description: ≥2 timestamped lines, the first at 0:00.
 * @param {string | null | undefined} description
 * @param {number | null} durationSec
 * @returns {Chapter[] | null}
 */
export function parseChapters(description, durationSec) {
  if (!description) return null;
  /** @type {{start: number, title: string}[]} */
  const found = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(CHAPTER_LINE);
    if (!m) continue;
    const start = parseTimestamp(m[1]);
    if (start === null) continue;
    if (found.length && start <= found[found.length - 1].start) continue;
    found.push({start, title: m[2]});
  }
  if (found.length < 2 || found[0].start !== 0) return null;
  return found.map((c, i) => ({start: c.start, end: found[i + 1]?.start ?? durationSec ?? null, title: c.title}));
}

/** @param {number} s */
export function lengthBucket(s) {
  if (s <= 30) return 'teaser (≤30s)';
  if (s <= 60) return 'short (31–60s)';
  if (s <= 120) return 'standard (61–120s)';
  if (s <= 300) return 'long (2–5 min)';
  return 'extended (>5 min, likely a demo or talk rather than a launch spot)';
}

/** Keyword lexicon for tone. Matching words are reported as evidence. */
export const TONE_LEXICON = /** @type {Record<string, string[]>} */ ({
  energetic: ['fast', 'faster', 'fastest', 'speed', 'instant', 'instantly', 'supercharge', 'powerful', 'blazing', 'turbo', 'hype'],
  cinematic: ['cinematic', 'film', 'trailer', 'epic', 'story', 'journey', 'manifesto'],
  minimal: ['minimal', 'simple', 'simply', 'clean', 'calm', 'focus', 'focused', 'quiet', 'effortless'],
  playful: ['fun', 'playful', 'delight', 'delightful', 'magic', 'magical', 'joy', 'quirky'],
  technical: ['api', 'sdk', 'cli', 'developer', 'developers', 'code', 'coding', 'terminal', 'deploy', 'infrastructure', 'demo', 'walkthrough', 'tutorial'],
  human: ['team', 'teams', 'founder', 'founders', 'customer', 'customers', 'people', 'community', 'together'],
  premium: ['crafted', 'craft', 'premium', 'beautiful', 'design', 'designed', 'quality', 'pro'],
  futuristic: ['ai', 'agent', 'agents', 'future', 'intelligence', 'autonomous', 'automate', 'automation'],
});

/** @param {string} text */
export function detectTone(text) {
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  /** @type {string[]} */
  const labels = [];
  /** @type {string[]} */
  const evidence = [];
  for (const [label, kws] of Object.entries(TONE_LEXICON)) {
    const hits = kws.filter((k) => words.has(k));
    if (hits.length) {
      labels.push(label);
      evidence.push(`${label}: ${hits.slice(0, 4).join(', ')}`);
    }
  }
  return {labels, evidence};
}

/**
 * @param {{url: string, details: VideoDetails | null, curated?: CuratedEntry, transcript: Transcript, warnings?: string[]}} input
 * @returns {ReferenceNotes}
 */
export function analyzeDetails({url, details, curated, transcript, warnings = []}) {
  /** @type {string[]} */
  const basedOn = [];
  if (details) basedOn.push(`metadata (${details.source})`);
  if (curated) basedOn.push('curated.yaml entry');
  if (transcript.available) basedOn.push(`transcript (${transcript.source})`);

  const durationSec = details?.durationSec ?? curated?.length ?? null;
  const chapters = parseChapters(details?.description, durationSec);
  if (chapters) basedOn.push('description chapters');

  // Hook: what the video opens with. Only from direct evidence.
  /** @type {ReferenceNotes['hook']} */
  let hook = UNKNOWN;
  if (transcript.available) {
    const opening = transcript.cues.filter((c) => c.start < 5).map((c) => c.text).join(' ').trim();
    if (opening) hook = {text: opening, basis: 'transcript, first 5 seconds'};
  }
  if (hook === UNKNOWN && chapters && !GENERIC_CHAPTER.test(chapters[0].title.trim())) {
    hook = {text: chapters[0].title, basis: 'first chapter title'};
  }
  const curatedHook = curated?.notes?.match(/hook:\s*([^\n]+)/i)?.[1];
  if (hook === UNKNOWN && curatedHook) hook = {text: curatedHook.trim(), basis: 'curated notes'};

  /** @type {ReferenceNotes['pacing']} */
  let pacing = UNKNOWN;
  const sectionLens = (chapters ?? []).flatMap((c) => (c.end !== null ? [c.end - c.start] : []));
  if (chapters && sectionLens.length) {
    // Median, not mean: one long closing chapter shouldn't hide fast cutting up front.
    const sorted = [...sectionLens].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    pacing = {sections: chapters.length, medianSectionSec: Math.round(median * 10) / 10, basis: 'description chapters'};
  } else if (transcript.available && transcript.cues.length) {
    const words = transcript.cues.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
    const span = transcript.cues[transcript.cues.length - 1].end - transcript.cues[0].start;
    if (span > 0) pacing = {wordsPerMinute: Math.round((words / span) * 60), basis: 'transcript'};
  }

  const toneText = [
    details?.title,
    details?.description,
    ...(details?.tags ?? []),
    curated?.notes,
    ...(curated?.tags ?? []),
    transcript.available ? transcript.cues.map((c) => c.text).join(' ') : '',
  ].filter(Boolean).join(' ');
  const tone = detectTone(toneText);

  return {
    url,
    title: details?.title ?? curated?.title ?? UNKNOWN,
    creator: details?.creator ?? curated?.company ?? UNKNOWN,
    publishedAt: details?.publishedAt ?? curated?.publishedAt ?? UNKNOWN,
    durationSec: durationSec ?? UNKNOWN,
    viewCount: details?.viewCount ?? UNKNOWN,
    length: durationSec ? {seconds: durationSec, bucket: lengthBucket(durationSec)} : UNKNOWN,
    hook,
    structure: chapters ?? UNKNOWN,
    pacing,
    tone: tone.labels.length ? {...tone, basis: 'keyword heuristic over title/description/tags/notes'} : UNKNOWN,
    transcript: transcript.available
      ? {available: true, language: transcript.language, opening: transcript.cues.slice(0, 3).map((c) => c.text).join(' ')}
      : {available: false, reason: transcript.reason},
    basedOn,
    warnings,
  };
}
