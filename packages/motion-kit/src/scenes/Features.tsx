import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {GlassCard} from '../components/GlassCard';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill} from '../styles';
import {config} from '../video.config';

// Feature cards pop in on half-beats, each with a pop SFX and a light sheen.
export const Features: React.FC<{scene: SceneOf<'features'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const items = scene.items.slice(0, 4);
  const n = items.length;

  const gap = 28 * u;
  const cardW = portrait
    ? width * 0.84
    : Math.min(520 * u, (width * 0.86 - gap * (n - 1)) / n);
  const firstCard = enter + (scene.title ? fpb : fpb * 0.25);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 60 * u,
      }}
    >
      {scene.title ? (
        <KineticText text={scene.title} size={84 * u} fitWidth={width * 0.86} delay={enter} />
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          gap,
          alignItems: 'stretch',
        }}
      >
        {items.map((item, i) => {
          const start = firstCard + i * fpb * 0.5;
          const s = spring({
            frame: frame - start,
            fps,
            config: {damping: 13, stiffness: 150, mass: 0.8},
          });
          return (
            <div
              key={i}
              style={{
                transform: `translateY(${(1 - s) * 90 * u}px) scale(${0.88 + 0.12 * s})`,
                opacity: Math.min(1, s * 1.6),
                filter: `blur(${Math.max(0, (1 - s) * 12)}px)`,
                display: 'flex',
              }}
            >
              <Sfx name="pop" at={start} i={i} volume={0.55} />
              <GlassCard width={cardW} sheenAt={start + 10}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: portrait ? 'row' : 'column',
                    alignItems: portrait ? 'center' : 'flex-start',
                    gap: 22 * u,
                  }}
                >
                  {item.icon ? (
                    <div
                      style={{
                        width: 76 * u,
                        height: 76 * u,
                        flexShrink: 0,
                        borderRadius: 22 * u,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40 * u,
                        background: accentFill(135),
                      }}
                    >
                      {item.icon}
                    </div>
                  ) : null}
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10 * u}}>
                    <div
                      style={{
                        fontFamily: displayFamily,
                        fontWeight: Math.min(700, displayMaxWeight),
                        fontSize: 42 * u,
                        letterSpacing: '-0.02em',
                        color: colors.fg,
                      }}
                    >
                      {item.title}
                    </div>
                    {item.desc ? (
                      <div
                        style={{
                          fontFamily: bodyFamily,
                          fontSize: 27 * u,
                          lineHeight: 1.35,
                          color: colors.muted,
                        }}
                      >
                        {item.desc}
                      </div>
                    ) : null}
                  </div>
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
