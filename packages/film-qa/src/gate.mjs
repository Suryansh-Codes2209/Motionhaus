// Pre-delivery gate for any finished MP4. Reads only the file, so it works on
// LaunchReel films, Launch Radar shorts and edited reels alike.
//
// Two profiles:
//   animation  upstream huashu-art-motion calibration (13 rated films,
//              2026-10-09/10). fast_ratio < 0.035 is red: a slideshow.
//   reel       real footage (talking heads). A person talking is the motion,
//              so fast_ratio is info only. Its thresholds (shot length,
//              frozen frames, loudness) are Motionhaus defaults, NOT
//              calibrated on rated reels yet; they are yellow (look) lights.
// Fact gates (blank mid-film frames) are red in every profile.
import {decode, loudnessLog, probe, silenceLog} from './frames.mjs';
import {blankRuns, bluePurple, cutLike, cutStarts, frameDiffs, motionStats, parseLoudness, round} from './metrics.mjs';

const FPS = 12;
const WIDTH = 320;
const SHORT_S = 20; // upstream: below this, motion reds demote to yellow

/** @typedef {'high_bad' | 'low_bad' | 'info'} Dir */
/** @typedef {{name: string, dir: Dir, yellow?: number, red?: number, fact?: boolean, unit?: string}} Metric */

/** @type {Record<string, Record<string, Metric>>} */
export const PROFILES = {
  animation: {
    fast_ratio: {name: 'fast-motion frame share', dir: 'low_bad', yellow: 0.06, red: 0.035},
    blank_run_s: {name: 'longest near-blank stretch mid-film', dir: 'high_bad', red: 0.3, fact: true, unit: 's'},
    blue_purple_share: {name: 'blue-purple palette share', dir: 'high_bad', yellow: 0.12, red: 0.3, fact: true},
    fast_ratio_worst_window: {name: 'fast-motion share, worst 30 s', dir: 'low_bad', yellow: 0.02},
    longest_still_s: {name: 'longest frozen stretch', dir: 'high_bad', yellow: 6, unit: 's'},
    max_shot_s: {name: 'longest shot', dir: 'info', unit: 's'},
    cuts_per_10s: {name: 'cuts per 10 s', dir: 'info'},
  },
  reel: {
    blank_run_s: {name: 'longest near-blank stretch mid-film', dir: 'high_bad', red: 0.3, fact: true, unit: 's'},
    blue_purple_share: {name: 'blue-purple palette share', dir: 'high_bad', yellow: 0.3},
    longest_still_s: {name: 'longest frozen stretch', dir: 'high_bad', yellow: 2.5, unit: 's'},
    // pixel-based: misses punch-ins on shaky handheld footage, so info only here
    max_shot_s: {name: 'longest stretch without a detected cut', dir: 'info', unit: 's'},
    // exact, from the edit decision list (reels CLI passes it in); absent for other videos
    max_edit_gap_s: {name: 'longest stretch with no cut, punch-in or graphic', dir: 'high_bad', yellow: 4, unit: 's'},
    dead_air_s: {name: 'longest silence mid-film', dir: 'high_bad', yellow: 0.9, unit: 's'},
    lufs: {name: 'integrated loudness (IG ≈ -14 LUFS)', dir: 'info', unit: 'LUFS'},
    lufs_off: {name: 'loudness distance from -14 LUFS', dir: 'high_bad', yellow: 3, unit: 'LU'},
    true_peak_db: {name: 'true peak', dir: 'high_bad', yellow: -0.5, unit: 'dBFS'},
    fast_ratio: {name: 'fast-motion frame share', dir: 'info'},
    cuts_per_10s: {name: 'cuts / punch-ins per 10 s', dir: 'info'},
  },
};

/**
 * @param {string} file
 * @param {{profile?: keyof typeof PROFILES, subBand?: number}} [o]
 */
export async function measure(file, {profile = 'animation', subBand} = {}) {
  const info = await probe(file);
  const vertical = info.height > info.width;
  const {frames, w, h} = await decode(file, {fps: FPS, width: WIDTH, cropBottom: subBand ?? (vertical ? 0.18 : 0.15)});
  if (frames.length < 4) throw new Error(`${file}: too few frames to analyse`);
  const d = frameDiffs(frames);
  const like = cutLike(d);
  const starts = cutStarts(like);
  const dur = frames.length / FPS;

  const bounds = [0, ...starts.map((s) => s + 1), frames.length];
  const shots = bounds.slice(1).map((b, i) => (b - bounds[i]) / FPS);

  /** @type {Record<string, any>} */
  const res = {
    file,
    profile,
    duration_s: round(info.duration || dur, 2),
    size: [info.width, info.height],
    ...motionStats(d, like, FPS),
    blank_runs_s: blankRuns(frames, w, h, like, FPS),
    cuts_s: starts.map((s) => round((s + 1) / FPS, 2)),
    cuts_per_10s: round((starts.length / dur) * 10, 2),
    max_shot_s: round(Math.max(...shots), 2),
  };
  res.blank_run_s = round(Math.max(0, ...res.blank_runs_s.map((/** @type {number[]} */ r) => r[1] - r[0])), 2);

  const rgb = await decode(file, {fps: 2, width: 160, gray: false});
  const bp = bluePurple(rgb.frames, 2);
  res.blue_purple_share = bp.share;
  res.blue_purple_spans_s = bp.spans;

  if (info.hasAudio) {
    Object.assign(res, parseLoudness(await loudnessLog(file)));
    if (res.lufs != null) res.lufs_off = round(Math.abs(res.lufs + 14), 1);
    const sil = [...(await silenceLog(file)).matchAll(/silence_(start|end): (-?[\d.]+)/g)];
    let longest = 0, open = -1;
    for (const m of sil) {
      const t = Number(m[2]);
      if (m[1] === 'start') open = t;
      else if (open >= 0) {
        // ignore the first 0.5 s and the tail 1.5 s (outro / end card)
        if (open > 0.5 && t < res.duration_s - 1.5) longest = Math.max(longest, t - open);
        open = -1;
      }
    }
    res.dead_air_s = round(longest, 2);
  }
  return grade(res);
}

/** @param {Record<string, any>} res */
export function grade(res) {
  const metrics = PROFILES[res.profile];
  const short = res.duration_s < SHORT_S;
  /** @type {Record<string, 'red' | 'yellow' | 'green' | '--'>} */
  const lights = {};
  for (const [k, m] of Object.entries(metrics)) {
    const v = res[k];
    if (v == null || m.dir === 'info') {
      lights[k] = '--';
      continue;
    }
    const bad = (/** @type {number} */ t) => (m.dir === 'high_bad' ? v >= t : v <= t);
    let lv = /** @type {'red' | 'yellow' | 'green'} */ (m.red != null && bad(m.red) ? 'red' : m.yellow != null && bad(m.yellow) ? 'yellow' : 'green');
    if (lv === 'red' && short && !m.fact) {
      lv = 'yellow';
      res.short_clip_note = `clip is ${res.duration_s}s (< ${SHORT_S}s): motion reds only warn; blank frames still block`;
    }
    lights[k] = lv;
  }
  res.lights = lights;
  res.verdict = Object.values(lights).includes('red') ? 'red' : Object.values(lights).includes('yellow') ? 'yellow' : 'green';
  return res;
}

const LOOK = /** @type {Record<string, (r: any) => string>} */ ({
  fast_ratio: (r) => `only ${(r.fast_ratio * 100).toFixed(1)}% of frames have fast action: plays like a slideshow. Add in-shot motion where the viewer should look (a push to see detail, a glide between objects, the object's own big move). Fades and transitions don't count.`,
  fast_ratio_worst_window: (r) => `${r.worst_window_start_s}s onward is the flattest 30 s (front-loaded edit)`,
  blank_run_s: (r) => `near-blank frames at ${r.blank_runs_s.map((/** @type {number[]} */ x) => `${x[0]}–${x[1]}s`).join(', ')}: keep the subject on screen; don't pass through a flat colour for ≥ 0.3 s`,
  blue_purple_share: (r) => `${Math.round(r.blue_purple_share * 100)}% of frames are blue-purple (${r.blue_purple_spans_s.slice(0, 6).map((/** @type {number[]} */ x) => `${x[0]}–${x[1]}s`).join(', ')}): the most generic AI palette; switch palette unless the story needs it`,
  longest_still_s: (r) => `frozen for ${r.longest_still_s}s from ${r.longest_still_start_s}s`,
  max_shot_s: (r) => `${r.max_shot_s}s without a cut or punch-in; reels lose people here`,
  max_edit_gap_s: (r) => `${r.max_edit_gap_s}s with nothing new on screen (from ${r.max_edit_gap_at_s}s): add a punch-in, sticker or insert`,
  dead_air_s: (r) => `${r.dead_air_s}s of silence mid-reel: tighten the cut`,
  lufs_off: (r) => `loudness ${r.lufs} LUFS; Instagram plays around -14`,
  true_peak_db: (r) => `true peak ${r.true_peak_db} dBFS: clipping risk, limit to -1`,
});

/** Human report lines. */
export function report(/** @type {Record<string, any>} */ res) {
  const icon = {red: '🔴', yellow: '🟡', green: '🟢', '--': '  '};
  const lines = [`${icon[/** @type {'red'} */ (res.verdict)]} ${res.verdict.toUpperCase()}  ${res.file}  (${res.profile}, ${res.duration_s}s)`];
  for (const [k, m] of Object.entries(PROFILES[res.profile])) {
    const lv = res.lights[k];
    lines.push(`  ${icon[/** @type {'red'} */ (lv)]} ${m.name}: ${res[k] ?? 'n/a'}${m.unit ? ' ' + m.unit : ''}`);
    if ((lv === 'red' || lv === 'yellow') && LOOK[k]) lines.push(`      → ${LOOK[k](res)}`);
  }
  if (res.short_clip_note) lines.push(`  note: ${res.short_clip_note}`);
  return lines.join('\n');
}
