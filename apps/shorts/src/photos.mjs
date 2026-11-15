// Real-world photos for `photo` scenes, hooks and thumbnails, from free
// sources that need no API key: Openverse (CC photos from Flickr and others)
// and Wikimedia Commons (people, places, hardware, logos). Only licenses that
// allow commercial use and adaptation pass (CC0, PD, CC BY, CC BY-SA); every
// file used is credited in photo-credits.txt, which the upload appends to
// the description. Pinterest and Google Images are not sources: most of their
// images are re-posts the uploader holds no rights to.
import fs from 'node:fs/promises';
import path from 'node:path';
import {allowsCommercialUse, licenseFields} from '@motionhaus/audio-lib/licenses.mjs';

const TIMEOUT_MS = 20_000; // Openverse can hang; Commons still answers
// Identifies the tool, never the channel or its owner (photo sources log this).
const UA = 'Motionhaus/0.3 (video studio; licensed-photo search)';

/**
 * @typedef {object} PhotoResult
 * @property {string} id          "openverse:<uuid>" | "commons:<pageid>"
 * @property {string} title
 * @property {string} creator
 * @property {string | null} sourceUrl   page to credit
 * @property {string} downloadUrl
 * @property {number} width
 * @property {number} height
 * @property {string} license
 * @property {string} attributionText
 * @property {boolean} allowsCommercialUse
 */

const stripHtml = (/** @type {string} */ s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** @param {any} r @returns {PhotoResult} */
export function fromOpenverse(r) {
  const meta = {title: String(r.title ?? 'Untitled'), creator: String(r.creator ?? 'Unknown'), sourceUrl: r.foreign_landing_url ?? null};
  const lic = licenseFields(meta, r.license, r.license_version ?? null, r.license_url ?? null);
  return {id: `openverse:${r.id}`, ...meta, downloadUrl: r.url, width: r.width ?? 0, height: r.height ?? 0, license: lic.license, attributionText: lic.attributionText, allowsCommercialUse: lic.allowsCommercialUse};
}

/** @param {any} page  a Commons API page with imageinfo @returns {PhotoResult | null} */
export function fromCommons(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  const meta = {
    title: stripHtml(m.ObjectName?.value ?? String(page.title ?? '').replace(/^File:/, '').replace(/\.\w+$/, '')),
    creator: /unknown/i.test(stripHtml(m.Artist?.value ?? '')) ? 'Unknown author' : stripHtml(m.Artist?.value ?? '') || 'Unknown author',
    sourceUrl: info.descriptionurl ?? null,
  };
  const lic = licenseFields(meta, m.LicenseShortName?.value ?? m.License?.value ?? null, null, m.LicenseUrl?.value ?? null);
  return {
    id: `commons:${page.pageid}`,
    ...meta,
    downloadUrl: info.thumburl ?? info.url,
    width: info.thumbwidth ?? info.width ?? 0,
    height: info.thumbheight ?? info.height ?? 0,
    license: lic.license,
    attributionText: lic.attributionText,
    allowsCommercialUse: lic.allowsCommercialUse,
  };
}

/**
 * Search both sources; returns commercially safe results, largest first.
 * @param {string} query
 * @param {{source?: 'openverse' | 'commons' | 'all', orient?: 'wide' | 'tall' | 'any', limit?: number, fetch?: typeof fetch}} [o]
 * @returns {Promise<PhotoResult[]>}
 */
export async function searchPhotos(query, {source = 'all', orient = 'any', limit = 20, fetch: f = fetch} = {}) {
  /** @type {PhotoResult[]} */
  const out = [];
  const get = async (/** @type {string} */ url) => {
    const res = await f(url, {headers: {'user-agent': UA}, signal: AbortSignal.timeout(TIMEOUT_MS)});
    if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status}`);
    return res.json();
  };
  const tasks = [];
  if (source !== 'commons') {
    const p = new URLSearchParams({q: query.slice(0, 200), license: 'cc0,pdm,by,by-sa', mature: 'false', size: 'large', page_size: String(Math.min(limit, 20))});
    if (orient !== 'any') p.set('aspect_ratio', orient);
    tasks.push(get(`https://api.openverse.org/v1/images/?${p}`).then((j) => out.push(...(j.results ?? []).map(fromOpenverse))));
  }
  if (source !== 'openverse') {
    const p = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(Math.min(limit, 20)),
      prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2000', origin: '*',
    });
    tasks.push(get(`https://commons.wikimedia.org/w/api.php?${p}`).then((j) => out.push(...Object.values(j.query?.pages ?? {}).map(fromCommons).filter((x) => x !== null))));
  }
  const settled = await Promise.allSettled(tasks);
  const failed = settled.filter((s) => s.status === 'rejected');
  if (failed.length === settled.length) throw /** @type {PromiseRejectedResult} */ (failed[0]).reason;
  return out
    .filter((r) => r.allowsCommercialUse && allowsCommercialUse(/** @type {any} */ (r.license)) && r.downloadUrl)
    .filter((r) => orient === 'any' || (orient === 'wide' ? r.width >= r.height : r.height >= r.width))
    .filter((r) => Math.max(r.width, r.height) >= 1000)
    .sort((a, b) => b.width * b.height - a.width * a.height);
}

/** One short on-screen credit: "Photo: Jane Doe / CC BY". @param {PhotoResult} r */
export const shortCredit = (r) => `Photo: ${r.creator.slice(0, 40)} / ${r.license === 'PD' ? 'public domain' : r.license.replace('CC-BY', 'CC BY')}`;

/**
 * Compact credit list for a YouTube description (5,000-character limit): one
 * line per photo with creator, licence and a short link (Commons ?curid=).
 * @param {{id: string, creator: string, sourceUrl: string | null, attributionText: string}[]} entries
 */
export const creditsText = (entries) =>
  entries.length
    ? ['Photos:', ...[...new Map(entries.map((e) => [e.id, e])).values()].map((e) => `- ${e.creator.slice(0, 50)}, ${licenseOf(e.attributionText)}: ${shortLink(e)}`)].join('\n')
    : '';

/** "CC BY-SA 4.0" / "CC0" / "public domain" from an attribution line. @param {string} a */
const licenseOf = (a) => a.match(/licensed under (CC [A-Z-]+(?: [\d.]+)?)/)?.[1] ?? (/CC0/.test(a) ? 'CC0' : /public domain/i.test(a) ? 'public domain' : 'see source');

/** @param {{id: string, sourceUrl: string | null}} e */
const shortLink = (e) => (e.id.startsWith('commons:') ? `https://commons.wikimedia.org/?curid=${e.id.slice(8)}` : e.sourceUrl ?? '');

/**
 * Download the top `n` results into <dir>/public/photos and record them in
 * photos.json + photo-credits.txt (merged with earlier fetches).
 * @param {string} dir  episode folder
 * @param {string} query
 * @param {{n?: number, source?: 'openverse' | 'commons' | 'all', orient?: 'wide' | 'tall' | 'any', fetch?: typeof fetch}} [o]
 */
export async function fetchPhotos(dir, query, {n = 4, fetch: f = fetch, ...o} = {}) {
  let results = await searchPhotos(query, {...o, fetch: f});
  // Commons matches every word: a long query often finds nothing, so retry with the first two
  const short = query.split(/\s+/).slice(0, 2).join(' ');
  if (!results.length && short !== query) results = await searchPhotos(short, {...o, fetch: f});
  const photosDir = path.join(dir, 'public', 'photos');
  await fs.mkdir(photosDir, {recursive: true});
  const manifestFile = path.join(dir, 'photos.json');
  /** @type {(PhotoResult & {file: string, query: string, credit: string})[]} */
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8').catch(() => '[]'));
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'photo';
  const got = [];
  for (const r of results) {
    if (got.length >= n) break;
    if (manifest.some((m) => m.id === r.id)) continue;
    try {
      const res = await f(r.downloadUrl, {headers: {'user-agent': UA}, signal: AbortSignal.timeout(TIMEOUT_MS * 2)});
      if (!res.ok) continue;
      const type = res.headers.get('content-type') ?? '';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const file = `photos/${slug}-${manifest.length + 1}.${ext}`;
      await fs.writeFile(path.join(dir, 'public', file), Buffer.from(await res.arrayBuffer()));
      const entry = {...r, file, query, credit: shortCredit(r)};
      manifest.push(entry);
      got.push(entry);
    } catch {
      // a dead link: try the next result
    }
  }
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(dir, 'photo-credits.txt'), creditsText(manifest) + '\n');
  return got;
}

/**
 * Credits for the photos the script actually uses (scenes and thumbnails),
 * so the description doesn't credit rejected downloads.
 * @param {string} dir
 */
export async function usedPhotoCredits(dir) {
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'photos.json'), 'utf8').catch(() => '[]'));
  const script = await fs.readFile(path.join(dir, 'script.json'), 'utf8').catch(() => '');
  return creditsText(manifest.filter((/** @type {{file: string}} */ m) => script.includes(m.file)));
}
