// Frame-driven ports of Magic UI's AnimatedBeam and BorderBeam (MIT,
// github.com/magicuidesign/magicui, via 21st.dev/@dillionverma). The originals
// measure DOM refs and animate with motion/react + CSS offset-path; here the
// geometry is passed in and every frame is computed, so renders are exact.
import React, {useId} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {alpha, clamp} from '../../lib/util';

type Pt = {x: number; y: number};

const quad = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

const quadLength = (a: Pt, c: Pt, b: Pt) => {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 24; i++) {
    const p = quad(a, c, b, i / 24);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
};

// A faint path between two points with a bright gradient pulse travelling
// along it. `start` is the local frame the pulse leaves `from`; it arrives
// after `duration` frames and then loops every `every` frames if set.
// Positions are in the coordinate space of the parent (absolute fill).
export const AnimatedBeam: React.FC<{
  from: Pt;
  to: Pt;
  curvature?: number; // px the curve bows sideways (+ = right of travel)
  start: number;
  duration: number;
  every?: number;
  width: number;
  height: number;
  colorFrom: string;
  colorTo: string;
  pathColor: string;
  pathWidth?: number;
  drawIn?: number; // frames to draw the faint path before the first pulse
}> = ({from, to, curvature = 0, start, duration, every, width, height, colorFrom, colorTo, pathColor, pathWidth = 3, drawIn = 8}) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, '');
  const mid = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2};
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const n = Math.hypot(dx, dy) || 1;
  const ctrl = {x: mid.x + (-dy / n) * curvature, y: mid.y + (dx / n) * curvature};
  const d = `M ${from.x},${from.y} Q ${ctrl.x},${ctrl.y} ${to.x},${to.y}`;
  const len = quadLength(from, ctrl, to);

  const drawn = interpolate(frame, [start - drawIn, start], [0, 1], clamp);
  const local = every && frame > start + duration ? ((frame - start) % every) : frame - start;
  const p = interpolate(local, [0, duration], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const seg = Math.max(60, len * 0.35);
  const live = frame >= start;
  const head = quad(from, ctrl, to, p);

  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
        <filter id={`f${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={pathWidth * 2} />
        </filter>
      </defs>
      <path d={d} stroke={pathColor} strokeWidth={pathWidth} strokeLinecap="round" fill="none" strokeDasharray={len} strokeDashoffset={len * (1 - drawn)} />
      {live ? (
        <>
          <path d={d} stroke={`url(#g${id})`} strokeWidth={pathWidth * 3} fill="none" strokeLinecap="round" strokeDasharray={`${seg} ${len + seg}`} strokeDashoffset={seg - (len + seg) * p} filter={`url(#f${id})`} opacity={0.9} />
          <path d={d} stroke={`url(#g${id})`} strokeWidth={pathWidth} fill="none" strokeLinecap="round" strokeDasharray={`${seg} ${len + seg}`} strokeDashoffset={seg - (len + seg) * p} />
          {p > 0 && p < 1 ? <circle cx={head.x} cy={head.y} r={pathWidth * 1.8} fill={colorTo} style={{filter: `drop-shadow(0 0 ${pathWidth * 3}px ${alpha(colorTo, 0.9)})`}} /> : null}
        </>
      ) : null}
    </svg>
  );
};

// A short bright dash orbiting a rounded-rect border. Put it inside a
// position:relative box and pass the box size.
export const BorderBeam: React.FC<{
  width: number;
  height: number;
  radius: number;
  colorFrom: string;
  colorTo: string;
  borderWidth?: number;
  period?: number; // frames per lap
  offset?: number; // 0..1 starting point
  length?: number; // 0..1 share of the perimeter lit
  opacity?: number;
}> = ({width, height, radius, colorFrom, colorTo, borderWidth = 3, period = 120, offset = 0, length = 0.18, opacity = 1}) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, '');
  const p = (offset + frame / period) % 1;
  const lit = length * 100;
  const dash = {strokeDasharray: `${lit} ${100 - lit}`, strokeDashoffset: -p * 100};
  const r = Math.min(radius, width / 2, height / 2);
  const inset = borderWidth / 2;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', opacity}}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
        <filter id={`bf${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={borderWidth * 2.5} />
        </filter>
      </defs>
      {[{f: `url(#bf${id})`, w: borderWidth * 3}, {f: undefined, w: borderWidth}].map((l, i) => (
        <rect key={i} x={inset} y={inset} width={width - borderWidth} height={height - borderWidth} rx={r} ry={r} pathLength={100} fill="none" stroke={`url(#b${id})`} strokeWidth={l.w} strokeLinecap="round" filter={l.f} {...dash} />
      ))}
    </svg>
  );
};
