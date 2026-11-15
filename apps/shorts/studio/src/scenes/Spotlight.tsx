import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {BrowserFrame} from '../components/Devices';
import {KineticText} from '../components/KineticText';
import {bodyFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill} from '../styles';
import {config} from '../video.config';

const Cursor: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))'}}>
    <path d="M3 2l7.5 19 2.6-7.4L20.5 11z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

// Product walkthrough beat: the cursor glides to a UI element, clicks (ripple +
// pop), and the camera pushes in on it while a callout pill names it.
export const Spotlight: React.FC<{scene: SceneOf<'spotlight'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;

  const caption = scene.caption ? 150 * u : 0;
  const fw = portrait ? width * 0.9 : width * 0.68;
  const fh = Math.min(height - caption - 160 * u, fw * 0.64);
  const bar = 46 * u; // BrowserFrame toolbar height
  const fx = scene.focus.x;
  const fy = (bar + scene.focus.y * (fh - bar)) / fh;
  const zoom = scene.focus.zoom ?? 2.2;

  const intro = spring({frame: frame - enter, fps, config: {damping: 18, stiffness: 90}});
  const move = interpolate(frame, [enter + fpb * 0.5, enter + fpb * 1.75], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const click = enter + fpb * 2;
  const push = interpolate(frame, [click + 2, click + fpb * 1.5], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.poly(5)),
  });
  const z = 1 + (zoom - 1) * push;
  const press = interpolate(frame, [click - 2, click, click + 4], [1, 0.82, 1], clamp);
  const ripple = interpolate(frame, [click, click + 16], [0, 1], clamp);
  const cx = interpolate(move, [0, 1], [0.9, fx]) * fw;
  const cy = interpolate(move, [0, 1], [1.05, fy]) * fh;
  const pill = spring({frame: frame - click - fpb * 1.25, fps, config: {damping: 14, stiffness: 160}});

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 50 * u}}>
      <Sfx name="pop" at={click} volume={0.6} />
      {scene.caption ? (
        <KineticText text={scene.caption} size={64 * u} fitWidth={width * 0.88} delay={enter + 4} />
      ) : null}
      <div
        style={{
          width: fw,
          height: fh,
          position: 'relative',
          borderRadius: 18 * u,
          overflow: 'hidden',
          transform: `translateY(${(1 - intro) * height * 0.3}px) scale(${0.9 + 0.1 * intro})`,
          opacity: Math.min(1, intro * 2),
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: `${fx * 100}% ${fy * 100}%`,
            transform: `translate(${(0.5 - fx) * fw * push}px, ${(0.5 - fy) * fh * push}px) scale(${z})`,
          }}
        >
          <BrowserFrame src={scene.image} width={fw} height={fh} url={config.brand.url} progress={0} />
          <div
            style={{
              position: 'absolute',
              left: fx * fw - 60 * u,
              top: fy * fh - 60 * u,
              width: 120 * u,
              height: 120 * u,
              borderRadius: '50%',
              border: `${4 * u}px solid ${colors.accent}`,
              transform: `scale(${ripple * 1.4 / z})`,
              opacity: frame >= click ? 1 - ripple : 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              transformOrigin: '0 0',
              transform: `scale(${press / z})`,
              opacity: frame >= enter + fpb * 0.4 ? 1 : 0,
            }}
          >
            <Cursor size={54 * u} />
          </div>
        </div>
      </div>
      {scene.label ? (
        <div
          style={{
            position: 'absolute',
            top: height / 2 + caption / 2 + 70 * u,
            left: width / 2 + 40 * u,
            padding: `${14 * u}px ${26 * u}px`,
            borderRadius: 999,
            background: accentFill(120),
            color: '#fff',
            fontFamily: bodyFamily,
            fontWeight: 700,
            fontSize: 34 * u,
            boxShadow: `0 ${16 * u}px ${50 * u}px ${alpha(colors.accent, 0.5)}`,
            transform: `scale(${pill})`,
            transformOrigin: '0 0',
            opacity: pill,
            whiteSpace: 'nowrap',
          }}
        >
          {scene.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
