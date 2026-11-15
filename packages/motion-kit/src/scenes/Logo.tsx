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
import {ShapeAssemble} from '../components/Particles';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// The drop: logo slams in with a shockwave ring, then the name and tagline.
// style 'assemble' first spirals brand shapes into the center.
export const Logo: React.FC<{scene: SceneOf<'logo'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {name, tagline, logo, colors} = config.brand;

  const t = frame - enter;
  const s = spring({frame: t, fps, config: {damping: 11, stiffness: 140, mass: 0.8}});
  const ring = interpolate(t, [0, 28], [0, Math.max(width, height) * 1.1], clamp);
  const ringOpacity = interpolate(t, [0, 4, 28], [0, 0.9, 0], clamp);
  const track = spring({frame: t, fps, config: {damping: 200}, durationInFrames: 30});

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <Sfx name="impact" at={enter} />
      {scene.style === 'assemble' ? <ShapeAssemble at={enter} /> : null}
      <div
        style={{
          position: 'absolute',
          width: ring,
          height: ring,
          borderRadius: '50%',
          border: `${5 * u}px solid ${colors.accent}`,
          opacity: ringOpacity,
          boxShadow: `0 0 ${60 * u}px ${colors.accent}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 34 * u,
        }}
      >
        {logo ? (
          <>
            <Img
              src={staticFile(logo)}
              style={{
                height: 190 * u,
                maxWidth: width * 0.6,
                objectFit: 'contain',
                transform: `scale(${interpolate(s, [0, 1], [0.35, 1])})`,
                opacity: Math.min(1, s * 2),
                filter: `drop-shadow(0 0 ${40 * u}px ${colors.accent})`,
              }}
            />
            {config.brand.logoIsWordmark ? null : (
              <KineticText text={name} size={96 * u} delay={enter + 6} weight={800} />
            )}
          </>
        ) : (
          <div
            style={{
              fontFamily: displayFamily,
              fontWeight: Math.min(800, displayMaxWeight),
              fontSize: Math.min(220 * u, (width * 0.85) / Math.max(1, name.length * 0.62)),
              color: colors.fg,
              letterSpacing: `${interpolate(track, [0, 1], [0.6, -0.04])}em`,
              filter: `blur(${(1 - track) * 18}px)`,
              opacity: track,
              transform: `scale(${interpolate(s, [0, 1], [1.3, 1])})`,
              textShadow: `0 0 ${50 * u}px ${colors.accent}`,
            }}
          >
            {name}
          </div>
        )}
        {tagline ? (
          <KineticText
            text={tagline}
            size={46 * u}
            fitWidth={width * 0.85}
            delay={enter + fpb * 1.5}
            weight={500}
            color={colors.muted}
            family={bodyFamily}
            letterSpacing="-0.01em"
            stagger={2}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
