// Pure frame metrics. Ported from huashu-art-motion (MIT, alchaincyf):
// scripts/film_gate.py and scripts/analyze/breakdown.py. Frames are
// Uint8Array grayscale (w*h) or RGB (w*h*3), decoded by frames.mjs.
// Thresholds keep the upstream calibration; see gate.mjs for which ones.

/** Mean absolute difference between consecutive frames (0–255). */
export function frameDiffs(/** @type {Uint8Array[]} */ F) {
  const d = new Float64Array(Math.max(0, F.length - 1));
  for (let i = 0; i < d.length; i++) {
    const a = F[i], b = F[i + 1];
    let s = 0;
    for (let k = 0; k < a.length; k++) s += Math.abs(a[k] - b[k]);
    d[i] = s / a.length;
  }
  return d;
}

const median = (/** @type {number[]} */ xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Whole-frame jumps that stand out from their neighbourhood: hard cuts and
 * multi-frame transition effects. Upstream also requires the jump not to be
 * explained by camera motion (LK + RANSAC); without OpenCV we skip that, so a
 * very fast whip-pan can count as a transition. That only ever excludes
 * frames from the motion stats, never adds them.
 * @param {Float64Array} d @returns {boolean[]}
 */
export function cutLike(d) {
  const out = [];
  for (let i = 0; i < d.length; i++) {
    const nb = [...d.slice(Math.max(0, i - 6), i), ...d.slice(i + 1, Math.min(d.length, i + 7))];
    out.push(d[i] >= Math.max(8, 3 * median(nb) + 2));
  }
  return out;
}

/** First frame of each run of cut-like frames. */
export const cutStarts = (/** @type {boolean[]} */ like) => like.flatMap((v, i) => (v && !like[i - 1] ? [i] : []));

/**
 * Motion stats over non-transition frame pairs.
 * fast ≥ 9 is upstream's calibrated "visible action" level (12 fps, 320 wide).
 * @param {Float64Array} d @param {boolean[]} trans @param {number} fps
 */
export function motionStats(d, trans, fps) {
  const STILL = 0.3, FAST = 9;
  const good = [...d].map((v, i) => (trans[i] ? null : v));
  const vals = /** @type {number[]} */ (good.filter((v) => v !== null));
  const fastRatio = vals.length ? vals.filter((v) => v >= FAST).length / vals.length : 0;

  // worst 30 s window (or the whole clip if shorter)
  const win = Math.min(d.length, Math.round(30 * fps));
  let worst = fastRatio, worstAt = 0;
  if (win < d.length) {
    worst = Infinity;
    for (let s = 0; s + win <= d.length; s += Math.max(1, Math.round(fps))) {
      const w = good.slice(s, s + win).filter((v) => v !== null);
      const r = w.length ? /** @type {number[]} */ (w).filter((v) => v >= FAST).length / w.length : 0;
      if (r < worst) [worst, worstAt] = [r, s];
    }
  }

  let longest = 0, run = 0, longestAt = 0;
  d.forEach((v, i) => {
    run = v < STILL && !trans[i] ? run + 1 : 0;
    if (run > longest) [longest, longestAt] = [run, i - run + 1];
  });

  return {
    fast_ratio: round(fastRatio, 3),
    fast_ratio_worst_window: round(worst, 3),
    worst_window_start_s: round(worstAt / fps, 1),
    still_ratio: round(vals.length ? vals.filter((v) => v < STILL).length / vals.length : 0, 3),
    longest_still_s: round(longest / fps, 2),
    longest_still_start_s: round(longestAt / fps, 2),
  };
}

/**
 * Near-blank frames mid-film: < 0.2 % of pixels with Sobel gradient > 24
 * (judged by edges, not colour, so a whiteboard line or a formula on black is
 * not blank). Ignores the first/last 0.5 s and frames next to transitions.
 * @param {Uint8Array[]} F @param {number} w @param {number} h
 * @param {boolean[]} trans @param {number} fps
 * @returns {[number, number][]} runs ≥ 0.3 s, in seconds
 */
export function blankRuns(F, w, h, trans, fps, {grad = 24, frac = 0.002, edgeS = 0.5, minS = 0.3} = {}) {
  const n = F.length;
  const ok = new Array(n).fill(true);
  const e = Math.round(edgeS * fps);
  for (let i = 0; i < Math.min(e, n); i++) ok[i] = ok[n - 1 - i] = false;
  trans.forEach((t, i) => {
    if (t) ok[i] = ok[i + 1] = false;
  });
  const g2 = grad * grad;
  const blank = F.map((fr) => {
    let hits = 0;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const p = (/** @type {number} */ yy, /** @type {number} */ xx) => fr[yy * w + xx];
        const gx = p(y - 1, x + 1) + 2 * p(y, x + 1) + p(y + 1, x + 1) - p(y - 1, x - 1) - 2 * p(y, x - 1) - p(y + 1, x - 1);
        const gy = p(y + 1, x - 1) + 2 * p(y + 1, x) + p(y + 1, x + 1) - p(y - 1, x - 1) - 2 * p(y - 1, x) - p(y - 1, x + 1);
        if (gx * gx + gy * gy > g2) hits++;
      }
    return hits / (w * h) < frac;
  });
  /** @type {[number, number][]} */
  const runs = [];
  let s0 = -1;
  [...blank.map((b, i) => b && ok[i]), false].forEach((v, i) => {
    if (v && s0 < 0) s0 = i;
    else if (!v && s0 >= 0) {
      if ((i - s0) / fps >= minS - 1e-9) runs.push([round(s0 / fps, 2), round(i / fps, 2)]);
      s0 = -1;
    }
  });
  return runs;
}

/**
 * Blue-purple "AI slop" palette share: a frame counts when ≥ 30 % of pixels
 * have hue 225–300°, saturation ≥ 0.30, value 0.06–0.90 (navy ~210° is fine).
 * @param {Uint8Array[]} rgb frames @param {number} fps
 */
export function bluePurple(rgb, fps) {
  const bad = rgb.map((fr) => {
    let m = 0;
    const px = fr.length / 3;
    for (let k = 0; k < fr.length; k += 3) {
      const r = fr[k] / 255, g = fr[k + 1] / 255, b = fr[k + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn + 1e-6;
      const sat = d / (mx + 1e-6);
      const hue = 60 * (mx === r ? (((g - b) / d) % 6 + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
      if (hue >= 225 && hue <= 300 && sat >= 0.3 && mx >= 0.06 && mx <= 0.9) m++;
    }
    return m / px >= 0.3;
  });
  /** @type {[number, number][]} */
  const spans = [];
  let s = -1;
  [...bad, false].forEach((x, i) => {
    if (x && s < 0) s = i;
    if (!x && s >= 0) {
      if (i - s >= 2) spans.push([round(s / fps, 1), round(i / fps, 1)]);
      s = -1;
    }
  });
  return {share: round(bad.length ? bad.filter(Boolean).length / bad.length : 0, 3), spans};
}

/**
 * Do the cuts sit on a beat grid? Finds the largest step such that ≥ 80 % of
 * cut frames land within 1.5 frames of t0 + k·step (largest first, since tiny
 * steps fit anything). From breakdown.py.
 * @param {number[]} starts cut frames @param {number} fps
 */
export function fitGrid(starts, fps) {
  if (starts.length < 4) return null;
  let maxGap = 0;
  for (let i = 1; i < starts.length; i++) maxGap = Math.max(maxGap, starts[i] - starts[i - 1]);
  /** @type {any} */
  let best = null;
  for (let c = 400; c <= Math.round(maxGap * 100) + 1; c++) {
    const step = c / 100;
    for (const t0 of starts.slice(0, 3)) {
      const k = starts.map((s) => Math.round((s - t0) / step));
      const res = starts.map((s, i) => s - (t0 + k[i] * step));
      const inl = res.map((r) => Math.abs(r) <= 1.5);
      const nIn = inl.filter(Boolean).length;
      if (nIn / starts.length < 0.8) continue;
      if (!best || step > best.step || (step === best.step && nIn > best.nIn)) {
        const t0f = t0 + res.filter((_, i) => inl[i]).reduce((a, b) => a + b, 0) / nIn;
        const res2 = starts.map((s, i) => s - (t0f + k[i] * step));
        best = {step, nIn, t0: t0f, k, err: Math.max(...res2.filter((_, i) => inl[i]).map(Math.abs)), outliers: inl.flatMap((v, i) => (v ? [] : [i]))};
      }
    }
  }
  if (!best) return null;
  // "Largest step that fits" overshoots within the tolerance; refine step and
  // t0 by least squares over the inliers (not upstream; makes the BPM exact).
  /** @type {number[]} */
  const ks = [];
  /** @type {number[]} */
  const ss = [];
  best.k.forEach((/** @type {number} */ k, /** @type {number} */ i) => {
    if (!best.outliers.includes(i)) ks.push(k), ss.push(starts[i]);
  });
  const mean = (/** @type {number[]} */ xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mk = mean(ks), ms = mean(ss);
  const vk = ks.reduce((a, k) => a + (k - mk) ** 2, 0);
  if (vk > 0) {
    best.step = ks.reduce((a, k, j) => a + (k - mk) * (ss[j] - ms), 0) / vk;
    best.t0 = ms - best.step * mk;
    best.err = Math.max(...ss.map((s, j) => Math.abs(s - (best.t0 + ks[j] * best.step))));
  }
  return {
    t0_frame: round(best.t0, 2),
    step_frames: round(best.step, 3),
    max_residual_frames: round(best.err, 2),
    units_per_cut: best.k,
    outlier_cut_index: best.outliers,
    bpm_if_step_is_eighth: round((60 * fps) / best.step / 2, 2),
    bpm_if_step_is_quarter: round((60 * fps) / best.step, 2),
  };
}

/** Parse ffmpeg `ebur128=peak=true` summary. */
export function parseLoudness(/** @type {string} */ log) {
  const tail = log.slice(log.lastIndexOf('Summary:'));
  const num = (/** @type {RegExp} */ re) => {
    const m = tail.match(re);
    return m ? Number(m[1]) : null;
  };
  return {lufs: num(/I:\s+(-?[\d.]+) LUFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/), true_peak_db: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/)};
}

export const round = (/** @type {number} */ x, /** @type {number} */ p) => Math.round(x * 10 ** p) / 10 ** p;
