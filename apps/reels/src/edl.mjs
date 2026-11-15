// Edit decision list for a reel: which parts of the footage to keep, and how
// times in the source map onto the edited timeline. Pure functions; the CLI
// does the I/O.

/** @typedef {{start: number, end: number}} Span seconds in the source */
/** @typedef {{text: string, start: number, end: number, emphasis?: boolean, line?: number}} Word */
/** @typedef {{start: number, end: number, from: number}} Keep  a kept source span placed at output second `from` */

/**
 * Jump cuts: drop every pause of at least `minGap` seconds, keeping `pad`
 * seconds of air on each side so words don't get clipped.
 * @param {Span[]} silences from ffmpeg silencedetect
 * @param {{start: number, end: number, minGap?: number, pad?: number}} o the trimmed range of the source
 * @returns {Keep[]}
 */
export function planKeeps(silences, {start, end, minGap = 0.35, pad = 0.08}) {
  /** @type {Keep[]} */
  const keeps = [];
  let cursor = start;
  let out = 0;
  const push = (/** @type {number} */ a, /** @type {number} */ b) => {
    if (b - a < 0.05) return;
    keeps.push({start: a, end: b, from: out});
    out += b - a;
  };
  let stop = end;
  for (const s of mergeSpans(silences, 0.15)) {
    if (s.end <= start || s.start >= stop) continue;
    const a = Math.max(s.start, start) + pad;
    // leading / trailing silence: just start later / stop earlier
    if (s.start <= start) {
      cursor = Math.max(cursor, Math.min(s.end - pad, stop));
      continue;
    }
    if (s.end >= stop) {
      stop = Math.min(stop, a);
      break;
    }
    const b = s.end - pad;
    if (b - a < minGap - 2 * pad || a <= cursor) continue;
    push(cursor, a);
    cursor = b;
  }
  push(cursor, stop);
  return keeps;
}

/**
 * Join spans separated by less than `gap` seconds (a breath or click
 * splitting one pause in two).
 * @param {Span[]} spans @param {number} gap @returns {Span[]}
 */
export function mergeSpans(spans, gap) {
  /** @type {Span[]} */
  const out = [];
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && s.start - last.end < gap) last.end = Math.max(last.end, s.end);
    else out.push({...s});
  }
  return out;
}

/**
 * whisper.cpp sometimes loops, repeating a phrase it already heard. Report
 * any 2–6 word phrase that repeats back-to-back 3+ times.
 * @param {{text: string}[]} words
 * @returns {{at: number, phrase: string, times: number}[]} at = word index
 */
export function findLoops(words) {
  const t = words.map((w) => w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
  /** @type {{at: number, phrase: string, times: number}[]} */
  const out = [];
  for (let i = 0; i < t.length; i++) {
    for (let n = 2; n <= 6; n++) {
      let times = 1;
      while (i + (times + 1) * n <= t.length && t.slice(i, i + n).every((x, k) => x === t[i + times * n + k])) times++;
      if (times >= 3) {
        out.push({at: i, phrase: t.slice(i, i + n).join(' '), times});
        i += times * n - 1;
        break;
      }
    }
  }
  return out;
}

/**
 * Speech windows: the stretches between real pauses (≥ minPause), measured
 * from the audio. These are exact where whisper's word times are not.
 * @param {Span[]} silences @param {number} duration @returns {Span[]}
 */
export function speechWindows(silences, duration, {minPause = 0.3} = {}) {
  /** @type {Span[]} */
  const out = [];
  let t = 0;
  for (const s of mergeSpans(silences, 0.15).filter((s) => s.end - s.start >= minPause)) {
    if (s.start - t > 0.1) out.push({start: t, end: s.start});
    t = Math.max(t, s.end);
  }
  if (duration - t > 0.1) out.push({start: t, end: duration});
  return out;
}

/**
 * Caption words from a corrected script: one line per speech window, words
 * spread across their window in proportion to length. whisper drifts by up
 * to ~0.6 s on Hindi; this can't drift. A line of "" skips its window
 * (music, a laugh). `*word*` marks emphasis.
 *
 * A line can instead be `{from, to, text}` (source seconds): a subtitle with
 * its own span, e.g. an English translation timed by whisper --translate.
 * Then every line must carry its span and `windows` is ignored.
 * @param {(string | {from: number, to: number, text: string})[]} lines @param {Span[]} windows
 * @returns {Word[]}
 */
export function timeLines(lines, windows) {
  const timed = lines.every((l) => typeof l === 'object');
  if (!timed && lines.some((l) => typeof l === 'object')) throw new Error('script: use either plain lines (one per speech window) or {from, to, text} lines, not both');
  if (!timed && lines.length !== windows.length)
    throw new Error(`script has ${lines.length} lines but the audio has ${windows.length} speech windows: one line per window (use "" to skip one)`);
  return lines.flatMap((entry, i) => {
    const line = typeof entry === 'string' ? entry : entry.text;
    const {start, end} = typeof entry === 'string' ? windows[i] : {start: entry.from, end: entry.to};
    const toks = line.split(/\s+/).filter(Boolean);
    const weight = (/** @type {string} */ t) => Math.max(2, t.replace(/\*/g, '').length) + 1;
    const total = toks.reduce((n, t) => n + weight(t), 0);
    let at = start;
    return toks.map((t) => {
      const len = ((end - start) * weight(t)) / total;
      const w = {text: t.replace(/\*/g, ''), start: at, end: at + len, line: i, ...(/^\*.+\*$/.test(t) ? {emphasis: true} : {})};
      at += len;
      return w;
    });
  });
}

/** @param {Keep[]} keeps */
export const keptSeconds = (keeps) => keeps.reduce((n, k) => n + k.end - k.start, 0);

/**
 * Source second → edited second. A time inside a cut snaps to the start of
 * the next kept span (so an overlay cued in a pause lands on the cut);
 * a time after the last span returns null.
 * @param {number} t @param {Keep[]} keeps
 * @returns {number | null}
 */
export function mapTime(t, keeps) {
  for (const k of keeps) {
    if (t < k.start) return k.from;
    if (t <= k.end) return k.from + (t - k.start);
  }
  return null;
}

/**
 * Group words into caption pages: at most `maxWords` words and `maxChars`
 * characters, breaking early on punctuation or a gap in speech.
 * @param {Word[]} words already on the edited timeline
 * @param {{maxWords?: number, maxChars?: number, gap?: number}} [o]
 * @returns {{start: number, end: number, words: Word[]}[]}
 */
export function pageCaptions(words, {maxWords = 3, maxChars = 16, gap = 0.3} = {}) {
  /** @type {{start: number, end: number, words: Word[]}[]} */
  const pages = [];
  /** @type {Word[]} */
  let cur = [];
  const flush = () => {
    if (cur.length) pages.push({start: cur[0].start, end: cur[cur.length - 1].end, words: cur});
    cur = [];
  };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (prev && (cur.length >= maxWords || chars > maxChars || w.start - prev.end > gap || /[.,!?…]$/.test(prev.text))) flush();
    cur.push(w);
  }
  flush();
  // Hold each page until the next one starts (no flicker in short gaps).
  for (let i = 0; i < pages.length - 1; i++) {
    if (pages[i + 1].start - pages[i].end < 0.6) pages[i].end = pages[i + 1].start;
  }
  return pages;
}

/**
 * One page per script line (subtitle style): the whole lyric shows at once.
 * Words without a `line` (raw whisper) fall back to pageCaptions.
 * @param {Word[]} words
 */
export function linePages(words) {
  if (words.some((w) => w.line == null)) return pageCaptions(words);
  /** @type {{start: number, end: number, words: Word[]}[]} */
  const pages = [];
  for (const w of words) {
    const last = pages[pages.length - 1];
    if (last && last.words[0].line === w.line) {
      last.words.push(w);
      last.end = w.end;
    } else pages.push({start: w.start, end: w.end, words: [w]});
  }
  for (let i = 0; i < pages.length - 1; i++) {
    if (pages[i + 1].start - pages[i].end < 0.6) pages[i].end = pages[i + 1].start;
  }
  return pages;
}

/**
 * Punch-in zoom levels: one step per jump cut (alternating so every cut reads
 * as a new angle), overridden by explicit `zooms` from the edit.
 * @param {Keep[]} keeps
 * @param {{at: number, scale: number}[]} explicit at = edited second
 * @param {{base?: number, punch?: number}} [o]
 * @returns {{at: number, scale: number}[]} sorted by `at`
 */
export function zoomSteps(keeps, explicit, {base = 1, punch = 1.14} = {}) {
  // An explicit zoom near a cut replaces that cut's auto step; two steps a
  // few frames apart read as a flicker.
  const near = (/** @type {number} */ t) => explicit.some((z) => Math.abs(z.at - t) < 0.35);
  const auto = keeps.map((k, i) => ({at: k.from, scale: i % 2 ? punch : base})).filter((z) => !near(z.at));
  const steps = [...auto, ...explicit].sort((a, b) => a.at - b.at);
  // drop steps too small to read as a new angle (< 3 %): they only look like a wobble
  /** @type {{at: number, scale: number}[]} */
  const out = [];
  for (const z of steps) if (!out.length || Math.abs(z.scale - out[out.length - 1].scale) >= 0.03) out.push(z);
  return out;
}

/**
 * Parse `ffmpeg -af silencedetect` stderr into spans. An unterminated
 * silence runs to `duration`.
 * @param {string} log @param {number} duration
 * @returns {Span[]}
 */
export function parseSilences(log, duration) {
  /** @type {Span[]} */
  const spans = [];
  let open = /** @type {number | null} */ (null);
  for (const m of log.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Number(m[2]);
    if (m[1] === 'start') open = Math.max(0, t);
    else if (open !== null) {
      spans.push({start: open, end: t});
      open = null;
    }
  }
  if (open !== null) spans.push({start: open, end: duration});
  return spans;
}
