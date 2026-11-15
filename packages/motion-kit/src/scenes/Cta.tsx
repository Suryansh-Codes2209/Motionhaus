import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill, onAccent} from '../styles';
import {config} from '../video.config';

// End card: headline, URL typed into a pill, pulsing button.
export const Cta: React.FC<{scene: SceneOf<'cta'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors, logo} = config.brand;

  const logoS = spring({frame: frame - enter, fps, config: {damping: 14}});
  const typeStart = enter + fpb;
  const typeEnd = typeStart + Math.max(fpb, scene.url.length * 1.6);
  const chars = Math.floor(interpolate(frame, [typeStart, typeEnd], [0, scene.url.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0 || frame < typeEnd ? 1 : 0;
  const pillS = spring({frame: frame - typeStart + 4, fps, config: {damping: 16}});
  const btnAt = typeEnd + 4;
  const btnS = spring({frame: frame - btnAt, fps, config: {damping: 10, stiffness: 150}});
  const pulse = frame > btnAt + 15 ? 1 + 0.025 * Math.sin((frame - btnAt) / 5) : 1;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 50 * u,
      }}
    >
      {logo ? (
        <Img
          src={staticFile(logo)}
          style={{
            height: 90 * u,
            maxWidth: width * 0.4,
            objectFit: 'contain',
            opacity: logoS,
            transform: `scale(${0.6 + 0.4 * logoS})`,
          }}
        />
      ) : null}
      <KineticText text={scene.headline} size={110 * u} fitWidth={width * 0.88} delay={enter} weight={800} />
      <div
        style={{
          fontFamily: bodyFamily,
          fontSize: 40 * u,
          color: colors.fg,
          padding: `${18 * u}px ${36 * u}px`,
          borderRadius: 999,
          border: `${1.5 * u}px solid ${alpha(colors.fg, 0.2)}`,
          background: alpha(colors.fg, 0.06),
          opacity: pillS,
          transform: `translateY(${(1 - pillS) * 30 * u}px)`,
          minWidth: 300 * u,
          textAlign: 'center',
        }}
      >
        {scene.url.slice(0, chars)}
        <span style={{opacity: caret, color: colors.accent}}>|</span>
      </div>
      {scene.button ? (
        <div
          style={{
            fontFamily: bodyFamily,
            fontWeight: 700,
            fontSize: 38 * u,
            color: onAccent(),
            padding: `${24 * u}px ${56 * u}px`,
            borderRadius: 999,
            background: accentFill(120),
            boxShadow: `0 ${16 * u}px ${60 * u}px ${alpha(colors.accent, 0.55)}`,
            transform: `scale(${btnS * pulse})`,
          }}
        >
          <Sfx name="pop" at={btnAt} volume={0.6} />
          {scene.button}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
