import {noise2D} from '@remotion/noise';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, isDark, useUnit} from '../lib/util';
import {config} from '../video.config';

// Continuous backdrop that lives under every scene: drifting color blobs and a
// slowly scrolling perspective grid, faded toward the edges.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const {bg, fg, accent, accent2} = config.brand.colors;
  const strength = isDark(bg) ? 1 : 0.55;

  const blobs = [
    {color: accent, size: 0.95, seed: 'a', opacity: 0.42},
    {color: accent2, size: 0.8, seed: 'b', opacity: 0.32},
    {color: accent, size: 0.55, seed: 'c', opacity: 0.22},
  ];
  const big = Math.max(width, height);

  return (
    <AbsoluteFill style={{backgroundColor: bg, overflow: 'hidden'}}>
      {blobs.map((b) => {
        const x = (0.5 + noise2D(b.seed + 'x', frame * 0.0035, 0) * 0.5) * width;
        const y = (0.5 + noise2D(b.seed + 'y', 0, frame * 0.0035) * 0.5) * height;
        const size = big * b.size;
        return (
          <div
            key={b.seed}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(b.color, b.opacity * strength)} 0%, transparent 65%)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(fg, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(fg, 0.07)} 1px, transparent 1px)`,
          backgroundSize: `${90 * u}px ${90 * u}px`,
          backgroundPosition: `0px ${frame * 0.6 * u}px`,
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
        }}
      />
    </AbsoluteFill>
  );
};
