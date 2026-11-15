// Step 2: filter + score into a shortlist. Claude chooses the final picks from
// this shortlist in the script step; never pad when fewer pass.
import {filter, rank} from '../filters.mjs';
import {findAnchor} from '../retention.mjs';

/** @typedef {import('../types.mjs').Candidate} Candidate */

/**
 * @param {Candidate[]} candidates
 * Anchored candidates (title or text names something people already search
 * for, series.json → anchors) rank first: much of a small channel's reach
 * comes from YouTube search, and search finds names people type. Each entry
 * carries `anchor` (the name, or null) so the script step can skip the rest.
 * @param {{now: Date, size: number, ledger: {conflict: (url: string, title?: string) => string | null}, blocked: string[], banned?: string[], identity?: 'product' | 'story', reachable?: (url: string) => Promise<boolean>, anchors?: string[]}} o
 */
export async function shortlist(candidates, {now, size, ledger, blocked, banned, identity = 'product', reachable, anchors = []}) {
  // Rank first so the (slow) reachability check only runs on likely picks.
  const ranked = rank(candidates, now, {identity});
  const pre = await filter(ranked, {ledger, blocked, banned});
  const top = pre.kept.slice(0, size * 2);
  const checked = reachable ? await filter(top, {ledger: {conflict: () => null}, blocked: [], reachable}) : {kept: top, rejected: []};
  return {
    shortlist: rank(checked.kept, now, {identity})
      .map((c) => ({...c, anchor: findAnchor(`${c.title}\n${c.text}`, anchors)}))
      .sort((a, b) => Number(!!b.anchor) - Number(!!a.anchor) || a.rank - b.rank)
      .slice(0, size),
    rejected: [...pre.rejected, ...checked.rejected],
  };
}
