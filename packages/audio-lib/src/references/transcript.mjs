// Optional, isolated transcript module. Never throws: every failure becomes
// {available: false, reason}. Only official APIs are used:
//   - Vimeo: /videos/{id}/texttracks (needs VIMEO_TOKEN), then the WebVTT file.
//   - YouTube: the Data API only lets a video's owner download captions
//     (OAuth), so transcripts are reported unavailable, never scraped.
// Disable entirely with REFERENCES_TRANSCRIPTS=0.
import {classifyUrl} from './util.mjs';

/** @typedef {{start: number, end: number, text: string}} Cue */
/** @typedef {{available: true, language: string, source: string, cues: Cue[]} | {available: false, reason: string}} Transcript */

/** @param {string} ts "00:01:02.500" or "01:02.500" */
const vttTime = (ts) => {
  const parts = ts.trim().replace(',', '.').split(':').map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};

/** @param {string} vtt @returns {Cue[]} */
export function parseVtt(vtt) {
  /** @type {Cue[]} */
  const cues = [];
  for (const block of vtt.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const text = lines
      .slice(i + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text) cues.push({start: vttTime(a), end: vttTime(b.trim().split(/\s/)[0]), text});
  }
  return cues;
}

/**
 * @param {string} url
 * @param {{env: Record<string, string | undefined>, vimeo?: {enabled: boolean, textTracks: (id: string) => Promise<{language: string, link: string}[]>}, http: import('../http.mjs').Http}} deps
 * @returns {Promise<Transcript>}
 */
export async function fetchTranscript(url, deps) {
  try {
    if (deps.env.REFERENCES_TRANSCRIPTS === '0') return {available: false, reason: 'transcripts disabled (REFERENCES_TRANSCRIPTS=0)'};
    const c = classifyUrl(url);
    if (c.kind === 'youtube') {
      return {available: false, reason: 'YouTube only allows caption downloads by the video owner (OAuth); not attempted'};
    }
    if (c.kind === 'vimeo' && c.id) {
      if (!deps.vimeo?.enabled) return {available: false, reason: 'set VIMEO_TOKEN to read Vimeo text tracks'};
      const tracks = await deps.vimeo.textTracks(c.id);
      const track = tracks.find((t) => /^en/i.test(t.language)) ?? tracks[0];
      if (!track) return {available: false, reason: 'this Vimeo video has no text tracks'};
      const res = await deps.http.request(track.link, {rateLimit: false});
      const cues = parseVtt(await res.text());
      if (!cues.length) return {available: false, reason: 'text track was empty'};
      return {available: true, language: track.language, source: 'vimeo-texttracks', cues};
    }
    return {available: false, reason: 'no official transcript API for this host'};
  } catch (err) {
    return {available: false, reason: `transcript fetch failed: ${/** @type {Error} */ (err).message}`};
  }
}
