import {noise2D} from '@remotion/noise';
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, useUnit} from '../../lib/util';

// 3d: a dark stage. A spotlight from above, a dotted floor plane laid back in
// real perspective that slides toward the camera, and a few soft cubes
// floating at different depths (parallax).
export const DepthStage: React.FC<{bg: string; fg: string; accent: string; accent2: string}> = ({bg, fg, accent, accent2}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const slide = (frame * 1.2 * u) % (60 * u);
  return (
    <AbsoluteFill style={{backgroundColor: bg, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 40% at 50% 18%, ${alpha(accent2, 0.22)}, transparent 70%)`}} />
      <AbsoluteFill style={{perspective: 900 * u, perspectiveOrigin: '50% 30%'}}>
        <div
          style={{
            position: 'absolute',
            left: -width,
            width: width * 3,
            top: height * 0.62,
            height: height * 1.4,
            transformOrigin: '50% 0',
            transform: 'rotateX(74deg)',
            backgroundImage: `radial-gradient(circle, ${alpha(fg, 0.35)} ${2.2 * u}px, transparent ${2.6 * u}px)`,
            backgroundSize: `${60 * u}px ${60 * u}px`,
            backgroundPosition: `0 ${slide}px`,
            maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 60%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 60%, transparent)',
          }}
        />
      </AbsoluteFill>
      {Array.from({length: 6}, (_, i) => {
        const z = 0.35 + random(`dz${i}`) * 0.65; // 1 = near
        const s = (40 + 90 * z) * u;
        const x = random(`dx${i}`) * width;
        const y = height * (0.08 + random(`dy${i}`) * 0.8) + noise2D(`dn${i}`, frame * 0.006, 0) * 40 * u * z;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: 14 * u * z,
              background: `linear-gradient(140deg, ${alpha(i % 2 ? accent : accent2, 0.55 * z)}, ${alpha(bg, 0.2)})`,
              border: `${1.5 * u}px solid ${alpha(fg, 0.15 * z)}`,
              transform: `rotateX(${frame * 0.6 + i * 40}deg) rotateY(${frame * 0.8 + i * 25}deg)`,
              filter: `blur(${(1 - z) * 6 * u}px)`,
              opacity: 0.25 + 0.4 * z,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Wraps a scene in perspective with a slow camera orbit: it starts turned a
// little to one side and swings through to the other over the scene, so flat
// cards read as objects in space. Alternates direction per scene.
export const Orbit3D: React.FC<{children: React.ReactNode; duration: number; index: number}> = ({children, duration, index}) => {
  const frame = useCurrentFrame();
  const u = useUnit();
  const dir = index % 2 ? -1 : 1;
  const p = interpolate(frame, [0, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ry = dir * interpolate(p, [0, 1], [-9, 9]);
  const rx = interpolate(p, [0, 0.5, 1], [10, 5, 8]);
  const z = interpolate(p, [0, 1], [-60, 40]) * u;
  return (
    <AbsoluteFill style={{perspective: 1800 * u}}>
      <AbsoluteFill style={{transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`, transformStyle: 'preserve-3d'}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
