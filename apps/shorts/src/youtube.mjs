// YouTube Data API v3: OAuth (installed-app loopback flow), resumable upload,
// links comment, subtitle track, custom thumbnail. A vertical video ≤ 3 min
// is classified as a Short by YouTube automatically; nothing Shorts-specific
// is sent.
//
// Uploads from a Cloud project that hasn't passed YouTube's API audit are
// locked to private whatever privacyStatus is requested. publish() reports it.
import {createHash, randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';
const UPLOAD_CAPTIONS = 'https://www.googleapis.com/upload/youtube/v3/captions';
const UPLOAD_THUMB = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set';
// YouTube's limit for custom thumbnails.
export const THUMB_MAX_BYTES = 2 * 1024 * 1024;
// upload: videos.insert, thumbnails.set · force-ssl: commentThreads.insert, captions.insert, videos.list on private videos
export const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];

/**
 * @typedef {object} VideoMeta
 * @property {string} title
 * @property {string} description
 * @property {string[]} [tags]
 * @property {string} [comment]          posted after upload (pin it by hand: the API can't)
 * @property {'private' | 'unlisted' | 'public'} [privacy]
 * @property {string} [publishAt]        ISO time; YouTube requires privacy 'private' for scheduling
 * @property {boolean} [syntheticMedia]  status.containsSyntheticMedia
 */

/** Problems YouTube would reject (or silently mangle), as messages. @param {VideoMeta} m */
export function validateMeta(m) {
  /** @type {string[]} */
  const errs = [];
  if (!m.title?.trim()) errs.push('title is empty');
  if ((m.title ?? '').length > 100) errs.push(`title is ${m.title.length} chars (max 100)`);
  if ((m.description ?? '').length > 5000) errs.push(`description is ${m.description.length} chars (max 5000)`);
  if (/[<>]/.test(`${m.title}${m.description}`)) errs.push('title/description contain < or > (rejected by YouTube)');
  const tagChars = (m.tags ?? []).reduce((n, t) => n + t.length + (t.includes(' ') ? 2 : 0) + 1, 0);
  if (tagChars > 500) errs.push(`tags total ${tagChars} chars (max 500)`);
  if (m.publishAt && (m.privacy ?? 'private') !== 'private') errs.push('publishAt needs privacy "private"');
  if (/\[your contact email\]/i.test(m.description ?? '')) errs.push('description still has the [your contact email] placeholder');
  return errs;
}

/**
 * "Sources:" and the distinct links named in a script's `sources`, for the
 * YouTube description. @param {unknown} sources @returns {string}
 */
export function sourcesBlock(sources) {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return '';
  const links = [...new Set(Object.values(sources).flatMap((v) => String(v).match(/https?:\/\/[^\s)>\]]+/g) ?? []).map((l) => l.replace(/[.,;]+$/, '')))];
  return links.length ? `Sources:\n${links.join('\n')}` : '';
}

/**
 * videos.insert body. The category and language are the channel's
 * (channel.json → publish.youtube); the defaults are Science & Technology, English.
 * @param {VideoMeta} m @param {{categoryId?: string, language?: string}} [o]
 */
export function insertBody(m, {categoryId = '28', language = 'en'} = {}) {
  return {
    snippet: {title: m.title, description: m.description, tags: m.tags ?? [], categoryId, defaultLanguage: language, defaultAudioLanguage: language},
    status: {
      privacyStatus: m.publishAt ? 'private' : (m.privacy ?? 'private'),
      ...(m.publishAt ? {publishAt: m.publishAt} : {}),
      selfDeclaredMadeForKids: false,
      embeddable: true,
      ...(m.syntheticMedia !== undefined ? {containsSyntheticMedia: m.syntheticMedia} : {}),
    },
  };
}

/**
 * @param {{clientId: string, clientSecret: string, refreshToken?: string, fetchImpl?: typeof fetch, label?: string, video?: {categoryId?: string, language?: string}}} o  label: the channel's name, shown on the sign-in page; video: its YouTube category and language
 */
export function createYouTube({clientId, clientSecret, refreshToken, fetchImpl = globalThis.fetch, label = 'Your channel', video = {}}) {
  /** @type {{token: string, exp: number} | null} */
  let cached = null;

  /** @param {Record<string, string>} form */
  async function tokenRequest(form) {
    const res = await fetchImpl(TOKEN_URL, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(form)});
    const data = /** @type {any} */ (await res.json());
    if (!res.ok) throw new Error(`OAuth: ${data.error ?? res.status} ${data.error_description ?? ''}`.trim());
    return data;
  }

  async function accessToken() {
    if (cached && cached.exp > Date.now() + 60_000) return cached.token;
    if (!refreshToken) throw new Error('no YOUTUBE_REFRESH_TOKEN: run `shorts auth` first');
    const d = await tokenRequest({client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token'});
    cached = {token: d.access_token, exp: Date.now() + d.expires_in * 1000};
    return cached.token;
  }

  /** @param {string} url @param {RequestInit} [init] */
  async function api(url, init = {}) {
    const res = await fetchImpl(url, {...init, headers: {authorization: `Bearer ${await accessToken()}`, ...init.headers}});
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${data.error?.message ?? text.slice(0, 300)}`);
    return data;
  }

  return {
    /**
     * Installed-app loopback flow with PKCE. Calls `open` with the consent URL,
     * waits for the redirect on 127.0.0.1, returns the refresh token.
     * @param {(url: string) => void} open
     */
    async authorize(open) {
      const verifier = randomBytes(32).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const state = randomBytes(12).toString('hex');
      /** @type {(v: {code: string, redirect: string}) => void} */
      let done = () => {};
      /** @type {(e: Error) => void} */
      let fail = () => {};
      const got = new Promise((res, rej) => ((done = res), (fail = rej)));
      const server = http.createServer((req, res) => {
        const u = new URL(req.url ?? '/', 'http://127.0.0.1');
        if (u.pathname !== '/') return void res.writeHead(404).end();
        const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
        res.writeHead(ok ? 200 : 400, {'content-type': 'text/html'});
        res.end(ok ? `<h2>${label} is connected. You can close this tab.</h2>` : `<h2>Sign-in failed: ${u.searchParams.get('error') ?? 'bad state'}</h2>`);
        const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
        if (ok) done({code: String(u.searchParams.get('code')), redirect: `http://127.0.0.1:${addr.port}`});
        else fail(new Error(`OAuth sign-in failed: ${u.searchParams.get('error') ?? 'state mismatch'}`));
      });
      await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
      const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
      const p = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `http://127.0.0.1:${port}`,
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent', // always return a refresh token
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      open(`${AUTH_URL}?${p}`);
      try {
        const {code, redirect} = await got;
        const d = await tokenRequest({client_id: clientId, client_secret: clientSecret, code, code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code'});
        if (!d.refresh_token) throw new Error('Google returned no refresh token (remove the app at myaccount.google.com/permissions and retry)');
        return /** @type {string} */ (d.refresh_token);
      } finally {
        server.close();
      }
    },

    /** The channel the token belongs to. */
    async channel() {
      const d = await api(`${API}/channels?part=snippet&mine=true`);
      const c = d.items?.[0];
      return c ? {id: String(c.id), title: String(c.snippet.title), handle: String(c.snippet.customUrl ?? '')} : null;
    },

    /**
     * Resumable upload in 8 MB chunks.
     * @param {string} file @param {VideoMeta} meta @param {(sent: number, total: number) => void} [progress]
     * @returns {Promise<string>} video id
     */
    async upload(file, meta, progress) {
      const errs = validateMeta(meta);
      if (errs.length) throw new Error(`metadata: ${errs.join('; ')}`);
      const size = (await fs.stat(file)).size;
      const init = await fetchImpl(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${await accessToken()}`,
          'content-type': 'application/json; charset=UTF-8',
          'x-upload-content-length': String(size),
          'x-upload-content-type': 'video/mp4',
        },
        body: JSON.stringify(insertBody(meta, video)),
      });
      if (!init.ok) throw new Error(`YouTube upload init ${init.status}: ${(await init.text()).slice(0, 300)}`);
      const session = init.headers.get('location');
      if (!session) throw new Error('YouTube upload init: no session URL');

      const CHUNK = 8 * 1024 * 1024;
      const fh = await fs.open(file, 'r');
      try {
        let offset = 0;
        for (;;) {
          const len = Math.min(CHUNK, size - offset);
          const buf = Buffer.alloc(len);
          await fh.read(buf, 0, len, offset);
          const res = await fetchImpl(session, {
            method: 'PUT',
            headers: {authorization: `Bearer ${await accessToken()}`, 'content-length': String(len), 'content-range': `bytes ${offset}-${offset + len - 1}/${size}`},
            body: buf,
          });
          if (res.status === 200 || res.status === 201) {
            progress?.(size, size);
            return String((/** @type {any} */ (await res.json())).id);
          }
          if (res.status !== 308) throw new Error(`YouTube upload ${res.status}: ${(await res.text()).slice(0, 300)}`);
          const range = res.headers.get('range'); // "bytes=0-8388607"
          offset = range ? Number(range.split('-')[1]) + 1 : offset + len;
          progress?.(offset, size);
        }
      } finally {
        await fh.close();
      }
    },

    /** @param {string} videoId */
    async status(videoId) {
      const d = await api(`${API}/videos?part=status,processingDetails&id=${encodeURIComponent(videoId)}`);
      const v = d.items?.[0];
      return v ? {privacy: String(v.status.privacyStatus), upload: String(v.status.uploadStatus), rejection: v.status.rejectionReason ?? null} : null;
    },

    /** Top-level comment as the channel. @param {string} videoId @param {string} text */
    async comment(videoId, text) {
      const d = await api(`${API}/commentThreads?part=snippet`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({snippet: {videoId, topLevelComment: {snippet: {textOriginal: text}}}}),
      });
      return String(d.id);
    },

    /**
     * Uploads a subtitle track (captions.insert, multipart).
     * @param {string} videoId @param {string} srtFile @param {{language?: string, name?: string}} [o]
     * @returns {Promise<string>} caption track id
     */
    async captions(videoId, srtFile, {language = 'en', name = 'English'} = {}) {
      const boundary = `lr${randomBytes(12).toString('hex')}`;
      const meta = JSON.stringify({snippet: {videoId, language, name, isDraft: false}});
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\ncontent-type: application/octet-stream\r\n\r\n`),
        await fs.readFile(srtFile),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const d = await api(`${UPLOAD_CAPTIONS}?uploadType=multipart&part=snippet`, {method: 'POST', headers: {'content-type': `multipart/related; boundary=${boundary}`}, body});
      return String(d.id);
    },

    /**
     * Sets the custom thumbnail (PNG/JPEG ≤ 2 MB). The channel must be phone-verified.
     * @param {string} videoId @param {string} imageFile
     */
    async thumbnail(videoId, imageFile) {
      const buf = await fs.readFile(imageFile);
      if (buf.length > THUMB_MAX_BYTES) throw new Error(`thumbnail is ${(buf.length / 1048576).toFixed(1)} MB (max 2 MB)`);
      const type = /\.jpe?g$/i.test(imageFile) ? 'image/jpeg' : 'image/png';
      await api(`${UPLOAD_THUMB}?uploadType=media&videoId=${encodeURIComponent(videoId)}`, {method: 'POST', headers: {'content-type': type}, body: buf});
    },
  };
}
