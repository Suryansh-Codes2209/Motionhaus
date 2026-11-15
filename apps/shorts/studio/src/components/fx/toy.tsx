import {noise2D} from '@remotion/noise';
import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {labelFamily} from '../../fonts';
import {alpha, clamp, useUnit} from '../../lib/util';

// toybox: warm paper with two soft colour blobs drifting under it, like light
// on a desk. Nothing busy: the tiles are the show.
export const ToyBackdrop: React.FC<{paper: string; accent: string; accent2: string}> = ({paper, accent, accent2}) => {
  const frame = useCurrentFrame();
  const blob = (seed: string, color: string, x0: number, y0: number, r: number) => {
    const x = x0 + noise2D(`${seed}x`, frame * 0.004, 0) * 8;
    const y = y0 + noise2D(`${seed}y`, 0, frame * 0.004) * 6;
    return <AbsoluteFill style={{background: `radial-gradient(circle ${r}vmax at ${x}% ${y}%, ${alpha(color, 0.13)}, transparent 70%)`}} />;
  };
  return (
    <AbsoluteFill style={{backgroundColor: paper}}>
      {blob('a', accent, 18, 22, 46)}
      {blob('b', accent2, 84, 78, 52)}
    </AbsoluteFill>
  );
};

// A tilted die-cut sticker ("FREE", "NEW"): slaps on with an overshoot and a
// white border, the way a sticker sheet looks.
export const Sticker: React.FC<{text: string; at: number; color: string; ink?: string; angle?: number; size?: number}> = ({
  text,
  at,
  color,
  ink = '#ffffff',
  angle = -8,
  size = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useUnit() * size;
  const s = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 260, mass: 0.6}});
  if (frame < at) return null;
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${10 * u}px ${26 * u}px`,
        borderRadius: 18 * u,
        background: color,
        color: ink,
        fontFamily: labelFamily,
        fontWeight: 700,
        fontSize: 40 * u,
        letterSpacing: 2 * u,
        border: `${5 * u}px solid #ffffff`,
        boxShadow: `0 ${10 * u}px ${24 * u}px rgba(0,0,0,0.18)`,
        transform: `rotate(${angle + (1 - s) * 18}deg) scale(${interpolate(s, [0, 1], [1.8, 1])})`,
        opacity: Math.min(1, s * 3),
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

// Hit: soft rounded confetti (dots, pills, squiggle-free) bursting from the
// centre and falling with a little gravity. Deterministic per seed.
export const Confetti: React.FC<{colors: string[]; seed: string; count?: number}> = ({colors, seed, count = 26}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const u = useUnit();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}, (_, i) => {
        const r = (k: string) => random(`${seed}${k}${i}`);
        const ang = r('a') * Math.PI * 2;
        const v = (700 + r('v') * 900) * u;
        const x = width / 2 + Math.cos(ang) * v * t;
        const y = height * 0.45 + Math.sin(ang) * v * t * 0.8 + 1400 * u * t * t;
        const w = (r('p') > 0.5 ? 34 : 20) * u;
        const h = r('p') > 0.5 ? 14 * u : w;
        const fade = interpolate(frame, [18, 40], [1, 0], clamp);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              borderRadius: h,
              background: colors[i % colors.length],
              transform: `rotate(${r('r') * 360 + frame * 9}deg)`,
              opacity: fade,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
