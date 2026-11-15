// The motion vocabulary a script may use, and checks that a short actually
// uses it (skills/short-styles → references/motion-vocabulary.md). Mirrors
// packages/motion-kit/src/types.ts; `shorts make` prints these as `motion:`
// warnings so a misspelt name never renders as a silent default.

export const HOOK_VARIANTS = /** @type {const} */ (['rise', 'build', 'band', 'echo', 'card', 'ghost', 'tag']);
export const TYPE_STYLES = /** @type {const} */ (['slam', 'scramble', 'stack', 'build', 'echo', 'boxed', 'offset', 'wall', 'window']);
export const HITS = /** @type {const} */ (['punch', 'flash', 'invert', 'freeze', 'strobe', 'rgb', 'jolt', 'blur', 'echo']);
export const GRADES = /** @type {const} */ (['tealOrange', 'noir', 'warm', 'cold', 'punchy', 'duotone', 'faded']);
export const FX = /** @type {const} */ (['glitch', 'flames', 'vhs', 'shake', 'letterbox', 'flare', 'leak', 'tiltShift', 'spotlight']);
export const CAPTION_PRESETS = /** @type {const} */ (['style', 'slam', 'bigKey', 'pill', 'sweep', 'underline']);
export const TRANSITIONS = /** @type {const} */ ([
  'zoomPunch', 'pushCut', 'slideLeft', 'slideUp', 'wipe', 'fade', 'paper', 'glitch', 'blur', 'pop', 'flip',
  'zoomIn', 'zoomOut', 'whip', 'filmBurn', 'iris',
  'flash', 'dip', 'rgbSplit', 'blinds', 'strips', 'diamond', 'clock', 'split', 'cube', 'pageTurn', 'spin', 'stretch', 'swirl', 'lightSweep', 'whipUp', 'push',
  'maskText', 'maskInk', 'maskBrush',
  'none',
]);

export const MAX_HITS = 5; // accents across one short; more reads as noise
const KEYWORD_VARIANTS = ['band', 'echo', 'card', 'ghost', 'tag'];
export const MAX_KEYWORD = 10; // characters: the keyword is set huge in a condensed face

const emphasised = (/** @type {string} */ text) => (text.match(/\*([^*]+)\*/)?.[1] ?? '').replace(/[.,!?:;]+$/, '');

/**
 * Warnings about a short's motion: unknown names, and an edit with no
 * accents at all. Long-form is skipped (its camera does this work).
 * @param {{format?: string, captions?: string, scenes: Record<string, any>[]}} script
 * @param {{previousHook?: string | null}} [o]  the hook variant of the episode before this one
 * @returns {string[]}
 */
export function motionWarnings(script, {previousHook} = {}) {
  const out = /** @type {string[]} */ ([]);
  const bad = (/** @type {string} */ what, /** @type {unknown} */ v, /** @type {readonly string[]} */ list) => out.push(`${what} "${v}" is not a thing: use one of ${list.join(', ')}`);
  script.scenes.forEach((s, i) => {
    const at = `scene ${i + 1}`;
    if (s.type === 'hook' && s.variant != null && !HOOK_VARIANTS.includes(s.variant)) bad(`${at} hook variant`, s.variant, HOOK_VARIANTS);
    if (s.type === 'type' && s.style != null && !TYPE_STYLES.includes(s.style)) bad(`${at} type style`, s.style, TYPE_STYLES);
    if (s.transition != null && !TRANSITIONS.includes(s.transition)) bad(`${at} transition`, s.transition, TRANSITIONS);
    if (s.transition === 'maskText' && !s.maskWord) out.push(`${at} transition "maskText" has no "maskWord" (the word the scene is cut through)`);
    if (s.type === 'photo' && Boolean(s.behind) !== Boolean(s.cutout)) out.push(`${at} photo needs both "behind" (the word) and "cutout" (from \`shorts cutout\`) for text behind the subject`);
    if (s.grade != null && !GRADES.includes(s.grade)) bad(`${at} grade`, s.grade, GRADES);
    for (const f of s.fx ?? []) if (!FX.includes(f)) bad(`${at} fx`, f, FX);
    for (const h of s.hits ?? []) {
      if (!HITS.includes(h.fx)) bad(`${at} hit`, h.fx, HITS);
      if (typeof h.at !== 'number') out.push(`${at} hit "${h.fx}" has no "at" (beats from the scene start)`);
    }
    if (s.type === 'hook' && KEYWORD_VARIANTS.includes(s.variant)) {
      const kw = s.keyword ?? emphasised((s.lines ?? []).join(' '));
      if (!kw) out.push(`${at} hook "${s.variant}" has no keyword: set "keyword" or *emphasise* one word in the lines`);
      else if (s.keyword && s.keyword.length > MAX_KEYWORD) out.push(`${at} hook keyword "${s.keyword}" is ${s.keyword.length} characters: keep it ≤ ${MAX_KEYWORD} (one word)`);
    }
  });
  if (script.captions != null && !CAPTION_PRESETS.includes(/** @type {any} */ (script.captions))) bad('captions preset', script.captions, CAPTION_PRESETS);
  if (script.format === 'long') return out;

  const hook = script.scenes[0]?.type === 'hook' ? (script.scenes[0].variant ?? 'rise') : null;
  if (hook && previousHook && hook === previousHook) out.push(`hook variant "${hook}" was used by the previous episode: pick another (${HOOK_VARIANTS.filter((v) => v !== hook).join(', ')})`);
  const hits = script.scenes.reduce((n, s) => n + (s.hits?.length ?? 0), 0);
  const accents = hits + script.scenes.filter((s) => s.zoom || s.fx?.length || s.glitchAt?.length).length;
  if (accents === 0) out.push('flat edit: no scene has "hits", "zoom" or "fx". Put 2–4 accents on the words that earn them (a punch on the number, a flash on the reveal)');
  if (hits > MAX_HITS) out.push(`${hits} hits: keep it to ${MAX_HITS} across the short, or none of them lands`);
  const named = new Set(script.scenes.map((s) => s.transition).filter(Boolean));
  const used = script.scenes.filter((s) => s.transition).length;
  if (used >= 3 && named.size === 1) out.push(`every named transition is "${[...named][0]}": vary them or leave them to the style's rotation`);
  return out;
}

// ── Pacing: no two shorts in a row with the same shape or length ───────────
// Review of 2026-11-12: episodes 31–52 were all hook → 2 scenes → cta at
// 17–21 s, and 53–58 all hook → 3 scenes → cta at 32–37 s with every scene
// about 7 s. Same skeleton, same rhythm, every day. A script now names a
// pacing shape, and consecutive episodes must differ in shape and length.

/** shape → [min scenes, max scenes] */
export const PACINGS = /** @type {const} */ ({
  steady: [5, 5], // five even beats (the old default)
  staccato: [6, 7], // quick 2–3 s cuts, then one hold
  slowBurn: [5, 5], // short scenes around one long evidence scene
  countdown: [6, 6], // hook, three numbered beats, the reveal, the question
  coldOpen: [5, 6], // opens inside the evidence with ≤ 6 words, the title lands in scene 2
});
export const QUICK_WORDS = 8; // a "quick cut" scene: ≤ 8 VO words (≈ 3.5 s)
export const HOLD_WORDS = 22; // a "hold" scene: ≥ 22 VO words (≈ 10 s)
const SAME_LENGTH = 4; // total VO words within ±4 of the previous episode ≈ the same duration

const count = (/** @type {string | undefined} */ t) => (t ?? '').replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
/** @param {{scenes: Record<string, any>[], outro?: {vo?: string}}} script */
export const voWords = (script) => script.scenes.reduce((n, s) => n + count(s.vo), 0) + count(script.outro?.vo);

/**
 * Warnings about a short's rhythm, and about repeating the previous
 * episode's shape, scene order or length.
 * @param {{format?: string, pacing?: string, scenes: Record<string, any>[], outro?: {vo?: string}}} script
 * @param {{previous?: {pacing?: string, scenes: Record<string, any>[], outro?: {vo?: string}} | null}} [o]
 * @returns {string[]}
 */
export function pacingWarnings(script, {previous} = {}) {
  if (script.format === 'long') return [];
  const out = /** @type {string[]} */ ([]);
  const names = Object.keys(PACINGS);
  const pacing = script.pacing ?? 'steady';
  if (!names.includes(pacing)) return [`pacing "${pacing}" is not a thing: use one of ${names.join(', ')}`];
  const [lo, hi] = /** @type {Record<string, readonly [number, number]>} */ (PACINGS)[pacing];
  const n = script.scenes.length;
  if (n < lo || n > hi) out.push(`pacing "${pacing}" takes ${lo === hi ? lo : `${lo}–${hi}`} scenes, this has ${n}`);
  const words = script.scenes.map((s) => count(s.vo));
  const quick = words.filter((w) => w > 0 && w <= QUICK_WORDS).length;
  const longest = Math.max(0, ...words);
  if (pacing === 'staccato' && quick < 3) out.push(`staccato needs ≥ 3 quick cuts (≤ ${QUICK_WORDS} VO words each), this has ${quick}`);
  if (pacing === 'slowBurn' && longest < HOLD_WORDS) out.push(`slowBurn needs one hold scene of ≥ ${HOLD_WORDS} VO words (the evidence), the longest here is ${longest}`);
  if (pacing === 'coldOpen' && words[0] > 6) out.push(`coldOpen opens on ≤ 6 VO words over the evidence, scene 1 has ${words[0]}`);
  // the body (everything but the closing question) should not tick like a metronome
  const body = words.slice(0, -1).filter((w) => w > 0);
  if (body.length >= 3 && Math.max(...body) / Math.min(...body) < 1.6)
    out.push(`even pacing: the scenes run ${body.join(', ')} VO words, all about the same. Make one a quick cut (≤ ${QUICK_WORDS} words) and let one breathe`);

  if (previous) {
    if ((previous.pacing ?? 'steady') === pacing) out.push(`pacing "${pacing}" was used by the previous episode: pick another (${names.filter((x) => x !== pacing).join(', ')})`);
    const seq = (/** @type {{scenes: Record<string, any>[]}} */ s) => s.scenes.map((x) => x.type).join(' > ');
    if (seq(previous) === seq(script)) out.push(`same scene order as the previous episode (${seq(script)}): change at least one scene type`);
    const [a, b] = [voWords(script), voWords(previous)];
    if (Math.abs(a - b) <= SAME_LENGTH) out.push(`same length as the previous episode (${a} vs ${b} VO words): move toward the other end of the range`);
  }
  return out;
}
