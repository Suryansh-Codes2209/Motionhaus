// Local packs: pre-downloaded audio packs (e.g. Kenney, OpenGameArt) in
// assets/audio-packs/<pack>/... Works fully offline. The index is built from
// folder and file names. Each pack's license comes from an optional pack.json
// ({"license", "creator", "sourceUrl", "type"}) or else its LICENSE/License.txt;
// a pack whose license can't be determined unambiguously is 'unknown'.
import fs from 'node:fs/promises';
import path from 'node:path';
import {licenseFields, normalizeLicense} from '../licenses.mjs';

const AUDIO_EXT = new Set(['.wav', '.ogg', '.mp3', '.flac', '.m4a', '.aac', '.opus']);
const LICENSE_FILES = /^(licen[cs]e|copying|readme)(\.(txt|md))?$/i;
const MUSIC_HINT = /\b(music|bgm|songs?|soundtracks?|themes?|loops?)\b/i;

/** @typedef {import('../types.mjs').Provider} Provider */
/** @typedef {import('../types.mjs').AudioResult} AudioResult */
/** @typedef {import('../types.mjs').AudioType} AudioType */

/**
 * @typedef {object} PackInfo
 * @property {string} name
 * @property {string | null} license      raw license string for normalizeLicense
 * @property {string} creator
 * @property {string | null} sourceUrl
 * @property {AudioType | null} type
 */

/**
 * Find exactly one license in free text (a pack's license/readme file).
 * Several different licenses mentioned → 'unknown' (fail closed).
 * @param {string} text
 * @returns {string | null}
 */
export function detectLicenseInText(text) {
  /** @type {Set<string>} */
  const found = new Set();
  for (const m of text.matchAll(/creativecommons\.org\/(?:licenses|publicdomain)\/[a-z-]+\/?[\d.]*/gi)) {
    found.add(normalizeLicense(m[0]).license);
  }
  for (const m of text.matchAll(/\b(CC0|CC[ -]BY(?:[ -](?:NC|SA|ND))*(?: \d\.\d)?|Creative Commons Zero|public domain)\b/gi)) {
    found.add(normalizeLicense(m[0]).license);
  }
  found.delete('unknown');
  // "CC0 … public domain" is one dedication, not two licenses.
  if (found.has('CC0')) found.delete('PD');
  if (found.size !== 1) return null;
  return [...found][0];
}

/** @param {string} packDir @param {string} name @returns {Promise<PackInfo>} */
async function readPackInfo(packDir, name) {
  /** @type {PackInfo} */
  const info = {name, license: null, creator: name, sourceUrl: null, type: null};
  try {
    const j = JSON.parse(await fs.readFile(path.join(packDir, 'pack.json'), 'utf8'));
    return {
      name,
      license: typeof j.license === 'string' ? j.license : null,
      creator: typeof j.creator === 'string' ? j.creator : name,
      sourceUrl: typeof j.sourceUrl === 'string' ? j.sourceUrl : null,
      type: j.type === 'music' || j.type === 'sfx' ? j.type : null,
    };
  } catch {}
  /** @type {string[]} */
  let entries = [];
  try {
    entries = await fs.readdir(packDir);
  } catch {
    return info;
  }
  for (const f of entries.filter((e) => LICENSE_FILES.test(e)).sort()) {
    const text = await fs.readFile(path.join(packDir, f), 'utf8').catch(() => '');
    const lic = detectLicenseInText(text);
    if (lic) {
      info.license = lic;
      if (/kenney/i.test(text)) {
        info.creator = 'Kenney';
        info.sourceUrl = 'https://kenney.nl';
      }
      break;
    }
  }
  return info;
}

/** @param {string} s */
const tokens = (s) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** @param {string} dir @param {string} root @returns {AsyncGenerator<string>} */
async function* walk(dir, root) {
  let entries;
  try {
    entries = await fs.readdir(dir, {withFileTypes: true});
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full, root);
    else if (e.isFile() && AUDIO_EXT.has(path.extname(e.name).toLowerCase())) yield path.relative(root, full);
  }
}

/** Duration from a WAV header; null for other formats. @param {string} file */
export async function wavDurationSec(file) {
  if (path.extname(file).toLowerCase() !== '.wav') return null;
  let fh;
  try {
    fh = await fs.open(file, 'r');
    const buf = Buffer.alloc(4096);
    const {bytesRead} = await fh.read(buf, 0, buf.length, 0);
    if (bytesRead < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
    let off = 12;
    let byteRate = 0;
    while (off + 8 <= bytesRead) {
      const id = buf.toString('ascii', off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === 'fmt ' && off + 16 <= bytesRead) byteRate = buf.readUInt32LE(off + 16);
      if (id === 'data') return byteRate ? Math.round((size / byteRate) * 10) / 10 : null;
      off += 8 + size + (size % 2);
    }
    return null;
  } catch {
    return null;
  } finally {
    await fh?.close();
  }
}

/**
 * @typedef {object} IndexEntry
 * @property {string} rel      path relative to packsDir
 * @property {PackInfo} pack
 * @property {string[]} words
 * @property {AudioType} type
 */

/**
 * @param {{packsDir: string}} ctx
 * @returns {Provider & {buildIndex: () => Promise<IndexEntry[]>}}
 */
export function createLocalPacks({packsDir}) {
  /** @type {{at: number, entries: IndexEntry[]} | null} */
  let index = null;

  async function buildIndex() {
    if (index && Date.now() - index.at < 60_000) return index.entries;
    /** @type {IndexEntry[]} */
    const entries = [];
    /** @type {import('node:fs').Dirent[]} */
    let packs = [];
    try {
      packs = (await fs.readdir(packsDir, {withFileTypes: true})).filter((d) => d.isDirectory() && !d.name.startsWith('.'));
    } catch {
      packs = [];
    }
    for (const d of packs) {
      const packDir = path.join(packsDir, d.name);
      const pack = await readPackInfo(packDir, d.name);
      for await (const rel of walk(packDir, packsDir)) {
        const noExt = rel.slice(0, -path.extname(rel).length);
        entries.push({
          rel,
          pack,
          words: tokens(noExt),
          type: pack.type ?? (MUSIC_HINT.test(noExt.replace(/[^a-z0-9]+/gi, ' ')) ? 'music' : 'sfx'),
        });
      }
    }
    index = {at: Date.now(), entries};
    return entries;
  }

  /** @param {IndexEntry} e @returns {Promise<AudioResult>} */
  async function toResult(e) {
    const file = path.join(packsDir, e.rel);
    const base = path.basename(e.rel, path.extname(e.rel));
    const meta = {title: `${base} (${e.pack.name})`, creator: e.pack.creator, sourceUrl: e.pack.sourceUrl};
    const url = `file://${file}`;
    return {
      id: `local:${e.rel.split(path.sep).join('/')}`,
      provider: 'local',
      ...meta,
      durationSec: await wavDurationSec(file),
      previewUrl: url,
      downloadUrl: url,
      ...licenseFields(meta, e.pack.license),
    };
  }

  return {
    name: 'local',
    enabled: true,
    offlineCapable: true,
    types: ['music', 'sfx'],
    buildIndex,
    async search(query, opts) {
      const q = tokens(query);
      const all = await buildIndex();
      const scored = all
        .filter((e) => e.type === opts.type)
        .map((e) => ({e, score: q.filter((t) => e.words.some((w) => w === t || w.startsWith(t))).length}))
        .filter((x) => x.score > 0 || q.length === 0)
        .sort((a, b) => b.score - a.score || a.e.rel.length - b.e.rel.length);
      return Promise.all(scored.slice(0, opts.limit).map((x) => toResult(x.e)));
    },
    async copyTo(result, dest) {
      const rel = result.id.slice('local:'.length);
      const src = path.resolve(packsDir, rel);
      if (!src.startsWith(path.resolve(packsDir) + path.sep)) throw new Error(`local: path escapes packs dir: ${rel}`);
      await fs.copyFile(src, dest);
    },
  };
}
