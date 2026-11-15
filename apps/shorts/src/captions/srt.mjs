// SubRip (.srt) subtitles from the episode's word timings. Long-form ships
// these instead of burned-in captions; shorts get one too, as an extra track.
//
// Caption words have punctuation stripped (scriptWords), so the spoken text
// is re-read from the script to put it back: subtitles read as sentences.

/** @typedef {{text: string, startMs: number, endMs: number}} TimedWord  ms from the start of the video */
/** @typedef {{startMs: number, endMs: number, lines: string[]}} Cue */

/**
 * The script's words as displayed in subtitles: `*` marks removed,
 * punctuation kept. Index-aligned with scriptWords() (same split, same
 * filter), so it can be zipped with the timed caption words.
 * @param {string} text
 */
export const spokenText = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => raw.replace(/\*/g, ''))
    .filter((w) => w.replace(/[.,;:…]+$/, ''));

/**
 * Absolute word timings: each clip's words, offset by where the clip starts.
 * When the clip's script text is given its punctuation is restored.
 * @param {{fromMs: number, words: {text: string, startMs: number, endMs: number}[], text?: string}[]} clips
 * @returns {TimedWord[]}
 */
export function subtitleWords(clips) {
  return clips.flatMap((c) => {
    const shown = c.text ? spokenText(c.text) : [];
    const exact = shown.length === c.words.length;
    return c.words.map((w, i) => ({text: exact ? shown[i] : w.text, startMs: c.fromMs + w.startMs, endMs: c.fromMs + w.endMs}));
  });
}

const SENTENCE_END = /[.!?…]["'”’)]*$/;
const CLAUSE_END = /[,;:—]["'”’)]*$/;

/**
 * Groups words into cues: ≤ 2 lines of ≤ maxLine chars, ≤ maxMs on screen.
 * A cue always ends at a sentence end or a pause, and at a clause end
 * once it is past half full. Each cue is held `holdMs` after its last word
 * (and at least `minMs` in total) unless the next cue starts sooner.
 * @param {TimedWord[]} words
 * @param {{maxLine?: number, maxMs?: number, minMs?: number, holdMs?: number, pauseMs?: number}} [o]
 * @returns {Cue[]}
 */
export function buildCues(words, {maxLine = 42, maxMs = 6000, minMs = 1200, holdMs = 400, pauseMs = 600} = {}) {
  /** @type {TimedWord[][]} */
  const groups = [];
  /** @type {TimedWord[]} */
  let cur = [];
  const len = (/** @type {TimedWord[]} */ ws) => ws.reduce((n, w) => n + w.text.length, 0) + Math.max(0, ws.length - 1);
  const fits = (/** @type {TimedWord[]} */ ws) => wrap(ws.map((w) => w.text), maxLine).every((l) => l.length <= maxLine);
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length) {
      const tooLong = !fits([...cur, w]) || w.endMs - cur[0].startMs > maxMs;
      const pause = w.startMs - prev.endMs > pauseMs;
      const clause = CLAUSE_END.test(prev.text) && len(cur) > maxLine;
      if (tooLong || pause || clause || SENTENCE_END.test(prev.text)) {
        groups.push(cur);
        cur = [];
      }
    }
    cur.push(w);
  });
  if (cur.length) groups.push(cur);

  return groups.map((g, i) => {
    const start = g[0].startMs;
    const next = groups[i + 1]?.[0].startMs ?? Infinity;
    const end = Math.min(next, Math.max(g[g.length - 1].endMs + holdMs, start + minMs));
    return {startMs: start, endMs: end, lines: wrap(g.map((w) => w.text), maxLine)};
  });
}

/**
 * One line if it fits, else two lines split at the most balanced space
 * (preferring a split right after a comma).
 * @param {string[]} tokens @param {number} maxLine
 */
export function wrap(tokens, maxLine) {
  const text = tokens.join(' ');
  if (text.length <= maxLine || tokens.length < 2) return [text];
  let best = 1;
  let bestScore = Infinity;
  for (let k = 1; k < tokens.length; k++) {
    const a = tokens.slice(0, k).join(' ');
    const b = tokens.slice(k).join(' ');
    const over = Math.max(0, a.length - maxLine) + Math.max(0, b.length - maxLine);
    const score = over * 100 + Math.abs(a.length - b.length) - (CLAUSE_END.test(tokens[k - 1]) ? 8 : 0);
    if (score < bestScore) [best, bestScore] = [k, score];
  }
  return [tokens.slice(0, best).join(' '), tokens.slice(best).join(' ')];
}

/** 62345 → "00:01:02,345" @param {number} ms */
export function srtTime(ms) {
  const t = Math.max(0, Math.round(ms));
  const p = (/** @type {number} */ n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)},${p(t % 1000, 3)}`;
}

/** @param {Cue[]} cues */
export const formatSrt = (cues) => cues.map((c, i) => `${i + 1}\n${srtTime(c.startMs)} --> ${srtTime(c.endMs)}\n${c.lines.join('\n')}\n`).join('\n');
