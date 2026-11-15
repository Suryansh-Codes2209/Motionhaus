// Backdrops for the edit styles. Frame-driven ports of Magic UI components
// (MIT, github.com/magicuidesign/magicui, via 21st.dev/@dillionverma):
// RetroGrid, DotPattern, Meteors, FlickeringGrid. AuroraBackground follows the
// Aceternity aurora idea. PaperTexture is original. See ./CREDITS.md.
import {noise2D} from '@remotion/noise';
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, useUnit} from '../../lib/util';

// Slow-moving blurred colour bands, like the northern lights.
export const AuroraBackground: React.FC<{bg: string; colors: string[]; strength?: number}> = ({bg, colors, strength = 1}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: bg, overflow: 'hidden'}}>
      {colors.map((c, i) => {
        const t = frame * 0.004 + i * 1.7;
        const x = (0.5 + 0.35 * Math.sin(t)) * width;
        const y = (0.18 + i * 0.16 + 0.06 * Math.cos(t * 1.3)) * height;
        const w = width * (1.5 + 0.2 * Math.sin(t * 0.7));
        const h = height * 0.22;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${alpha(c, 0.55 * strength)} 0%, transparent 70%)`,
              transform: `rotate(${-14 + 8 * Math.sin(t * 0.9)}deg)`,
              filter: `blur(${width * 0.06}px)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Perspective grid floor scrolling toward the camera (synthwave). Projected
// by hand into an SVG: horizontal lines bunch toward the horizon, verticals
// converge on the vanishing point. `horizon` is 0..1 of the frame height.
export const RetroGrid: React.FC<{color: string; horizon?: number; opacity?: number; lanes?: number; speed?: number}> = ({
  color,
  horizon = 0.6,
  opacity = 0.6,
  lanes = 14,
  speed = 0.02,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const hy = height * horizon;
  const depth = height - hy;
  const cx = width / 2;
  const lines: React.ReactNode[] = [];
  // rows: z from 1 (near) to far; y = hy + depth / z
  const phase = (frame * speed) % 1;
  for (let k = 0; k < 18; k++) {
    const z = 1 + (k + 1 - phase) * 0.55;
    const y = hy + depth / z;
    const a = Math.min(1, (y - hy) / (depth * 0.5));
    lines.push(<line key={`h${k}`} x1={0} x2={width} y1={y} y2={y} stroke={color} strokeWidth={1.5 * u} opacity={a} />);
  }
  for (let i = -lanes; i <= lanes; i++) {
    const xNear = cx + (i / lanes) * width * 1.6;
    lines.push(<line key={`v${i}`} x1={cx + (xNear - cx) * 0.02} y1={hy} x2={xNear} y2={height} stroke={color} strokeWidth={1.5 * u} />);
  }
  const mask = `linear-gradient(to bottom, transparent ${horizon * 100}%, black ${(horizon + (1 - horizon) * 0.45) * 100}%)`;
  return (
    <AbsoluteFill style={{opacity, pointerEvents: 'none', maskImage: mask, WebkitMaskImage: mask}}>
      <svg width={width} height={height}>{lines}</svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: hy - 2 * u, height: 3 * u, background: color, filter: `blur(${6 * u}px)`}} />
    </AbsoluteFill>
  );
};

// Dotted canvas that pans slowly, faded to the edges.
export const DotPattern: React.FC<{color: string; gap?: number; dot?: number; drift?: number}> = ({color, gap = 34, dot = 2.4, drift = 0.25}) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const g = gap * u;
  const mask = 'radial-gradient(ellipse 75% 65% at center, black 30%, transparent 100%)';
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${color} ${dot * u}px, transparent ${dot * u + 0.5}px)`,
        backgroundSize: `${g}px ${g}px`,
        backgroundPosition: `${(frame * drift * u) % g}px ${(frame * drift * 0.6 * u) % g}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
        pointerEvents: 'none',
      }}
    />
  );
};

// Shooting stars on a loop; positions are seeded so every render matches.
// direction: degrees of travel (0 = right, 90 = down); 125 = down-left.
export const Meteors: React.FC<{color: string; count?: number; direction?: number; seed?: string}> = ({color, count = 14, direction = 125, seed = 'm'}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const rad = (direction * Math.PI) / 180;
  const [dx, dy] = [Math.cos(rad), Math.sin(rad)];
  const tail = 160 * u;
  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      {Array.from({length: count}, (_, i) => {
        const period = 50 + Math.floor(random(`${seed}p${i}`) * 90);
        const p = ((frame + Math.floor(random(`${seed}o${i}`) * period)) % period) / period;
        const travel = height * 0.9;
        const x = random(`${seed}x${i}`) * width * 1.4 + dx * travel * p;
        const y = random(`${seed}y${i}`) * height * 0.4 - tail + dy * travel * p;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: tail,
              height: 2 * u,
              opacity: Math.sin(Math.PI * p) * 0.8,
              transformOrigin: 'left center',
              transform: `rotate(${direction + 180}deg)`,
              background: `linear-gradient(to right, ${color}, transparent)`,
              boxShadow: `0 0 ${6 * u}px ${alpha(color, 0.6)}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// A grid of cells that flicker at random, re-seeded every few frames.
export const FlickeringGrid: React.FC<{color: string; cell?: number; maxOpacity?: number; every?: number}> = ({
  color,
  cell = 40,
  maxOpacity = 0.22,
  every = 4,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const s = cell * u;
  const cols = Math.ceil(width / s);
  const rows = Math.ceil(height / s);
  const tick = Math.floor(frame / every);
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const r = random(`fg${x}-${y}-${tick}`);
      if (r < 0.82) continue;
      rects.push(<rect key={`${x}-${y}`} x={x * s + 2 * u} y={y * s + 2 * u} width={s - 4 * u} height={s - 4 * u} fill={color} opacity={(r - 0.82) / 0.18 * maxOpacity} />);
    }
  const mask = 'radial-gradient(ellipse 80% 70% at center, black 20%, transparent 100%)';
  return (
    <AbsoluteFill style={{maskImage: mask, WebkitMaskImage: mask, pointerEvents: 'none'}}>
      <svg width={width} height={height}>{rects}</svg>
    </AbsoluteFill>
  );
};

// Newsprint: warm paper, fibres, a faint halftone and a centre fold. The
// fibres are fixed (paper doesn't boil); a slow noise drift keeps it alive.
export const PaperTexture: React.FC<{paper: string; ink: string}> = ({paper, ink}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const dx = noise2D('paper', frame * 0.004, 0) * 12 * u;
  return (
    <AbsoluteFill style={{backgroundColor: paper, overflow: 'hidden'}}>
      <AbsoluteFill style={{mixBlendMode: 'multiply', opacity: 0.55, transform: `translateX(${dx}px) scale(1.05)`}}>
        <svg width={width} height={height}>
          <filter id="mh-paper">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves={3} seed={7} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.35 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#mh-paper)" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${alpha(ink, 0.07)} ${1.6 * u}px, transparent ${2.2 * u}px)`,
          backgroundSize: `${9 * u}px ${9 * u}px`,
          maskImage: 'linear-gradient(160deg, black 0%, transparent 40%, transparent 70%, black 100%)',
          WebkitMaskImage: 'linear-gradient(160deg, black 0%, transparent 40%, transparent 70%, black 100%)',
        }}
      />
      {/* centre fold */}
      <AbsoluteFill style={{background: `linear-gradient(90deg, transparent 48.5%, ${alpha(ink, 0.06)} 50%, transparent 51.5%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, ${alpha('#5a4630', 0.22)} 100%)`}} />
    </AbsoluteFill>
  );
};
