// What a channel is about, as settings: which checks apply (`rules`), the
// words that go out with every video (`publish`), and how its stories are
// found and told apart (`stories`). All three live in channel.json.
//
// Every default here is what the pipeline did when it only made videos about
// product launches, so a channel.json written before these blocks existed
// behaves exactly as it did. The templates in apps/shorts/templates set them
// for other kinds of channel.

/**
 * @typedef {object} Rules  which `shorts make` checks apply; a rule that is off prints nothing
 * @property {boolean} titleAnchor        the YouTube title leads with a name from `anchors`
 * @property {boolean} subjectInFrame0    scene 1 shows the subject (an image or clip), not typed words
 * @property {boolean} brightFrame0       frame 0 is not dark
 * @property {boolean} shortFirstSentence the first sentence is short and is not a run-up
 * @property {[number, number]} scenes    how many scenes
 * @property {[number, number]} words     how many spoken words, outro included
 * @property {boolean} endsOnQuestion     the last scene and the pinned comment ask a question
 * @property {boolean} shortsTag          no "#shorts" in the title (it belongs in the description)
 * @property {boolean} instagramBlock     the script has its `instagram` block (channels with Instagram only)
 * @property {string[]} broadHashtags     tags too broad to help a small channel
 * @property {boolean} sourcesRequired    every claim in `sources` names a link
 * @property {boolean} badgeSource        a badge with {source} has a `sourceLabel` to show
 */

/** @type {Rules} */
export const DEFAULT_RULES = {
  titleAnchor: true,
  subjectInFrame0: true,
  brightFrame0: true,
  shortFirstSentence: true,
  scenes: [5, 7],
  words: [62, 84],
  endsOnQuestion: true,
  shortsTag: true,
  instagramBlock: true,
  broadHashtags: ['#ai', '#claude', '#tech', '#reels', '#github'],
  sourcesRequired: false,
  badgeSource: true,
};

/**
 * @typedef {object} Publish  the text published with every video
 * @property {string} badge       the on-screen series line; {n} episode number, {source} where the story was found
 * @property {string} outro       the usual end-card line
 * @property {string} shareOutro  the Instagram cut's end card
 * @property {{own: string, direct: string, via: string}} credit  caption credit: the channel's own project; found on its own page; found via {source}
 * @property {{categoryId: string, language: string}} youtube
 * @property {boolean} listSources  append the script's source links to the YouTube description
 * @property {string[]} kitNotes   extra checklist lines for this channel's upload kits
 */

/** @type {Publish} */
export const DEFAULT_PUBLISH = {
  badge: '#{n} · via {source}',
  outro: "Follow for tomorrow's launch",
  shareOutro: 'Send this to a dev who needs it',
  credit: {
    own: 'Made by the creator of this account.',
    direct: "Not affiliated, featured because it's a new launch.",
    via: "Found via {source}. Not affiliated, featured because it's trending.",
  },
  youtube: {categoryId: '28', language: 'en'},
  listSources: false,
  kitNotes: [],
};

/**
 * @typedef {object} Stories
 * @property {'product' | 'story'} identity  what makes two stories "the same": the same product (link, site or name), or the same story (link or key)
 * @property {{type: string, [k: string]: any}[]} feeds  finders run by `shorts run`
 * @property {boolean} search  the maker may also find stories by web search inside the brief
 * @property {string[]} banned  patterns (regular expressions, whole words, case-insensitive) a story is dropped for
 */

/** @type {Stories} */
export const DEFAULT_STORIES = {
  identity: 'product',
  feeds: [{type: 'hn'}, {type: 'github'}],
  search: true,
  banned: ['crypto|memecoin|airdrop|nft|web3|defi|token sale|presale|ico', 'casino|betting|gambl\\w*|sportsbook', 'porn\\w*|nsfw|onlyfans|adult content|escort', 'get rich|make money (fast|online)|passive income|forex|signals group'],
};

/** @param {any} series channel.json @returns {Rules} */
export const rulesOf = (series) => ({...DEFAULT_RULES, ...(series?.rules ?? {})});

/** @param {any} series @returns {Publish} */
export function publishOf(series) {
  const p = series?.publish ?? {};
  return {...DEFAULT_PUBLISH, ...p, credit: {...DEFAULT_PUBLISH.credit, ...(p.credit ?? {})}, youtube: {...DEFAULT_PUBLISH.youtube, ...(p.youtube ?? {})}};
}

/** @param {any} series @returns {Stories} */
export const storiesOf = (series) => ({...DEFAULT_STORIES, ...(series?.stories ?? {})});

/** A channel posts to Instagram only if it names an Instagram handle. @param {any} series */
export const hasInstagram = (series) => typeof series?.instagram?.handle === 'string' && series.instagram.handle.trim() !== '';

/**
 * Fills {n}, {source}, {name} in a template. A placeholder with no value is
 * dropped together with the separator and joining words before it, so
 * "#{n} · via {source}" without a source is "#042", not "#042 · via ". At the
 * start of the template it takes the separator after it instead:
 * "{source} · #{n}" is "#042". Values go in as written ("$&" stays "$&").
 * @param {string} template @param {Record<string, string | number | null | undefined>} values
 */
export function fill(template, values) {
  const SEP = '\\s*[·|,:\\-–—]\\s*';
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    const has = v !== undefined && v !== null && String(v).trim() !== '';
    if (has) {
      out = out.replaceAll(`{${k}}`, () => String(v));
      continue;
    }
    out = out.replace(new RegExp(`^\\s*([\\p{L}]+\\s+)?\\{${k}\\}(${SEP})?`, 'u'), () => '');
    out = out.replace(new RegExp(`(${SEP})?([\\p{L}]+\\s+)?\\{${k}\\}`, 'gu'), () => '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** What is wrong with the three blocks in a channel.json. @param {any} c @returns {string[]} */
export function validateSettings(c) {
  const errs = [];
  const pair = (/** @type {any} */ v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number') && v[0] <= v[1];
  const r = c?.rules;
  if (r !== undefined) {
    for (const k of Object.keys(r)) if (!(k in DEFAULT_RULES)) errs.push(`rules.${k} is not a rule (rules: ${Object.keys(DEFAULT_RULES).join(', ')})`);
    for (const k of /** @type {const} */ (['scenes', 'words'])) if (r[k] !== undefined && !pair(r[k])) errs.push(`rules.${k} must be [min, max]`);
    if (r.broadHashtags !== undefined && !Array.isArray(r.broadHashtags)) errs.push('rules.broadHashtags must be a list');
    // "false" as text is truthy: the rule would quietly stay on
    for (const [k, d] of Object.entries(DEFAULT_RULES)) if (typeof d === 'boolean' && r[k] !== undefined && typeof r[k] !== 'boolean') errs.push(`rules.${k} must be true or false`);
  }
  const s = c?.stories;
  if (s !== undefined) {
    if (s.identity !== undefined && !['product', 'story'].includes(s.identity)) errs.push('stories.identity must be "product" or "story"');
    if (s.feeds !== undefined && !(Array.isArray(s.feeds) && s.feeds.every((/** @type {any} */ f) => typeof f?.type === 'string'))) errs.push('stories.feeds must be a list of {type, …}');
    for (const pattern of s.banned ?? []) {
      try {
        new RegExp(pattern);
      } catch {
        errs.push(`stories.banned has a broken pattern: ${pattern}`);
      }
    }
  }
  const p = c?.publish;
  if (p !== undefined) {
    for (const k of /** @type {const} */ (['badge', 'outro', 'shareOutro'])) if (p[k] !== undefined && typeof p[k] !== 'string') errs.push(`publish.${k} must be text`);
    if (p.kitNotes !== undefined && !Array.isArray(p.kitNotes)) errs.push('publish.kitNotes must be a list');
  }
  return errs;
}
