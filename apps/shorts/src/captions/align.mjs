// Aligns the script's words (correct spelling, *emphasis* marks) to whisper's
// timed tokens (correct timing, sometimes wrong spelling) with a global
// sequence alignment. Script words with no confident match get times
// interpolated from their neighbours, so every caption word is timed.

/** @typedef {{text: string, startMs: number, endMs: number}} TimedToken */
/** @typedef {{text: string, startMs: number, endMs: number, emphasis?: boolean, br?: boolean}} Word  br: phrase ends here */

/** Lowercase, no punctuation; "Show HN's" → "showhns". @param {string} s */
export const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** @param {string} a @param {string} b */
function editDistance(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** 2 exact, 1 close (brand names whisper misspells), −1 otherwise. @param {string} a @param {string} b */
function similarity(a, b) {
  if (!a || !b) return -1;
  if (a === b) return 2;
  const dist = editDistance(a, b);
  return dist <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 3)) ? 1 : -1;
}

/**
 * Script text → display words. `*word*` (or `*two words*`) marks emphasis.
 * Trailing commas/periods/colons are dropped for clean captions (? and !
 * stay); `br` remembers that the phrase ended there, for caption paging.
 * @param {string} text @returns {{text: string, emphasis: boolean, br: boolean}[]}
 */
export function scriptWords(text) {
  /** @type {{text: string, emphasis: boolean, br: boolean}[]} */
  const out = [];
  let emph = false;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const opens = raw.startsWith('*');
    const closes = raw.replace(/[.,!?;:…]+$/, '').endsWith('*');
    if (opens) emph = true;
    const word = raw.replace(/\*/g, '').replace(/[.,;:…]+$/, '');
    if (word) out.push({text: word, emphasis: emph, br: /[.,!?;:…—]\**$/.test(raw)});
    if (closes) emph = false;
  }
  return out;
}

/**
 * @param {string} text script line (the `vo` field)
 * @param {TimedToken[]} tokens whisper output for that clip
 * @param {number} durationMs clip length, bounds interpolation
 * @returns {Word[]}
 */
export function align(text, tokens, durationMs) {
  const words = scriptWords(text);
  const a = words.map((w) => norm(w.text));
  const b = tokens.map((t) => norm(t.text));
  const n = a.length;
  const m = b.length;
  const GAP = -1;
  // Needleman–Wunsch score matrix.
  const S = Array.from({length: n + 1}, (_, i) => Array.from({length: m + 1}, (_, j) => (i === 0 ? j * GAP : j === 0 ? i * GAP : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) S[i][j] = Math.max(S[i - 1][j - 1] + similarity(a[i - 1], b[j - 1]), S[i - 1][j] + GAP, S[i][j - 1] + GAP);
  /** @type {(TimedToken | null)[]} */
  const match = Array(n).fill(null);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const sim = similarity(a[i - 1], b[j - 1]);
    if (S[i][j] === S[i - 1][j - 1] + sim) {
      if (sim > 0) match[i - 1] = tokens[j - 1];
      i--, j--;
    } else if (S[i][j] === S[i - 1][j] + GAP) i--;
    else j--;
  }
  return interpolate(words, match, durationMs);
}

/**
 * Fills unmatched words by spreading the gap between matched neighbours by
 * character length, then enforces increasing, non-overlapping times.
 * @param {{text: string, emphasis: boolean, br: boolean}[]} words @param {(TimedToken | null)[]} match @param {number} durationMs
 * @returns {Word[]}
 */
function interpolate(words, match, durationMs) {
  /** @type {{start: number, end: number}[]} */
  const t = words.map((_, i) => (match[i] ? {start: match[i].startMs, end: match[i].endMs} : {start: NaN, end: NaN}));
  let k = 0;
  while (k < words.length) {
    if (!Number.isNaN(t[k].start)) {
      k++;
      continue;
    }
    let e = k;
    while (e < words.length && Number.isNaN(t[e].start)) e++;
    const from = k > 0 ? t[k - 1].end : 0;
    const to = e < words.length ? t[e].start : durationMs;
    const weights = words.slice(k, e).map((w) => w.text.length + 1);
    const total = weights.reduce((x, y) => x + y, 0);
    let at = from;
    for (let q = k; q < e; q++) {
      const d = (Math.max(0, to - from) * weights[q - k]) / total;
      t[q] = {start: at, end: at + d};
      at += d;
    }
    k = e;
  }
  let prevEnd = 0;
  return words.map((w, q) => {
    const start = Math.round(Math.max(t[q].start, prevEnd));
    const end = Math.round(Math.max(start + 40, Math.min(t[q].end, durationMs)));
    prevEnd = end;
    return {text: w.text, startMs: start, endMs: end, ...(w.emphasis ? {emphasis: true} : {}), ...(w.br ? {br: true} : {})};
  });
}
