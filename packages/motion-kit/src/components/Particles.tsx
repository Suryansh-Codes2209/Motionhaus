import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, useUnit} from '../lib/util';
import {config} from '../video.config';

// Sparks that explode from the center on a hit, slow down, fall a little and
// fade. Put it in a <Sequence> starting on the hit frame.
export const ParticleBurst: React.FC<{seed: string; count?: number; duration?: number}> = ({
  seed,
  count = 46,
  duration = 40,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const {accent, accent2, fg} = config.brand.colors;
  const colors = [accent, accent2, fg];
  const reach = Math.max(width, height) * 0.55;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const life = duration * (0.55 + r('life') * 0.45);
        const p = interpolate(frame, [0, life], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        if (p >= 1) return null;
        const angle = r('a') * Math.PI * 2;
        const dist = reach * (0.25 + r('d') * 0.75) * p;
        const x = width / 2 + Math.cos(angle) * dist;
        const y = height / 2 + Math.sin(angle) * dist + p * p * 140 * u;
        const size = (3 + r('s') * 7) * u;
        // Streak along the direction of travel while fast, round when slow.
        const stretch = 1 + (1 - p) * 5;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: size,
              background: color,
              boxShadow: `0 0 ${size * 2.5}px ${color}`,
              opacity: 1 - p,
              transform: `rotate(${angle}rad) scaleX(${stretch})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const SHAPES = ['circle', 'square', 'triangle', 'ring', 'plus'] as const;

// Geometric shapes fly in from off-frame, spiral toward the center and collapse
// into it at `at` (the logo drop), then shatter outward.
export const ShapeAssemble: React.FC<{at: number; count?: number}> = ({at, count = 14}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const {accent, accent2, fg} = config.brand.colors;
  const colors = [accent, accent2, fg];
  const far = Math.max(width, height) * 0.75;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`assemble-${i}-${k}`);
        const shape = SHAPES[i % SHAPES.length];
        const color = colors[i % colors.length];
        const size = (40 + r('s') * 90) * u;
        // In: far → center while orbiting it. Out: shards fly back and vanish.
        const pin = interpolate(frame, [0, at], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
        const pout = interpolate(frame, [at, at + 18], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
        const a = r('a') * Math.PI * 2 + pin * (0.6 + r('w') * 0.9) * Math.PI;
        const dist = far * (1 - pin) * (0.6 + r('d') * 0.4) + pout * far * 0.7;
        const before = frame < at;
        const scale = before ? interpolate(pin, [0, 0.85, 1], [1, 0.8, 0.15]) : 0.15 + pout * 0.4;
        const opacity = before ? Math.min(1, pin * 4) : 1 - pout;
        const x = width / 2 + Math.cos(a) * dist;
        const y = height / 2 + Math.sin(a) * dist;
        const rot = (r('r') - 0.5) * 720 * pin + pout * 180;
        const common: React.CSSProperties = {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          opacity,
          transform: `rotate(${rot}deg) scale(${scale})`,
          filter: `drop-shadow(0 0 ${18 * u}px ${color})`,
        };
        if (shape === 'triangle' || shape === 'plus') {
          return (
            <svg key={i} viewBox="0 0 100 100" style={common}>
              {shape === 'triangle' ? (
                <polygon points="50,6 96,92 4,92" fill={color} />
              ) : (
                <path d="M38 0h24v38h38v24H62v38H38V62H0V38h38z" fill={color} />
              )}
            </svg>
          );
        }
        return (
          <div
            key={i}
            style={{
              ...common,
              borderRadius: shape === 'square' ? 14 * u : '50%',
              background: shape === 'ring' ? 'transparent' : color,
              border: shape === 'ring' ? `${6 * u}px solid ${color}` : undefined,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
