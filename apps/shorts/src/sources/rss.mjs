// A feed as a story finder: RSS 2.0 or Atom. Any site's news feed, a
// subreddit's public feed, a YouTube channel's feed. Feeds carry no score, so
// their stories rank by how new they are. No dependency: the two formats are
// regular enough to read the handful of fields needed.

/** @typedef {import('../types.mjs').Candidate} Candidate */
/** @typedef {import('../types.mjs').Source} Source */

const decode = (/** @type {string} */ s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    // last, so "&amp;lt;" (an escaped "&lt;") is not decoded twice
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (/** @type {string} */ xml, /** @type {string} */ name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? decode(m[1]) : '';
};

/**
 * Items of an RSS 2.0 or Atom document.
 * @param {string} xml @returns {{title: string, link: string, date: string, text: string}[]}
 */
export function parseFeed(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return blocks
    .map((b) => {
      // Atom: <link href="…"/> (prefer rel="alternate"); RSS: <link>…</link>
      const hrefs = [...b.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
      const atom = hrefs.find((a) => /rel=["']alternate["']/.test(a)) ?? hrefs.find((a) => /href=/.test(a) && !/rel=["'](self|enclosure)["']/.test(a));
      // an RSS item may carry its address only as a permalink guid
      const guid = /<guid\b[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i.exec(b)?.[1];
      const link = atom ? (/href=["']([^"']+)["']/.exec(atom)?.[1] ?? '') : tag(b, 'link') || (guid ? decode(guid) : '');
      const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
      return {title: tag(b, 'title'), link: decode(link), date: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : '', text: (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 600)};
    })
    .filter((i) => i.title && /^https?:\/\//.test(i.link));
}

/**
 * @param {{url: string, label?: string, fetchText: (url: string) => Promise<string>}} o  label: shown as "via <label>" (default: the feed's host)
 * @returns {Source}
 */
export function createRss({url, label, fetchText}) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return {
    name: `rss:${host}`,
    async fetch({now, lookbackHours}) {
      const since = now.getTime() - lookbackHours * 3600e3;
      // An item with no date we can read is ranked as the oldest the window allows: as "now" it would top every shortlist.
      const undated = new Date(since).toISOString();
      return parseFeed(await fetchText(url))
        .filter((i) => !i.date || new Date(i.date).getTime() >= since)
        .map((i) => /** @type {Candidate} */ ({source: 'rss', id: `rss:${i.link}`, title: i.title, url: i.link, sourceUrl: i.link, sourceLabel: label ?? host, score: 0, comments: 0, postedAt: i.date || undated, text: i.text, tags: []}));
    },
  };
}
