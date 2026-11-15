// Script and title checks for a short. Each check belongs to a named rule in
// the channel's settings (channel-settings.mjs → Rules); a rule that is off
// prints nothing. The numbers (how many scenes, how many words) are the
// channel's own; the reasons behind them are in the channel's brief.
import {DEFAULT_RULES} from './channel-settings.mjs';

/** @typedef {import('./channel-settings.mjs').Rules} Rules */

// Defaults for the scene and word bounds live in channel-settings.mjs (about 2.2 spoken words a second).
export const [SCENES, MAX_SCENES] = DEFAULT_RULES.scenes;
export const [MIN_WORDS, MAX_WORDS] = DEFAULT_RULES.words;
export const MAX_FIRST_SENTENCE = 10;
export const ANCHOR_WORDS = 3; // the anchor must sit in the title's first 3 words

const words = (/** @type {string} */ t) => t.replace(/\*/g, '').split(/\s+/).filter(Boolean);
const escape = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The anchor (a name with search demand, series.json → anchors) that appears
 * earliest in `text`, matched case-insensitively on whole words; at the same
 * spot the longer one wins, so "Claude Code" beats "Claude".
 * @param {string} text @param {string[]} anchors @returns {string | null}
 */
export function findAnchor(text, anchors = []) {
  let best = /** @type {{a: string, at: number} | null} */ (null);
  for (const a of anchors) {
    const m = new RegExp(`(^|[^\\w])${escape(a)}(?=$|[^\\w])`, 'i').exec(text);
    if (!m) continue;
    const at = m.index + m[1].length;
    if (!best || at < best.at || (at === best.at && a.length > best.a.length)) best = {a, at};
  }
  return best?.a ?? null;
}

/** The title without "#shorts" and hashtags. @param {string} t */
const bareTitle = (t) => t.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();

/**
 * Checks for a short's script.json (+ metadata.json), each tagged with the
 * rule it belongs to; long-form is skipped.
 * @param {{format?: string, scenes: {type: string, vo?: string, image?: string, video?: string}[], outro?: {vo?: string}}} script
 * @param {{meta?: {title?: string, comment?: string} | null, anchors?: string[], rules?: Rules, badge?: string}} [o]  badge: the channel's badge template (publish.badge)
 * @returns {{rule: keyof Rules, message: string}[]}
 */
export function retentionChecks(script, {meta, anchors = [], rules = DEFAULT_RULES, badge} = {}) {
  if (script.format === 'long') return [];
  /** @type {{rule: keyof Rules, message: string}[]} */
  const out = [];
  const add = (/** @type {keyof Rules} */ rule, /** @type {string} */ message) => void out.push({rule, message});
  const {scenes} = script;
  const [minScenes, maxScenes] = rules.scenes;
  const [minWords, maxWords] = rules.words;
  if (scenes.length < minScenes || scenes.length > maxScenes) add('scenes', `${scenes.length} scenes: use ${minScenes}–${maxScenes}`);
  const total = [...scenes.map((s) => s.vo ?? ''), script.outro?.vo ?? ''].reduce((n, t) => n + words(t).length, 0);
  if (total < minWords) add('words', `${total} VO words: too short, aim for ${minWords}–${maxWords} with the outro`);
  if (total > maxWords) add('words', `${total} VO words: keep it to ${maxWords} with the outro`);
  const first = scenes[0];
  if (rules.subjectInFrame0 && first && !first.image && !first.video && !['screenshot', 'spotlight', 'clip', 'clipping'].includes(first.type))
    add('subjectInFrame0', 'scene 1 does not show the subject: give the hook an "image" or "video" of the thing itself');
  if (rules.shortFirstSentence) {
    const opener = words((first?.vo ?? '').split(/(?<=[.?!])\s/)[0]);
    if (opener.length > MAX_FIRST_SENTENCE) add('shortFirstSentence', `first VO sentence is ${opener.length} words: lead with the twist in ≤ ${MAX_FIRST_SENTENCE}`);
    if (/^(someone|a new|one developer|this week)\b/i.test(first?.vo ?? '')) add('shortFirstSentence', 'first VO sentence is a run-up: start with the name or the payoff');
  }
  const last = scenes.at(-1);
  if (rules.endsOnQuestion && last && !/\?/.test(last.vo ?? '')) add('endsOnQuestion', 'the last scene asks no question: end on one that loops back to the opening');

  if (meta?.title != null) {
    if (rules.shortsTag && /#shorts/i.test(meta.title)) add('shortsTag', 'title has "#shorts": move it to the description, the title is for search');
    if (rules.titleAnchor) {
      const title = bareTitle(meta.title);
      const anchor = findAnchor(title, anchors);
      if (!anchor) add('titleAnchor', `title has no searchable anchor from this channel's "anchors" list: "${title}" — anchor it or skip the story`);
      else if (!findAnchor(words(title).slice(0, ANCHOR_WORDS + words(anchor).length - 1).join(' '), [anchor]))
        add('titleAnchor', `title anchor "${anchor}" is not in the first ${ANCHOR_WORDS} words: move it to the front`);
    }
  }
  if (rules.endsOnQuestion && meta && !/\?/.test(meta.comment ?? '')) add('endsOnQuestion', 'metadata.comment has no question: the pinned comment should ask one');
  if (rules.sourcesRequired) {
    const src = /** @type {any} */ (script).sources;
    const entries = src && typeof src === 'object' && !Array.isArray(src) ? Object.entries(src) : [];
    if (!entries.length) add('sourcesRequired', 'no "sources": list what each claim rests on, as {"<claim>": "<where, with link and date>"}');
    for (const [claim, where] of entries) if (!/https?:\/\/\S+/.test(String(where))) add('sourcesRequired', `the source for "${claim.slice(0, 60)}" has no link: name the page it comes from`);
  }
  // Without a label the badge quietly drops "via …"; on a channel that shows its sources, that is a slip.
  if (rules.badgeSource && badge?.includes('{source}') && !(/** @type {any} */ (script).sourceLabel)) add('badgeSource', 'the badge shows where the story was found but script.json has no "sourceLabel"');
  return out;
}

/**
 * The same checks as lines for `shorts make`.
 * @param {Parameters<typeof retentionChecks>[0]} script @param {Parameters<typeof retentionChecks>[1]} [o]
 * @returns {string[]}
 */
export const retentionWarnings = (script, o) => retentionChecks(script, o).map((c) => c.message);

/** Scenes that show the subject's own page or app: they make no sense for a subject that has none. */
export const PRODUCT_SCENES = ['screenshot', 'spotlight', 'chat', 'cta'];

/**
 * Stops a script that uses a product scene for a subject with no page of its own.
 * @param {{brand?: {url?: string}, scenes: {type: string}[]}} script
 */
export function assertScenesFit(script) {
  if (script.brand?.url) return;
  const i = script.scenes.findIndex((s) => PRODUCT_SCENES.includes(s.type));
  if (i >= 0) throw new Error(`scene ${i + 1} is "${script.scenes[i].type}": that scene shows the subject's own page (brand.url), and this script has none. Use clipping, photo, stat or another scene, or set brand.url`);
}
