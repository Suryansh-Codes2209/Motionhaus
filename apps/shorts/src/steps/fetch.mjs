// Step 1: pull launches from every enabled source. One failing source is
// reported, not fatal.
/** @typedef {import('../types.mjs').Candidate} Candidate */
/** @typedef {import('../types.mjs').Source} Source */

/**
 * @param {Source[]} sources @param {{now: Date, lookbackHours: number}} opts
 * @returns {Promise<{candidates: Candidate[], errors: {source: string, error: string}[]}>}
 */
export async function fetchAll(sources, opts) {
  const results = await Promise.allSettled(sources.map((s) => s.fetch(opts)));
  /** @type {Candidate[]} */
  const candidates = [];
  /** @type {{source: string, error: string}[]} */
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') candidates.push(...r.value);
    else errors.push({source: sources[i].name, error: r.reason instanceof Error ? r.reason.message : String(r.reason)});
  });
  return {candidates, errors};
}
