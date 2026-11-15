// Vox-style paper kit: marker strokes drawn on like rough-notation (the
// approach behind Magic UI's Highlighter, MIT), torn clipping edges and tape.
import React from 'react';
import {Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {alpha, clamp} from '../../lib/util';

type Box = {x: number; y: number; w: number; h: number};

// Hand-drawn ellipse as a closed path with a little wobble; two passes give
// the doubled stroke of a real marker.
const roughEllipse = (b: Box, seed: string, pass: number) => {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2 + 14;
  const ry = b.h / 2 + 12;
  const pts: string[] = [];
  const start = -0.4 + pass * 0.25;
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = start + (i / steps) * Math.PI * 2.12; // overshoot past the start like a pen
    const wob = 1 + (random(`${seed}${pass}${i}`) - 0.5) * 0.06;
    pts.push(`${(cx + Math.cos(t) * rx * wob).toFixed(1)},${(cy + Math.sin(t) * ry * wob).toFixed(1)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' ')}`;
};

const roughUnderline = (b: Box, seed: string, pass: number) => {
  const y = b.y + b.h + 8 + pass * 9;
  const pts: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = b.x - 6 + ((b.w + 12) * i) / 10;
    pts.push(`${x.toFixed(1)},${(y + (random(`${seed}u${pass}${i}`) - 0.5) * 7).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
};

// Draws a circle, underline or highlighter swipe over `box` (px, in the
// parent's coordinates) starting at local frame `start`.
export const Highlighter: React.FC<{
  box: Box;
  kind: 'circle' | 'underline' | 'highlight';
  start: number;
  duration?: number;
  color: string;
  stroke?: number;
  width: number;
  height: number;
  seed?: string;
}> = ({box, kind, start, duration = 14, color, stroke = 7, width, height, seed = 'hl'}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + duration], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (frame < start) return null;

  if (kind === 'highlight') {
    // Marker swipe sits behind the content; use mixBlendMode multiply on paper.
    return (
      <div
        style={{
          position: 'absolute',
          left: box.x - 10,
          top: box.y + box.h * 0.12,
          width: (box.w + 20) * p,
          height: box.h * 0.82,
          background: alpha(color, 0.55),
          borderRadius: '6px 14px 8px 12px',
          transform: 'rotate(-1.2deg)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
    );
  }

  const paths = [0, 1].map((pass) => (kind === 'circle' ? roughEllipse(box, seed, pass) : roughUnderline(box, seed, pass)));
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      {paths.map((d, i) => {
        const pp = interpolate(p, [i * 0.35, i * 0.35 + 0.65], [0, 1], clamp);
        return (
          <path
            key={i}
            d={d}
            pathLength={100}
            fill="none"
            stroke={color}
            strokeWidth={stroke * (i ? 0.7 : 1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - pp)}
            opacity={i ? 0.75 : 1}
          />
        );
      })}
    </svg>
  );
};

// clip-path polygon with a torn, ragged edge on all four sides.
export const tornClip = (seed: string, rough = 1.4) => {
  const pts: string[] = [];
  const n = 18;
  const j = (k: string) => (random(`${seed}${k}`) * rough).toFixed(2);
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${j(`t${i}`)}%`);
  for (let i = 1; i <= n; i++) pts.push(`${(100 - +j(`r${i}`)).toFixed(2)}% ${((i / n) * 100).toFixed(2)}%`);
  for (let i = n - 1; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${(100 - +j(`b${i}`)).toFixed(2)}%`);
  for (let i = n - 1; i >= 1; i--) pts.push(`${j(`l${i}`)}% ${((i / n) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(', ')})`;
};

// Translucent strip of masking tape.
export const Tape: React.FC<{x: number; y: number; w: number; h: number; angle: number; color?: string}> = ({x, y, w, h, angle, color = '#E9DFC4'}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      transform: `rotate(${angle}deg)`,
      background: alpha(color, 0.78),
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      clipPath: 'polygon(2% 0, 98% 4%, 100% 100%, 0 96%)',
      pointerEvents: 'none',
    }}
  />
);
