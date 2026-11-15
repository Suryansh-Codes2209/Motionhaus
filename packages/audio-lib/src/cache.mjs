// Small JSON disk cache with a TTL. Corrupt or unreadable entries count as misses.
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/** @param {unknown} v */
export const hashKey = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 32);

/**
 * @param {string} dir
 * @param {{ttlMs?: number, now?: () => number}} [opt]  ttlMs omitted = never expires
 */
export function createJsonCache(dir, opt = {}) {
  const now = opt.now ?? Date.now;
  /** @param {string} key */
  const file = (key) => path.join(dir, `${key}.json`);
  return {
    /** @param {string} key @returns {Promise<any | undefined>} */
    async get(key) {
      try {
        const {at, value} = JSON.parse(await fs.readFile(file(key), 'utf8'));
        if (opt.ttlMs !== undefined && now() - at > opt.ttlMs) return undefined;
        return value;
      } catch {
        return undefined;
      }
    },
    /** @param {string} key @param {unknown} value */
    async set(key, value) {
      try {
        await fs.mkdir(dir, {recursive: true});
        const tmp = `${file(key)}.${process.pid}.tmp`;
        await fs.writeFile(tmp, JSON.stringify({at: now(), value}));
        await fs.rename(tmp, file(key));
      } catch {
        // A read-only or full disk must not break searching.
      }
    },
  };
}
