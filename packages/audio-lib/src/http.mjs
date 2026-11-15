// Thin wrapper around the built-in fetch: per-provider rate limiting,
// a timeout on every attempt, and exponential backoff on 429/5xx/network errors.
import {createWriteStream} from 'node:fs';
import fs from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

export class HttpError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** DNS failures, refused connections, blocked egress: the provider is unreachable from here. */
export class NetworkError extends Error {
  /** @param {string} message @param {unknown} [cause] */
  constructor(message, cause) {
    super(message, {cause});
    this.name = 'NetworkError';
  }
}

/** @param {number} ms */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Spaces requests at least `minIntervalMs` apart (FIFO). */
export class RateLimiter {
  /** @param {number} minIntervalMs @param {(ms: number) => Promise<void>} [sleepFn] */
  constructor(minIntervalMs, sleepFn = sleep) {
    this.minIntervalMs = minIntervalMs;
    this.next = 0;
    this.sleep = sleepFn;
  }
  async wait() {
    const now = Date.now();
    const at = Math.max(now, this.next);
    this.next = at + this.minIntervalMs;
    if (at > now) await this.sleep(at - now);
  }
}

/** @param {number} status */
const retryable = (status) => status === 429 || status >= 500;

/**
 * @typedef {object} HttpOptions
 * @property {string} provider              used in error messages
 * @property {number} [minIntervalMs]       rate limit spacing (default 1000)
 * @property {number} [timeoutMs]           per attempt (default 15000)
 * @property {number} [retries]             extra attempts after the first (default 3)
 * @property {number} [backoffMs]           first backoff delay (default 500), doubles each retry
 * @property {typeof fetch} [fetchImpl]
 * @property {(ms: number) => Promise<void>} [sleepFn]
 */

/** @param {HttpOptions} o */
export function createHttp(o) {
  const fetchImpl = o.fetchImpl ?? globalThis.fetch;
  const sleepFn = o.sleepFn ?? sleep;
  const limiter = new RateLimiter(o.minIntervalMs ?? 1000, sleepFn);
  const retries = o.retries ?? 3;
  const backoffMs = o.backoffMs ?? 500;

  /**
   * @param {string} url
   * @param {RequestInit & {timeoutMs?: number, rateLimit?: boolean}} [init]
   * @returns {Promise<Response>}
   */
  async function request(url, init = {}) {
    const {timeoutMs = o.timeoutMs ?? 15000, rateLimit = true, ...rest} = init;
    /** @type {unknown} */
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (rateLimit) await limiter.wait();
      /** @type {Response} */
      let res;
      try {
        res = await fetchImpl(url, {...rest, signal: AbortSignal.timeout(timeoutMs)});
      } catch (err) {
        const e = /** @type {Error & {cause?: {code?: string}}} */ (err);
        const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
        lastErr = timedOut
          ? new NetworkError(`${o.provider}: request timed out after ${timeoutMs}ms`, err)
          : new NetworkError(`${o.provider}: network error (${e.cause?.code ?? e.message})`, err);
        if (attempt < retries) await sleepFn(delay(attempt));
        continue;
      }
      if (res.ok) return res;
      if (retryable(res.status) && attempt < retries) {
        const ra = Number(res.headers.get('retry-after'));
        await res.body?.cancel().catch(() => {});
        await sleepFn(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 60000) : delay(attempt));
        continue;
      }
      const body = await res.text().catch(() => '');
      throw new HttpError(`${o.provider}: HTTP ${res.status} for ${redact(url)} ${body.slice(0, 200)}`.trim(), res.status);
    }
    throw lastErr;
  }

  /** Exponential backoff with jitter, capped at 8s. @param {number} attempt */
  const delay = (attempt) => Math.min(8000, backoffMs * 2 ** attempt) * (0.75 + Math.random() * 0.5);

  return {
    request,
    /** @param {string} url @param {RequestInit & {timeoutMs?: number}} [init] @returns {Promise<any>} */
    async getJson(url, init) {
      const res = await request(url, {...init, headers: {accept: 'application/json', ...init?.headers}});
      return res.json();
    },
    /**
     * Stream a file to disk (atomic: temp file then rename). Rejects non-audio
     * responses and files over `maxBytes`.
     * @param {string} url @param {string} dest
     * @param {{headers?: Record<string, string>, maxBytes?: number, timeoutMs?: number}} [opt]
     * @returns {Promise<{contentType: string, bytes: number}>}
     */
    async download(url, dest, opt = {}) {
      const res = await request(url, {headers: opt.headers, timeoutMs: opt.timeoutMs ?? 120000, rateLimit: false});
      const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (/^(text\/html|application\/json|text\/plain)/.test(contentType)) {
        await res.body?.cancel().catch(() => {});
        throw new HttpError(`${o.provider}: expected audio but got ${contentType} from ${redact(url)}`, res.status);
      }
      const max = opt.maxBytes ?? Infinity;
      const len = Number(res.headers.get('content-length'));
      if (Number.isFinite(len) && len > max) {
        await res.body?.cancel().catch(() => {});
        throw new HttpError(`${o.provider}: file is ${Math.round(len / 1e6)}MB, over the ${Math.round(max / 1e6)}MB limit`, 413);
      }
      if (!res.body) throw new HttpError(`${o.provider}: empty response body`, res.status);
      const tmp = `${dest}.part-${process.pid}`;
      let bytes = 0;
      const counter = async function* (/** @type {AsyncIterable<Uint8Array>} */ src) {
        for await (const chunk of src) {
          bytes += chunk.length;
          if (bytes > max) throw new HttpError(`${o.provider}: download exceeded ${Math.round(max / 1e6)}MB`, 413);
          yield chunk;
        }
      };
      try {
        await pipeline(Readable.fromWeb(/** @type {any} */ (res.body)), counter, createWriteStream(tmp));
        await fs.rename(tmp, dest);
      } catch (err) {
        await fs.rm(tmp, {force: true});
        throw err;
      }
      return {contentType, bytes};
    },
  };
}

/** Never echo credentials into logs or errors. @param {string} url */
export function redact(url) {
  return url.replace(/([?&](token|client_id|client_secret|access_token)=)[^&]+/gi, '$1***');
}

/** @typedef {ReturnType<typeof createHttp>} Http */
