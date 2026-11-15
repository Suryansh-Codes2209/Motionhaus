import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// Only for real quotes/testimonials found on the site.
export const Quote: React.FC<{scene: SceneOf<'quote'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const words = scene.text.split(/\s+/).length;
  const authorAt = enter + words * 2 + fpb * 0.5;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: 120 * u,
        gap: 40 * u,
      }}
    >
      <div
        style={{
          fontFamily: displayFamily,
          fontSize: 200 * u,
          lineHeight: 0.6,
          color: colors.accent,
          opacity: interpolate(frame, [enter, enter + 10], [0, 1], clamp),
        }}
      >
        “
      </div>
      <div style={{maxWidth: width * 0.8}}>
        <KineticText text={scene.text} size={68 * u} delay={enter} stagger={2} weight={600} />
      </div>
      {scene.author ? (
        <div
          style={{
            fontFamily: bodyFamily,
            fontSize: 34 * u,
            color: colors.muted,
            opacity: interpolate(frame, [authorAt, authorAt + 12], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [authorAt, authorAt + 12], [20, 0], clamp) * u}px)`,
          }}
        >
          — {scene.author}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
