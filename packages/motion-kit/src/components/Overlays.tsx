import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, isDark} from '../lib/util';
import {config} from '../video.config';

// Animated film grain. Changing the turbulence seed every frame makes it "boil"
// like real film instead of sitting on the image like a texture.
export const Grain: React.FC<{amount: number}> = ({amount}) => {
  const frame = useCurrentFrame();
  if (amount <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: amount, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id="lr-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={frame % 12}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lr-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{amount: number}> = ({amount}) => {
  if (amount <= 0) return null;
  const strength = isDark(config.brand.colors.bg) ? amount : amount * 0.4;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
};

// Warm anamorphic light sweep. Put it in a <Sequence> around big reveals.
export const LightLeak: React.FC<{duration: number; flip?: boolean}> = ({duration, flip}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const p = Math.min(1, Math.max(0, frame / duration));
  const peak = isDark(config.brand.colors.bg) ? 0.85 : 0.45;
  const opacity = Math.pow(Math.sin(Math.PI * p), 1.5) * peak;
  const x = interpolate(p, [0, 1], flip ? [1.2, -0.2] : [-0.2, 1.2]) * width;
  const size = Math.max(width, height) * 1.3;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: height * 0.15 - size / 2,
          width: size,
          height: size,
          background:
            'radial-gradient(ellipse 50% 35% at center, rgba(255,170,90,0.95) 0%, rgba(255,90,60,0.45) 35%, transparent 70%)',
          transform: 'rotate(-18deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - size * 0.3,
          top: height * 0.6 - size * 0.2,
          width: size * 0.6,
          height: size * 0.4,
          background: `radial-gradient(ellipse at center, ${config.brand.colors.accent2} 0%, transparent 65%)`,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

// White punch on impact frames.
export const Flash: React.FC<{color?: string}> = ({color = '#ffffff'}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, 12], [0, 0.75, 0], clamp);
  return <AbsoluteFill style={{backgroundColor: color, opacity, pointerEvents: 'none'}} />;
};
