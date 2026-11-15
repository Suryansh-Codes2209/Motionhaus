import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp} from '../lib/util';

// Rado, the Launch Radar mascot: the rocket from the channel mark with a
// face and arms. Everything is a pure function of the frame (no CSS
// animation), so any frame renders on its own.
//
// talk: 0..1 mouth opening for this frame (Host derives it from VO words).
// look: -1..1 where the eyes look (toward the content).

// shock: hands up by the face, eyes wide, mouth an O (thumbnails, "wait, what?" beats)
export type Gesture = 'wave' | 'point' | 'think' | 'cheer' | 'idle' | 'shock';

const BODY = '#F4F1EC';
const INK = '#0D0C12';
const HOT = '#FF3D2E';
const GOLD = '#FFB020';

type Arm = {shoulder: number; elbow: number}; // degrees; 0 = straight down, positive = out to the side

/** Arm angles per gesture at time t (seconds since the host appeared). side: 1 = right arm. */
function armPose(g: Gesture, side: 1 | -1, t: number, pointSide: 1 | -1): Arm {
  const swing = Math.sin(t * 2.2 + (side > 0 ? 0 : Math.PI)) * 6;
  switch (g) {
    case 'wave':
      return side === 1 ? {shoulder: 150, elbow: 20 + Math.sin(t * 9) * 28} : {shoulder: 18 + swing, elbow: 10};
    case 'point':
      return side === pointSide ? {shoulder: 92 + Math.sin(t * 3) * 4, elbow: 4} : {shoulder: 16 + swing, elbow: 12};
    case 'think':
      return side === 1 ? {shoulder: 40, elbow: 135} : {shoulder: 30, elbow: 70};
    case 'shock':
      return {shoulder: 128, elbow: 118};
    case 'cheer':
      return {shoulder: 150 + Math.sin(t * 7 + (side > 0 ? 0 : 1.4)) * 12, elbow: 10};
    default:
      return {shoulder: 16 + swing, elbow: 12};
  }
}

const ArmPath: React.FC<{x: number; y: number; side: 1 | -1; pose: Arm}> = ({x, y, side, pose}) => {
  const U = 74; // upper arm
  const F = 66; // forearm
  const a1 = ((side * pose.shoulder) * Math.PI) / 180;
  const ex = x + Math.sin(a1) * U;
  const ey = y + Math.cos(a1) * U;
  const a2 = a1 + ((side * pose.elbow) * Math.PI) / 180;
  const hx = ex + Math.sin(a2) * F;
  const hy = ey + Math.cos(a2) * F;
  return (
    <g>
      <path d={`M${x} ${y} L${ex} ${ey} L${hx} ${hy}`} fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hx} cy={hy} r={21} fill={BODY} stroke={INK} strokeWidth={7} />
    </g>
  );
};

export const Mascot: React.FC<{gesture: Gesture; talk: number; look: number; t: number; pointSide?: 1 | -1; seed?: number}> = ({gesture, talk, look, t, pointSide = 1, seed = 0}) => {
  // Blink: a 5-frame close every ~3.3 s, offset per scene so blinks don't sync.
  const f = Math.round(t * 30) + seed * 37;
  const phase = f % 100;
  const blink = phase < 5 ? 1 - Math.sin((phase / 5) * Math.PI) : 1;
  const flame = 0.85 + Math.sin(t * 31) * 0.08 + Math.sin(t * 13.7) * 0.07;
  const px = look * 7;
  const mouthH = 5 + talk * 26;
  const shock = gesture === 'shock';
  const brow = shock ? -16 : gesture === 'think' ? -6 : talk > 0.2 ? -3 : 0;

  return (
    <svg viewBox="0 0 400 620" width="100%" height="100%" style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="rado-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD} />
          <stop offset="0.55" stopColor={HOT} />
          <stop offset="1" stopColor={HOT} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rado-band" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={HOT} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>
      {/* flame */}
      <path d="M160 440 C 165 500 185 540 200 590 C 215 540 235 500 240 440 Z" fill="url(#rado-flame)" transform={`translate(200 440) scale(1 ${flame}) translate(-200 -440)`} />
      {/* fins (feet) */}
      <path d="M108 300 C 50 330 28 390 30 440 L 112 400 Z" fill={INK} />
      <path d="M292 300 C 350 330 372 390 370 440 L 288 400 Z" fill={INK} />
      {/* arms behind the body edge */}
      <ArmPath x={102} y={262} side={-1} pose={armPose(gesture, -1, t, pointSide)} />
      <ArmPath x={298} y={262} side={1} pose={armPose(gesture, 1, t, pointSide)} />
      {/* body */}
      <path d="M200 30 C 296 114 320 246 308 390 L 92 390 C 80 246 104 114 200 30 Z" fill={BODY} stroke={INK} strokeWidth={8} />
      {/* nose band */}
      <path d="M150 110 C 182 98 218 98 250 110 L 238 84 C 214 76 186 76 162 84 Z" fill="url(#rado-band)" />
      {/* nozzle */}
      <path d="M142 390 L 258 390 L 238 438 L 162 438 Z" fill={INK} />
      {/* face */}
      <g transform={`translate(${px * 0.4} 0)`}>
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${200 + s * 42} 205)`}>
            <path d={`M-20 ${-38 + brow} Q 0 ${-48 + brow} 20 ${-38 + brow}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            {shock ? (
              <>
                {/* wide eyes: white with small pupils */}
                <ellipse cx={0} cy={0} rx={27} ry={33} fill="#ffffff" stroke={INK} strokeWidth={7} />
                <circle cx={px * 0.6} cy={2} r={10} fill={INK} />
              </>
            ) : (
              <>
                <ellipse cx={0} cy={0} rx={22} ry={28 * blink + 2} fill={INK} />
                {blink > 0.5 ? <circle cx={px - 6} cy={-9} r={7} fill="#ffffff" /> : null}
              </>
            )}
          </g>
        ))}
        <ellipse cx={200 - 78} cy={252} rx={17} ry={10} fill={HOT} opacity={0.35} />
        <ellipse cx={200 + 78} cy={252} rx={17} ry={10} fill={HOT} opacity={0.35} />
        {/* mouth: a smile when quiet, an open mouth when talking */}
        {shock ? (
          <ellipse cx={200} cy={276} rx={20} ry={26} fill={INK} />
        ) : talk < 0.08 ? (
          <path d="M176 262 Q 200 284 224 262" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        ) : (
          <g>
            <ellipse cx={200} cy={268} rx={24} ry={mouthH / 2 + 3} fill={INK} />
            <ellipse cx={200} cy={268 + mouthH / 4} rx={13} ry={Math.max(2, mouthH / 5)} fill={HOT} />
          </g>
        )}
      </g>
    </svg>
  );
};

/** Mouth opening at frame `f` from word timings (frames, relative to the same origin). */
export function mouthAt(f: number, words: {from: number; to: number}[], fps: number): number {
  for (const w of words) {
    if (f < w.from - 1 || f > w.to + 1) continue;
    const len = Math.max(1, w.to - w.from);
    const p = (f - w.from) / len;
    // roughly one syllable per ~0.18 s: the mouth opens and closes through the word
    const syll = Math.max(1, Math.round(len / (0.18 * fps)));
    return interpolate(p, [0, 0.1, 0.9, 1], [0.2, 1, 1, 0.2], clamp) * (0.45 + 0.55 * Math.abs(Math.sin(p * syll * Math.PI)));
  }
  return 0;
}

/** Spring in from below, sink out at the end: returns {y, rot, opacity}. */
export function hostMotion(frame: number, duration: number, fps: number) {
  const s = spring({frame, fps, config: {damping: 11, stiffness: 120, mass: 0.9}});
  const out = interpolate(frame, [duration - 14, duration], [0, 1], clamp);
  return {y: (1 - s) * 520 + out * 560, rot: (1 - s) * -18 + out * 10, opacity: Math.min(1, s * 3) * (1 - out)};
}
