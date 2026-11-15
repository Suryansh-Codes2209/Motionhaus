// Full-frame finishing layers and hit effects for the edit styles: CRT
// scanlines, RGB glitch bursts, ripple rings and a scrolling marquee
// (frame-driven port of Magic UI's Marquee, MIT, via 21st.dev/@dillionverma).
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, clamp, useUnit} from '../../lib/util';

// CRT monitor: scanlines that crawl, a soft rolling bar, flicker and a curved vignette.
export const CRT: React.FC<{tint: string; amount?: number}> = ({tint, amount = 1}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const u = useUnit();
  const flicker = 0.92 + random(`crt${frame}`) * 0.08;
  const bar = ((frame * 6) % (height * 1.6)) - height * 0.3;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: amount}}>
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) ${2 * u}px, transparent ${2 * u}px, transparent ${5 * u}px)`,
          backgroundPosition: `0 ${(frame * 0.5 * u) % (5 * u)}px`,
          opacity: flicker,
        }}
      />
      <div style={{position: 'absolute', left: 0, right: 0, top: bar, height: 220 * u, background: `linear-gradient(to bottom, transparent, ${alpha(tint, 0.05)}, transparent)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 120% 95% at center, transparent 62%, rgba(0,0,0,0.75) 100%)`}} />
      <AbsoluteFill style={{boxShadow: `inset 0 0 ${160 * u}px ${alpha(tint, 0.08)}`}} />
    </AbsoluteFill>
  );
};

// ~10 frames of torn colour bars and a white tear. Wrap in a <Sequence>.
export const GlitchBurst: React.FC<{colorA: string; colorB: string; seed?: string}> = ({colorA, colorB, seed = 'gb'}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  if (frame > 10) return null;
  const strength = interpolate(frame, [0, 2, 10], [0, 1, 0], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {Array.from({length: 7}, (_, i) => {
        const y = random(`${seed}y${i}${frame >> 1}`) * height;
        const h = 8 + random(`${seed}h${i}${frame}`) * 70;
        const x = (random(`${seed}x${i}${frame}`) - 0.5) * 120;
        return <div key={i} style={{position: 'absolute', left: x, right: -x, top: y, height: h, background: i % 2 ? colorA : colorB, opacity: 0.55 * strength}} />;
      })}
      <AbsoluteFill style={{background: '#ffffff', opacity: strength * 0.25}} />
    </AbsoluteFill>
  );
};

// Concentric rings expanding from the centre (calm "hit" for explainers).
export const Ripple: React.FC<{color: string; rings?: number}> = ({color, rings = 3}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center', justifyContent: 'center'}}>
      {Array.from({length: rings}, (_, i) => {
        const t = interpolate(frame - i * 5, [0, 36], [0, 1], clamp);
        const size = Math.min(width, height) * (0.2 + t * 1.1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `3px solid ${alpha(color, 0.5 * (1 - t))}`,
              left: width / 2 - size / 2,
              top: height / 2 - size / 2,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// A row of items scrolling sideways forever (duplicated for a seamless loop).
export const Marquee: React.FC<{children: React.ReactNode; speed?: number; reverse?: boolean; gap?: number; itemWidth: number; count: number}> = ({
  children,
  speed = 2,
  reverse,
  gap = 24,
  itemWidth,
  count,
}) => {
  const frame = useCurrentFrame();
  const span = (itemWidth + gap) * count;
  const x = -((frame * speed) % span);
  return (
    <div style={{overflow: 'hidden', width: '100%'}}>
      <div style={{display: 'flex', gap, width: 'max-content', transform: `translateX(${reverse ? -span - x : x}px)`}}>
        {children}
        {children}
        {children}
      </div>
    </div>
  );
};
