// `shorts channel new|list|default`: making and listing channels. (Moving an
// install from before channels existed is migrate.mjs.)
import fs from 'node:fs/promises';
import path from 'node:path';
import {publishOf, rulesOf, storiesOf} from './channel-settings.mjs';
import {channelDir, isSlug, listChannels, loadChannelEnv, needsMigration, readDefault, secretsFile, writeDefault} from './channels.mjs';

export const TEMPLATES = ['launches', 'news-explainer', 'facts-lists', 'how-to'];

/**
 * Creates a channel folder from a template (apps/shorts/templates/<name>:
 * channel.json, brief.md, a placeholder mark, an empty blocklist), with its
 * own (empty) logins and both upload modes manual. The first channel becomes
 * the default.
 * @param {{data: string, config: string, slug: string, name?: string, template?: string, templatesDir: string}} o
 * @returns {Promise<{dir: string, secrets: string, template: string, next: string[]}>}
 */
export async function createChannel({data, config, slug, name, template = 'launches', templatesDir}) {
  if (!isSlug(slug)) throw new Error(`"${slug}" is not a valid channel name: use lowercase letters, digits and dashes (for example "ai-tools-daily")`);
  if (!TEMPLATES.includes(template)) throw new Error(`no template "${template}" (templates: ${TEMPLATES.join(', ')})`);
  const dir = channelDir(data, slug);
  if (await fs.stat(dir).then(() => true, () => false)) throw new Error(`channel "${slug}" already exists at ${dir}`);
  // On an install from before channels, a new channel would become the
  // default and the existing timers would quietly start acting on it.
  if (await needsMigration(data)) throw new Error('this install has files from before channels existed: run `shorts channel migrate` first, then create the new channel');
  const secrets = secretsFile(slug, config);
  // A login file left over from a deleted channel of the same name must not
  // sign the new channel in as that old account.
  if (await fs.stat(secrets).then(() => true, () => false)) throw new Error(`a login file for "${slug}" already exists (${secrets}), left from an earlier channel of that name: delete it or pick another name`);
  const first = (await listChannels(data)).length === 0;

  const from = path.join(templatesDir, template);
  const channel = {...JSON.parse(await fs.readFile(path.join(from, 'channel.json'), 'utf8')), name: name?.trim() || slug};
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(path.join(dir, 'channel.json'), JSON.stringify(channel, null, 2) + '\n');
  for (const f of ['brand', 'brief.md', 'blocklist.txt']) await fs.cp(path.join(from, f), path.join(dir, f), {recursive: true});

  await fs.mkdir(path.dirname(secrets), {recursive: true, mode: 0o700});
  await fs.writeFile(secrets, `# Logins and switches for the "${slug}" channel only. Written by \`shorts auth\` and \`shorts insta-auth\`.\nYOUTUBE_UPLOAD_MODE=manual\nINSTAGRAM_UPLOAD_MODE=manual\n`, {mode: 0o600, flag: 'wx'});
  if (first) await writeDefault(data, slug);

  return {
    dir,
    secrets,
    template,
    next: [
      `write the brief: ${path.join(dir, 'brief.md')} (fill in the parts in italics: what the channel covers, who watches, what is off limits)`,
      `edit ${path.join(dir, 'channel.json')}: handle (YouTube) and instagram.handle if it has those accounts, instagram.hashtags, colors, voice${template === 'launches' ? ', anchors' : ''}${template === 'news-explainer' ? ', and add your feeds under stories.feeds' : ''}`,
      `replace ${path.join(dir, 'brand', 'mark.svg')} with this channel's own mark`,
      `sign in when the accounts exist: shorts --channel ${slug} insta-auth   and   shorts --channel ${slug} auth`,
      `logins and upload modes for this channel live in ${secrets}`,
    ],
  };
}

/**
 * Brings a channel made before briefs and templates up to date, changing
 * nothing about how it behaves: writes the `template`, `stories`, `rules` and
 * `publish` blocks with the values the defaults already give it, a brief.md
 * (the launches brief, with `learned` as its last section) if it has none,
 * and a `key` for every ledger entry. Safe to run again; never overwrites a
 * brief's own words: `learned` fills section 11 of an existing brief only
 * while it still holds the template's placeholder.
 * @param {{dir: string, templatesDir: string, learned?: string, kitNotes?: string[], dryRun?: boolean}} o
 *   learned: text for "What this channel has learned"; kitNotes: lines for publish.kitNotes, written only if that list is empty
 * @returns {Promise<{changes: string[]}>}
 */
export async function upgradeChannel({dir, templatesDir, learned, kitNotes, dryRun = false}) {
  const changes = [];
  const file = path.join(dir, 'channel.json');
  const c = JSON.parse(await fs.readFile(file, 'utf8'));
  const add = {};
  if (c.template === undefined) add.template = 'launches';
  if (c.stories === undefined) add.stories = storiesOf(c);
  if (c.rules === undefined) add.rules = rulesOf(c);
  if (c.publish === undefined) add.publish = publishOf(c);
  if (Object.keys(add).length) changes.push(`channel.json: add ${Object.keys(add).join(', ')} (today's values, nothing changes)`);
  const next = {...c, ...add};
  const notes = (kitNotes ?? []).map((n) => n.trim()).filter(Boolean);
  if (notes.length && !(Array.isArray(next.publish?.kitNotes) && next.publish.kitNotes.length)) {
    next.publish = {...next.publish, kitNotes: notes};
    changes.push(`channel.json: publish.kitNotes set to ${notes.length} note${notes.length === 1 ? '' : 's'} for the upload kits`);
  }
  if (changes.length && !dryRun) await fs.writeFile(file, JSON.stringify(next, null, 2) + '\n');

  const brief = path.join(dir, 'brief.md');
  const section11 = /(## 11\. What this channel has learned\n)([\s\S]*)$/;
  // a function, not a string: "$1" or "$&" in the lessons must go in as written
  const withLessons = (/** @type {string} */ text) => text.replace(section11, (_, head) => `${head}\n${/** @type {string} */ (learned).trim()}\n`);
  const existing = await fs.readFile(brief, 'utf8').catch(() => null);
  if (existing === null) {
    let text = await fs.readFile(path.join(templatesDir, c.template ?? 'launches', 'brief.md'), 'utf8');
    if (learned?.trim()) text = withLessons(text);
    changes.push(`brief.md: written from the ${c.template ?? 'launches'} template${learned?.trim() ? ', with this channel\'s own lessons as section 11' : ''}`);
    if (!dryRun) await fs.writeFile(brief, text);
  } else if (learned?.trim()) {
    const body = section11.exec(existing)?.[2].trim();
    // Only the template's placeholder may be replaced: anything else is the owner's own writing.
    if (body === undefined || !/^\*Your own numbers go here[^\n]*\*$/.test(body)) throw new Error('brief.md already has its own section 11: add the lessons by hand');
    changes.push('brief.md: section 11 filled with this channel\'s own lessons (it held only the placeholder)');
    if (!dryRun) await fs.writeFile(brief, withLessons(existing));
  }

  const ledgerFile = path.join(dir, 'ledger.json');
  const ledger = await fs.readFile(ledgerFile, 'utf8').then(JSON.parse, () => null);
  if (Array.isArray(ledger?.entries)) {
    const slug = (/** @type {string} */ t) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'story';
    const missing = ledger.entries.filter((/** @type {any} */ e) => typeof e.key !== 'string');
    for (const e of missing) e.key = isSlug(e.sourceId) ? e.sourceId : slug(String(e.sourceId || e.title));
    if (missing.length) {
      changes.push(`ledger.json: give ${missing.length} entries a story key`);
      if (!dryRun) {
        const tmp = `${ledgerFile}.tmp-${process.pid}`;
        await fs.writeFile(tmp, JSON.stringify(ledger, null, 2) + '\n');
        await fs.rename(tmp, ledgerFile);
      }
    }
  }
  return {changes};
}

/**
 * One row per channel, for `channel list` and `autopilot status --all`.
 * @param {{data: string, config: string, loaded?: (slug: string) => Promise<{poster: boolean, maker: boolean}>}} o
 */
export async function describeChannels({data, config, loaded}) {
  const def = await readDefault(data);
  const rows = [];
  for (const slug of await listChannels(data)) {
    const c = await fs.readFile(path.join(channelDir(data, slug), 'channel.json'), 'utf8').then(JSON.parse, () => ({}));
    const env = loadChannelEnv(slug, {config, rootEnv: {}, processEnv: {}}).values;
    rows.push({
      slug,
      name: String(c.name ?? ''),
      youtube: String(c.handle ?? ''),
      instagram: String(c.instagram?.handle ?? ''),
      instagramMode: env.INSTAGRAM_UPLOAD_MODE === 'auto' ? 'auto' : 'manual',
      instagramSignedIn: !!env.INSTAGRAM_PAGE_TOKEN,
      youtubeSignedIn: !!env.YOUTUBE_REFRESH_TOKEN,
      isDefault: slug === def,
      timers: loaded ? await loaded(slug) : null,
    });
  }
  return rows;
}

/** @param {Awaited<ReturnType<typeof describeChannels>>} rows */
export function formatChannels(rows) {
  if (!rows.length) return 'no channels yet: run `shorts channel new <slug>`';
  return rows
    .map((r) => {
      const ig = r.instagram ? `Instagram ${r.instagram} (${r.instagramSignedIn ? `signed in, ${r.instagramMode}` : 'not signed in'})` : 'no Instagram';
      const yt = r.youtube ? `YouTube ${r.youtube} (${r.youtubeSignedIn ? 'signed in' : 'not signed in'})` : 'no YouTube';
      const t = r.timers ? ` · timers: ${[r.timers.poster && 'poster', r.timers.maker && 'maker'].filter(Boolean).join(' + ') || 'none'}` : '';
      return `${r.isDefault ? '*' : ' '} ${r.slug.padEnd(18)} ${r.name} · ${ig} · ${yt}${t}`;
    })
    .join('\n');
}
