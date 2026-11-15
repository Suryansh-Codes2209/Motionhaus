// The design ledger: every design the kit offers (styles, scene types, hook
// variants, type styles, transitions, effects, backdrops), and which episodes
// used each one. `shorts designs` prints what has never been used and what was
// used longest ago, so each new script picks from those; `shorts make` warns
// when a script leans on what the last few videos already showed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {REPO_DIR} from './config.mjs';
import {FX, HOOK_VARIANTS, TRANSITIONS, TYPE_STYLES} from './motion.mjs';

export const STYLES = ['vox', 'explainer', 'neon', 'terminal', 'toybox', '3d'];
export const BACKDROPS = ['canvas', 'shapes3d', 'aurora', 'floor', 'rings', 'plate'];
/** Scenes that are a grid or row of cards: the ones that read as "the same thing again". */
export const CARD_SCENES = ['versus', 'flow', 'features', 'steps', 'bento', 'tiles'];
export const MAX_CARDS_LONG = 2;
const STOCK_ORDER = ['canvas', 'shapes3d', 'aurora', 'floor', 'shapes3d', 'rings'];
const RECENT = 3; // how many earlier videos count as "just seen"

/** Scene types the kit can render, read from the kit's own type file. */
export async function sceneTypes(repo = REPO_DIR) {
  const src = await fs.readFile(path.join(repo, 'packages', 'motion-kit', 'src', 'types.ts'), 'utf8');
  const body = src.slice(src.indexOf('export type Scene'));
  return [...new Set([...body.matchAll(/\{\s*type: '([a-z0-9]+)'/gi)].map((m) => m[1]))].filter((t) => t !== 'logo');
}

/**
 * The designs one script uses, by category.
 * @param {Record<string, any>} script
 * @returns {Record<string, string[]>}
 */
export function designsOf(script) {
  const scenes = script.scenes ?? [];
  const uniq = (/** @type {(string | undefined | null)[]} */ a) => [...new Set(a.filter(Boolean))].map(String);
  return {
    style: uniq([script.style]),
    scene: uniq(scenes.map((/** @type {any} */ s) => s.type)),
    hook: uniq(scenes.filter((/** @type {any} */ s) => s.type === 'hook').map((/** @type {any} */ s) => s.variant ?? 'rise')),
    type: uniq(scenes.filter((/** @type {any} */ s) => s.type === 'type').map((/** @type {any} */ s) => s.style ?? 'slam')),
    transition: uniq(scenes.map((/** @type {any} */ s) => s.transition)),
    fx: uniq(scenes.flatMap((/** @type {any} */ s) => s.fx ?? [])),
    // a chapter that names nothing gets the stock order (longform/Backdrop.tsx)
    backdrop: uniq((script.chapters ?? []).map((/** @type {any} */ c, /** @type {number} */ i) => (c.plate && !c.backdrop ? 'plate' : (c.backdrop ?? STOCK_ORDER[i % STOCK_ORDER.length])))),
    mask: uniq(scenes.flatMap((/** @type {any} */ s) => [s.behind && s.cutout ? 'behind' : null, s.type === 'type' && s.style === 'window' ? 'window' : null, /^mask/.test(s.transition ?? '') ? s.transition : null])),
  };
}

/** Every script in one channel's folder, oldest first. @param {string} data the channel folder @returns {Promise<{episode: number, slug: string, format: string, script: Record<string, any>}[]>} */
export async function allScripts(data) {
  const out = [];
  for (const [folder, format] of /** @type {const} */ ([['episodes', 'short'], ['long', 'long']])) {
    const root = path.join(data, folder);
    for (const slug of await fs.readdir(root).catch(() => [])) {
      const script = await fs.readFile(path.join(root, slug, 'script.json'), 'utf8').then(JSON.parse).catch(() => null);
      if (script?.scenes && typeof script.episode === 'number') out.push({episode: script.episode, slug, format, script});
    }
  }
  return out.sort((a, b) => a.episode - b.episode || (a.format === 'long' ? 1 : -1));
}

/**
 * Usage of every design across the given scripts.
 * @param {{episode: number, script: Record<string, any>}[]} scripts
 * @param {Record<string, readonly string[]>} inventory
 */
export function usage(scripts, inventory) {
  /** @type {Record<string, {name: string, uses: number, last: number | null}[]>} */
  const out = {};
  for (const [cat, names] of Object.entries(inventory)) {
    out[cat] = names.map((name) => {
      const eps = scripts.filter((s) => designsOf(s.script)[cat]?.includes(name)).map((s) => s.episode);
      return {name, uses: eps.length, last: eps.length ? Math.max(...eps) : null};
    });
    out[cat].sort((a, b) => (a.last ?? -1) - (b.last ?? -1) || a.uses - b.uses);
  }
  return out;
}

export async function inventory() {
  return {
    style: STYLES,
    scene: await sceneTypes(),
    hook: HOOK_VARIANTS,
    type: TYPE_STYLES,
    transition: TRANSITIONS.filter((t) => t !== 'none'),
    fx: FX,
    backdrop: BACKDROPS,
    mask: ['behind', 'window', 'maskText', 'maskInk', 'maskBrush'],
  };
}

/**
 * Warnings when a script repeats what earlier videos of the same format just
 * showed, with fresh picks to swap in.
 * @param {Record<string, any>} script
 * @param {{episode: number, format: string, script: Record<string, any>}[]} scripts  every script in the workspace
 * @param {Record<string, readonly string[]>} inv
 * @returns {string[]}
 */
export function designWarnings(script, scripts, inv) {
  const out = [];
  const long = script.format === 'long';
  const earlier = scripts.filter((s) => s.episode < script.episode || (s.episode === script.episode && s.format !== (long ? 'long' : 'short')));
  const same = earlier.filter((s) => (s.format === 'long') === long).slice(-RECENT);
  const mine = designsOf(script);
  const use = usage(earlier, inv);
  const fresh = (/** @type {string} */ cat, n = 4) => use[cat].filter((d) => !mine[cat].includes(d.name)).slice(0, n).map((d) => (d.last == null ? `${d.name} (never used)` : `${d.name} (last #${d.last})`)).join(', ');

  if (same.length && same[same.length - 1].script.style === script.style) out.push(`style "${script.style}" is the same as the previous ${long ? 'long-form' : 'short'} (#${same[same.length - 1].episode}): pick another → ${fresh('style', 3)}`);
  for (const cat of ['scene', 'transition', 'type', 'hook']) {
    const seen = new Set(same.flatMap((s) => designsOf(s.script)[cat]));
    // hook, type, photo and cta are frames for other designs (variants, styles, the photo itself), so they don't count
    const own = cat === 'scene' ? mine[cat].filter((d) => !['hook', 'type', 'photo', 'cta'].includes(d)) : mine[cat];
    const repeats = own.filter((d) => seen.has(d));
    if (own.length >= 3 && repeats.length / own.length > 0.6) out.push(`${repeats.length} of ${own.length} ${cat} designs were in the last ${same.length} ${long ? 'long-forms' : 'shorts'} (${repeats.join(', ')}): swap some for → ${fresh(cat)}`);
  }
  const scenes = script.scenes ?? [];
  const cards = scenes.filter((/** @type {any} */ s) => CARD_SCENES.includes(s.type));
  if (long && cards.length > MAX_CARDS_LONG) out.push(`${cards.length} card scenes (${cards.map((/** @type {any} */ s) => s.type).join(', ')}): keep it to ${MAX_CARDS_LONG} and show the rest with photos, footage, stack, type or mask edits`);
  const counts = /** @type {Record<string, number>} */ ({});
  for (const s of scenes) {
    const key = s.type === 'type' ? `type:${s.style ?? 'slam'}` : s.type === 'hook' ? `hook:${s.variant ?? 'rise'}` : s.type;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const limit = long ? 3 : 2;
  for (const [k, n] of Object.entries(counts)) if (n > limit && k !== 'photo') out.push(`"${k}" appears ${n} times in this video: use each design at most ${limit} times (hook variants: ${HOOK_VARIANTS.join(', ')})`);
  if (long) {
    const chapters = script.chapters ?? [];
    const stock = chapters.filter((/** @type {any} */ c) => !c.plate);
    if (chapters.length && stock.length > chapters.length / 2) out.push(`${stock.length} of ${chapters.length} chapters use a stock backdrop: give each chapter its own "plate" (a photo or clip from this episode)`);
    const plates = chapters.map((/** @type {any} */ c) => c.plate).filter(Boolean);
    if (new Set(plates).size < plates.length) out.push('two chapters share a plate: use a different photo or clip for each');
  }
  return out;
}

/** The table `shorts designs` prints. */
/** @param {string} data the channel folder */
export async function report(data) {
  const scripts = await allScripts(data);
  const inv = await inventory();
  const use = usage(scripts, inv);
  const lines = [`design ledger: ${scripts.length} videos (#${scripts[0]?.episode ?? '-'}–#${scripts[scripts.length - 1]?.episode ?? '-'}). Pick from the top of each list.`];
  for (const [cat, rows] of Object.entries(use)) {
    const never = rows.filter((r) => r.uses === 0).map((r) => r.name);
    const used = rows.filter((r) => r.uses > 0);
    lines.push('', `${cat.toUpperCase()}  (${rows.length} designs, ${never.length} never used)`);
    if (never.length) lines.push(`  never used:  ${never.join(', ')}`);
    lines.push(`  longest ago: ${used.slice(0, 6).map((r) => `${r.name} (#${r.last}, ${r.uses}×)`).join(', ')}`);
    lines.push(`  overused:    ${[...used].sort((a, b) => b.uses - a.uses).slice(0, 4).map((r) => `${r.name} (${r.uses}×)`).join(', ')}`);
  }
  return lines.join('\n');
}
