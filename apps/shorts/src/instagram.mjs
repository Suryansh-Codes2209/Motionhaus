// The Instagram cut of a short (skills/short-styles → Instagram version).
// A reel with no shares and no comments stops at Instagram's first test
// group, and a "#00X · via GitHub" badge reads like a link roundup, so the
// Instagram cut drops that badge, ends on a share prompt instead of "Follow",
// and ships a caption built to get comments.

// The handle and the niche hashtags are the channel's own (channel.json →
// instagram); only the cadence has a default.
import {DEFAULT_PUBLISH, DEFAULT_RULES, fill, publishOf} from './channel-settings.mjs';

export const IG_DEFAULTS = {
  /** @type {string[]} */
  hashtags: [],
  maxHashtags: 6,
  slotsIST: ['19:30'],
};

/** The Instagram end card from the channel's share line. @param {string} line */
const shareOutro = (line) => ({text: line, vo: /[.?!]$/.test(line) ? line : `${line}.`});

/**
 * @typedef {object} InstaScript  script.json's optional `instagram` block
 * @property {string} [hook]       caption's first line: the claim, repeated
 * @property {string} [about]      one or two sentences: what it is
 * @property {string} [question]   the comment prompt (default: the last scene's question)
 * @property {{text: string, vo?: string, sub?: string}} [outro]  end card (default: share prompt)
 * @property {string[]} [makers]   the makers' Instagram handles, tagged in the caption
 * @property {string[]} [hashtags] 1–2 topic tags added to the niche set
 */

/** @param {any} series */
export function igConfig(series) {
  const ig = {...IG_DEFAULTS, ...(series?.instagram ?? {})};
  if (typeof ig.handle !== 'string' || !ig.handle.trim()) throw new Error('channel.json: instagram.handle is missing (this channel has no Instagram account set)');
  return /** @type {typeof IG_DEFAULTS & {handle: string, autoPostAfter?: number}} */ (ig);
}

const firstSentence = (/** @type {string} */ t) => (t.replace(/\*/g, '').split(/(?<=[.?!])\s/)[0] ?? '').trim();

/** The question the short asks, from the last scene that ends with one. @param {{scenes: {vo?: string}[]}} script */
export function lastQuestion(script) {
  for (const s of [...script.scenes].reverse()) {
    const q = (s.vo ?? '').replace(/\*/g, '').match(/[^.?!]*\?/g);
    if (q) return q[q.length - 1].trim();
  }
  return null;
}

/**
 * script.instagram with defaults filled in.
 * @param {any} script @param {any} meta metadata.json (YouTube), for fallbacks
 * @param {import('./channel-settings.mjs').Publish} [publish] the channel's published text (default: the launch defaults)
 */
export function instaScript(script, meta, publish = DEFAULT_PUBLISH) {
  /** @type {InstaScript} */
  const ig = script.instagram ?? {};
  const desc = String(meta?.description ?? '').split('\n\n')[0];
  return {
    hook: ig.hook ?? String(meta?.title ?? script.brand.name).replace(/\s*#shorts\b/i, '').trim(),
    about: ig.about ?? firstSentence(desc) ?? '',
    question: ig.question ?? lastQuestion(script) ?? `Would you use ${script.brand.name}?`,
    outro: {...shareOutro(publish.shareOutro), ...(ig.outro ?? {})},
    makers: ig.makers ?? [],
    hashtags: ig.hashtags ?? [],
  };
}

/**
 * Checks on the Instagram cut, each tagged with its rule (channel-settings.mjs
 * → Rules). A channel without Instagram gets none.
 * @param {any} script @param {{rules?: import('./channel-settings.mjs').Rules, instagram?: boolean}} [o]
 * @returns {{rule: keyof import('./channel-settings.mjs').Rules, message: string}[]}
 */
export function instaChecks(script, {rules = DEFAULT_RULES, instagram = true} = {}) {
  if (script.format === 'long' || !instagram) return [];
  /** @type {{rule: keyof import('./channel-settings.mjs').Rules, message: string}[]} */
  const out = [];
  if (rules.instagramBlock && !script.instagram) out.push({rule: 'instagramBlock', message: 'no "instagram" block: the caption falls back to the YouTube title and description'});
  const first = script.scenes[0];
  if (rules.subjectInFrame0 && first && first.type === 'type') out.push({rule: 'subjectInFrame0', message: 'scene 1 types words out: viewers swipe before the subject shows'});
  if (rules.subjectInFrame0 && first && !first.image && !first.video && !['screenshot', 'spotlight', 'clip', 'clipping'].includes(first.type))
    out.push({rule: 'subjectInFrame0', message: 'scene 1 has no image of the subject: put it on screen in frame 0'});
  if (rules.endsOnQuestion && !lastQuestion(script) && !script.instagram?.question) out.push({rule: 'endsOnQuestion', message: 'no question to the viewer: a reel with no comments rarely leaves its first test audience'});
  const broad = new Set(rules.broadHashtags.map((t) => t.toLowerCase()));
  const hit = (script.instagram?.hashtags ?? []).map((/** @type {string} */ t) => (t.startsWith('#') ? t : `#${t}`).toLowerCase()).filter((/** @type {string} */ t) => broad.has(t));
  if (hit.length) out.push({rule: 'broadHashtags', message: `${hit.join(' ')} is too broad for this channel (rules.broadHashtags): use a niche topic tag`});
  return out;
}

/** The same checks as lines for `shorts make`. @param {any} script @param {Parameters<typeof instaChecks>[1]} [o] */
export const instaWarnings = (script, o) => instaChecks(script, o).map((c) => c.message);

/** Niche set first, then the topic tags; deduped, ≤ max. @param {string[]} base @param {string[]} topic @param {number} max */
export function hashtags(base, topic, max) {
  const norm = (/** @type {string} */ t) => (t.startsWith('#') ? t : `#${t}`).toLowerCase().replace(/\s+/g, '');
  const all = [...new Set([...topic.map(norm), ...base.map(norm)])];
  return all.slice(0, max);
}

/**
 * The reel's caption: hook, what it is, links, credit, the question, tags.
 * @param {any} script @param {any} meta @param {any} series
 */
export function instaCaption(script, meta, series) {
  const publish = publishOf(series);
  const ig = instaScript(script, meta, publish);
  const cfg = igConfig(series);
  const site = script.brand.url ? (/^https?:/.test(script.brand.url) ? script.brand.url : `https://${script.brand.url}`) : null;
  const bare = (/** @type {string} */ u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  // a launch found on its own site: one link, no "found via" itself
  const ownSource = !script.sourceUrl || (site && bare(site) === bare(script.sourceUrl));
  const links = [site && `🌐 ${site}`, !ownSource && `🔗 ${script.sourceUrl}`].filter(Boolean);
  // the channel's own project (script.ownProject): disclose it, never "not affiliated"
  const credit = script.ownProject ? publish.credit.own : ownSource || !script.sourceLabel ? publish.credit.direct : fill(publish.credit.via, {source: script.sourceLabel});
  const makers = ig.makers.length ? `Made by ${ig.makers.join(' ')}` : null;
  return [
    ig.hook,
    '',
    ig.about,
    ...(makers ? [makers] : []),
    '',
    ...links,
    credit,
    '',
    `${ig.question} 👇`,
    '',
    hashtags(cfg.hashtags, ig.hashtags, cfg.maxHashtags).join(' '),
  ].join('\n');
}

/**
 * The next free Instagram slot: one reel a day (a steady cadence while a
 * new account's reels are still small), at the first configured IST time, after `from`.
 * Slots on `from` that are already past `now` ("HH:MM") are skipped.
 * @param {{date: string}[]} schedule @param {string} from YYYY-MM-DD @param {string[]} slots @param {string} [now]
 * @returns {{date: string, time: string}}
 */
export function nextInstaSlot(schedule, from, slots, now = '00:00') {
  const taken = new Map();
  for (const e of schedule) taken.set(e.date, (taken.get(e.date) ?? 0) + 1);
  const d = new Date(`${from}T00:00:00Z`);
  for (;;) {
    const date = d.toISOString().slice(0, 10);
    const open = date === from ? slots.filter((t) => t > now) : slots;
    const n = taken.get(date) ?? 0;
    const free = open.slice(Math.max(0, n - (slots.length - open.length)));
    if (free.length) return {date, time: free[0]};
    d.setUTCDate(d.getUTCDate() + 1);
  }
}
