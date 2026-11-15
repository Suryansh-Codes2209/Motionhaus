// YouTube Data API quota guard, persisted on disk so it survives restarts.
// Per the current docs (developers.google.com/youtube/v3/determine_quota_cost):
// search.list has its own bucket of 100 calls/day at 1 unit each; most other
// methods (videos.list = 1 unit) share 10,000 units/day. Quotas reset at
// midnight Pacific Time. We refuse a call that would cross the limit.
import fs from 'node:fs/promises';
import path from 'node:path';

export class QuotaError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'QuotaError';
  }
}

/** Today's date in Pacific Time, e.g. "2026-10-11". @param {Date} [now] */
export const pacificDay = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);

/**
 * @param {string} file
 * @param {{search: number, units: number}} limits
 * @param {() => Date} [now]
 */
export function createQuota(file, limits, now = () => new Date()) {
  /** @type {Promise<unknown>} */
  let queue = Promise.resolve();

  async function read() {
    const day = pacificDay(now());
    try {
      const s = JSON.parse(await fs.readFile(file, 'utf8'));
      if (s.day === day) return {day, search: Number(s.search) || 0, units: Number(s.units) || 0};
    } catch {}
    return {day, search: 0, units: 0};
  }

  return {
    /**
     * Reserve quota before making a call (failed calls still cost quota).
     * @param {'search' | 'units'} bucket @param {number} cost
     */
    reserve(bucket, cost) {
      const run = queue.then(async () => {
        const s = await read();
        if (s[bucket] + cost > limits[bucket]) {
          throw new QuotaError(
            `YouTube ${bucket === 'search' ? 'search.list' : 'API'} daily quota reached (${s[bucket]}/${limits[bucket]} used today, resets at midnight Pacific)`,
          );
        }
        s[bucket] += cost;
        await fs.mkdir(path.dirname(file), {recursive: true});
        await fs.writeFile(file, JSON.stringify(s));
        return s;
      });
      queue = run.catch(() => {});
      return run;
    },
    usage: read,
  };
}
