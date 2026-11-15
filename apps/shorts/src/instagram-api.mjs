// Instagram Graph API (Facebook Login route): publish a reel from a local
// file. Zero dependencies, global fetch.
//
// Why Facebook Login and not Instagram Login: only this route offers the
// "resumable" upload of a local file (to rupload.facebook.com). The other
// route needs the video at a public URL, which would mean hosting. The cost
// is that the Instagram account must be a professional account linked to a
// Facebook Page, and calls are made with that Page's access token.
//
// A reel is published in four calls: create a container, upload the file
// into it, wait until Instagram has processed it, publish the container.
import fs from 'node:fs/promises';

export const GRAPH_VERSION = 'v27.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const RUPLOAD = `https://rupload.facebook.com/ig-api-upload/${GRAPH_VERSION}`;
export const DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement', 'pages_show_list'];
// Also asked for at sign-in, but not required: when a Page sits inside a Meta
// business portfolio (linking an Instagram account often moves it there),
// /me/accounts returns no Pages at all without this permission.
export const OPTIONAL_SCOPES = ['business_management'];

const MAX_BYTES = 300 * 1024 * 1024;
const POLL_MS = 15_000;
const MAX_POLLS = 40; // 10 minutes
// After an upload whose reply was an error, how long to look for the bytes
// having arrived anyway: 3 minutes is enough to tell, and short enough that
// a really failed upload is reported the same run.
const RECOVERY_POLLS = 12;
// media_publish can answer "not ready" right as the container turns FINISHED;
// a short wait fixes it.
const PUBLISH_RETRY_MS = 10_000;
const PUBLISH_ATTEMPTS = 4;

/**
 * @typedef {object} ReelOpts
 * @property {string} caption
 * @property {number} [thumbOffsetMs]  the frame of the reel used as its cover
 * @property {boolean} [shareToFeed]
 * @property {string[]} [userTags]     usernames, with or without @
 */

/** @typedef {'IN_PROGRESS' | 'FINISHED' | 'PUBLISHED' | 'ERROR' | 'EXPIRED'} ContainerStatus */

/**
 * What Instagram would reject, found before any network call.
 * @param {string} caption @param {number} sizeBytes
 */
export function validateReel(caption, sizeBytes) {
  const errs = [];
  if (!caption.trim()) errs.push('caption is empty');
  if (caption.length > 2200) errs.push(`caption is ${caption.length} characters (max 2,200)`);
  const tags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (tags.length > 30) errs.push(`${tags.length} hashtags (max 30 hashtags)`);
  const mentions = caption.match(/(?<![\p{L}\p{N}_.])@[\p{L}\p{N}_.]+/gu) ?? [];
  if (mentions.length > 20) errs.push(`${mentions.length} mentions (max 20 mentions)`);
  if (sizeBytes <= 0) errs.push('video file is empty');
  if (sizeBytes > MAX_BYTES) errs.push(`video is ${Math.round(sizeBytes / 1024 / 1024)} MB (max 300 MB)`);
  return errs;
}

/**
 * One Graph call. Throws `Instagram API <status>: <message>` with Graph's
 * error code on `.code` (190 means the token is dead) and its subcode on
 * `.subcode` (2207027 means the media is not ready to publish yet).
 * @param {typeof fetch} fetchImpl @param {string} url @param {RequestInit} [init]
 */
async function call(fetchImpl, url, init) {
  const res = await fetchImpl(url, init);
  const text = await res.text();
  /** @type {any} */
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (!res.ok || !data || data.error) {
    const e = data?.error;
    const err = /** @type {Error & {code?: number, subcode?: number}} */ (new Error(`Instagram API ${res.status}: ${e?.error_user_msg ?? e?.message ?? data?.debug_info?.message ?? text.slice(0, 300)}`));
    if (typeof e?.code === 'number') err.code = e.code;
    if (typeof e?.error_subcode === 'number') err.subcode = e.error_subcode;
    throw err;
  }
  return data;
}

const qs = (/** @type {Record<string, string>} */ o) => new URLSearchParams(o).toString();

/**
 * @param {{pageToken: string, igUserId: string, fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>}} o
 */
export function createInstagram({pageToken, igUserId, fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms))}) {
  if (!pageToken || !igUserId) throw new Error('no INSTAGRAM_PAGE_TOKEN / INSTAGRAM_USER_ID: run `shorts insta-auth` first');

  /** @param {string} path @param {Record<string, string>} [params] */
  const get = (path, params = {}) => call(fetchImpl, `${GRAPH}/${path}?${qs({...params, access_token: pageToken})}`);
  /** @param {string} path @param {Record<string, string>} form */
  const post = (path, form) => call(fetchImpl, `${GRAPH}/${path}`, {method: 'POST', body: new URLSearchParams({...form, access_token: pageToken})});

  const api = {
    /** The Instagram account the token posts to. */
    async account() {
      const d = await get(igUserId, {fields: 'id,username'});
      return {id: String(d.id), username: String(d.username)};
    },

    /** @param {ReelOpts} o @returns {Promise<string>} container id */
    async createContainer(o) {
      /** @type {Record<string, string>} */
      const form = {media_type: 'REELS', upload_type: 'resumable', caption: o.caption};
      if (typeof o.thumbOffsetMs === 'number') form.thumb_offset = String(Math.round(o.thumbOffsetMs));
      if (typeof o.shareToFeed === 'boolean') form.share_to_feed = String(o.shareToFeed);
      const tags = (o.userTags ?? []).map((u) => u.replace(/^@/, '').trim()).filter(Boolean);
      if (tags.length) form.user_tags = JSON.stringify(tags.map((username) => ({username})));
      const d = await post(`${igUserId}/media`, form);
      if (!d.id) throw new Error('Instagram API: no container id returned');
      return String(d.id);
    },

    /** Sends the whole file into the container. @param {string} containerId @param {string} file */
    async upload(containerId, file) {
      const body = await fs.readFile(file);
      const d = await call(fetchImpl, `${RUPLOAD}/${containerId}`, {
        method: 'POST',
        headers: {authorization: `OAuth ${pageToken}`, offset: '0', file_size: String(body.length)},
        body,
      });
      if (d.success !== true) throw new Error(`Instagram upload was not accepted: ${d.message ?? JSON.stringify(d).slice(0, 200)}`);
    },

    /** @param {string} containerId @returns {Promise<{status: ContainerStatus, detail: string}>} */
    async containerState(containerId) {
      const d = await get(containerId, {fields: 'status_code,status'});
      return {status: /** @type {ContainerStatus} */ (String(d.status_code)), detail: String(d.status ?? '')};
    },

    /** @param {string} containerId @returns {Promise<ContainerStatus>} */
    async containerStatus(containerId) {
      return (await api.containerState(containerId)).status;
    },

    /**
     * Polls until Instagram has processed the upload.
     * @param {string} containerId @param {number} [maxPolls] one every 15 s
     */
    async waitFinished(containerId, maxPolls = MAX_POLLS) {
      for (let i = 0; i < maxPolls; i++) {
        const {status, detail} = await api.containerState(containerId);
        if (status === 'FINISHED' || status === 'PUBLISHED') return status;
        if (status !== 'IN_PROGRESS') throw new Error(`Instagram processing ended with status ${status}${detail ? `: ${detail}` : ''}`);
        if (i < maxPolls - 1) await sleep(POLL_MS);
      }
      throw new Error(`Instagram is still processing the reel after ${Math.round((maxPolls * POLL_MS) / 60_000)} minutes`);
    },

    /** @param {string} containerId @returns {Promise<{id: string, permalink: string}>} */
    async publish(containerId) {
      /** @type {any} */
      let d;
      for (let attempt = 1; ; attempt++) {
        try {
          d = await post(`${igUserId}/media_publish`, {creation_id: containerId});
          break;
        } catch (err) {
          // "The media is not ready for publishing": Instagram says FINISHED a
          // moment before it will publish. Wait and ask again; anything else
          // is a real failure.
          const e = /** @type {{code?: number, subcode?: number}} */ (err);
          const notReady = e.code === 9007 || e.subcode === 2207027;
          if (!notReady || attempt >= PUBLISH_ATTEMPTS) throw err;
          await sleep(PUBLISH_RETRY_MS);
        }
      }
      const id = String(d.id);
      // The reel is live at this point; a failed permalink read must not look like a failed post.
      const permalink = await get(id, {fields: 'permalink'}).then((m) => String(m.permalink ?? ''), () => '');
      return {id, permalink};
    },

    /**
     * Container → upload → wait → publish. `onStep` is told the container id
     * as soon as it exists, so a caller can save it and recover from a crash.
     * @param {string} file @param {ReelOpts} opts
     * @param {(step: 'container' | 'uploaded' | 'finished', containerId: string) => Promise<void> | void} [onStep]
     * @returns {Promise<{id: string, permalink: string, containerId: string}>}
     */
    async publishReel(file, opts, onStep) {
      const errs = validateReel(opts.caption, (await fs.stat(file)).size);
      if (errs.length) throw new Error(`reel: ${errs.join('; ')}`);
      const containerId = await api.createContainer(opts);
      await onStep?.('container', containerId);
      try {
        await api.upload(containerId, file);
      } catch (uploadErr) {
        // An error reply does not always mean the bytes were lost: Instagram
        // has answered "Request processing failed" for uploads that then went
        // on to FINISHED. So look at the container before giving up; if it
        // never finishes, the upload error is the one worth reporting.
        try {
          await api.waitFinished(containerId, RECOVERY_POLLS);
        } catch {
          throw uploadErr;
        }
      }
      await onStep?.('uploaded', containerId);
      await api.waitFinished(containerId);
      await onStep?.('finished', containerId);
      return {...(await api.publish(containerId)), containerId};
    },
  };
  return api;
}

/**
 * Short-lived user token → long-lived (about 60 days). Page tokens read with
 * a long-lived user token do not expire on a timer.
 * @param {{appId: string, appSecret: string, userToken: string, fetchImpl?: typeof fetch}} o
 */
export async function exchangeToken({appId, appSecret, userToken, fetchImpl = globalThis.fetch}) {
  const d = await call(fetchImpl, `${GRAPH}/oauth/access_token?${qs({grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: userToken})}`);
  if (!d.access_token) throw new Error('Instagram API: no long-lived token returned');
  return String(d.access_token);
}

/**
 * Authorization code from the login dialog → short-lived user token.
 * @param {{appId: string, appSecret: string, code: string, redirectUri: string, fetchImpl?: typeof fetch}} o
 */
export async function codeToToken({appId, appSecret, code, redirectUri, fetchImpl = globalThis.fetch}) {
  const d = await call(fetchImpl, `${GRAPH}/oauth/access_token?${qs({client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code})}`);
  if (!d.access_token) throw new Error('Instagram API: no token returned for the sign-in code');
  return String(d.access_token);
}

const bare = (/** @type {string} */ h) => h.replace(/^@/, '').trim().toLowerCase();

/**
 * The Page whose linked Instagram account is `handle`, with its Page token.
 * @param {{userToken: string, handle: string, fetchImpl?: typeof fetch}} o
 * @returns {Promise<{pageToken: string, igUserId: string, username: string, page: string}>}
 */
export async function findAccount({userToken, handle, fetchImpl = globalThis.fetch}) {
  const d = await call(fetchImpl, `${GRAPH}/me/accounts?${qs({fields: 'name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}', limit: '100', access_token: userToken})}`);
  /** @type {any[]} */
  const pages = Array.isArray(d.data) ? d.data : [];
  if (!pages.length) throw new Error('this Facebook account manages no Facebook Page (or the Page was not ticked in the sign-in dialog)');
  // Accounts linked through Meta's Accounts Center sometimes show up only as
  // `connected_instagram_account`; it carries the same Instagram user id.
  for (const p of pages) p.instagram_business_account ??= p.connected_instagram_account;
  const linked = pages.filter((p) => p.instagram_business_account?.username);
  const hit = linked.find((p) => bare(p.instagram_business_account.username) === bare(handle));
  if (!hit) {
    const names = pages.map((p) => `"${p.name}"`).join(', ');
    const found = linked.map((p) => `@${p.instagram_business_account.username}`).join(', ') || `no Page with a linked Instagram professional account; Pages seen: ${names}`;
    throw new Error(`no Page is linked to ${handle} (found: ${found}). Link the Instagram account to a Facebook Page, then sign in again`);
  }
  return {pageToken: String(hit.access_token), igUserId: String(hit.instagram_business_account.id), username: String(hit.instagram_business_account.username), page: String(hit.name)};
}

/**
 * Which permissions the sign-in actually granted. Facebook drops a permission
 * silently when the app does not have it added, and then the Instagram
 * account simply does not appear on the Page.
 * @param {{userToken: string, fetchImpl?: typeof fetch}} o
 * @returns {Promise<{granted: string[], missing: string[]}>}
 */
export async function grantedPermissions({userToken, fetchImpl = globalThis.fetch}) {
  const d = await call(fetchImpl, `${GRAPH}/me/permissions?${qs({access_token: userToken})}`);
  /** @type {string[]} */
  const granted = (Array.isArray(d.data) ? d.data : []).filter((/** @type {any} */ p) => p.status === 'granted').map((/** @type {any} */ p) => String(p.permission));
  return {granted, missing: SCOPES.filter((s) => !granted.includes(s))};
}
