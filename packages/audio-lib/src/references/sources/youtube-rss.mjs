// YouTube channel RSS (no key): the latest ~15 uploads of each channel in
// channels.yaml, filtered locally by the query. Feeds have no duration.
import fs from 'node:fs/promises';
import {isoOrNull, matchScore, tokens, truncate} from '../util.mjs';
import {parseYamlList} from '../yaml.mjs';

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */

const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

/** @param {string} s */
const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

/** @param {string} xml @param {string} t */
const tag = (xml, t) => {
  const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`));
  return m ? unescapeXml(m[1].trim()) : null;
};

/**
 * Parse a YouTube Atom feed. Tolerant: entries missing a video id are skipped.
 * @param {string} xml
 * @returns {Reference[]}
 */
export function parseFeed(xml) {
  /** @type {Reference[]} */
  const out = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = tag(e, 'yt:videoId');
    if (!id) continue;
    const views = e.match(/<media:statistics\s+views="(\d+)"/);
    out.push({
      id: `youtube-rss:${id}`,
      source: 'youtube-rss',
      title: tag(e, 'title') ?? id,
      creator: tag(tag(e, 'author') ?? '', 'name') ?? 'Unknown',
      url: `https://www.youtube.com/watch?v=${id}`,
      publishedAt: isoOrNull(tag(e, 'published')),
      durationSec: null,
      ...(views ? {viewCount: Number(views[1])} : {}),
      description: tag(e, 'media:description') ?? '',
      tags: [],
    });
  }
  return out;
}

/**
 * @param {{channelsFile: string, http: import('../../http.mjs').Http, cache: ReturnType<typeof import('../../cache.mjs').createJsonCache>, log: (m: string) => void}} o
 */
export function createYoutubeRss({channelsFile, http, cache, log}) {
  /** @returns {Promise<{name: string, channelId: string}[]>} */
  async function channels() {
    try {
      return parseYamlList(await fs.readFile(channelsFile, 'utf8'))
        .filter((c) => typeof c.channelId === 'string')
        .map((c) => ({name: String(c.name ?? c.channelId), channelId: String(c.channelId)}));
    } catch (err) {
      log(`youtube-rss: can't read ${channelsFile} (${/** @type {Error} */ (err).message})`);
      return [];
    }
  }

  /** All entries from all feeds; each feed cached for the search TTL. @returns {Promise<Reference[]>} */
  async function entries() {
    const all = await Promise.all(
      (await channels()).map(async (c) => {
        const key = `rss-${c.channelId}`;
        /** @type {Reference[] | undefined} */
        const hit = await cache.get(key);
        if (hit) return hit;
        try {
          const res = await http.request(FEED + encodeURIComponent(c.channelId), {headers: {accept: 'application/atom+xml'}});
          const parsed = parseFeed(await res.text());
          await cache.set(key, parsed);
          return parsed;
        } catch (err) {
          log(`youtube-rss: ${c.name} feed failed (${/** @type {Error} */ (err).message})`);
          return [];
        }
      }),
    );
    return all.flat();
  }

  /** @type {RefSource & {entries: typeof entries}} */
  const src = {
    name: 'youtube-rss',
    enabled: true,
    entries,
    async search(opts) {
      const q = tokens([opts.query, opts.category ?? ''].join(' '));
      const scored = (await entries())
        .map((r) => ({r, score: matchScore(q, `${r.title} ${r.creator} ${r.description}`)}))
        .filter((x) => q.length === 0 || x.score > 0)
        .sort((a, b) => b.score - a.score || String(b.r.publishedAt).localeCompare(String(a.r.publishedAt)));
      return scored.slice(0, opts.limit).map((x) => ({...x.r, description: truncate(x.r.description, 400)}));
    },
  };
  return src;
}
