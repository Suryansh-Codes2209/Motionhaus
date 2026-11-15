import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, isDark, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill} from '../styles';
import {config} from '../video.config';

// "How it works" flow: one node per beat, each connector draws itself with a
// glowing pulse that ignites the next node when it arrives.
export const Steps: React.FC<{scene: SceneOf<'steps'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const dark = isDark(colors.bg);
  const items = scene.items.slice(0, 4);
  const n = items.length;
  const start = enter + (scene.title ? fpb : fpb * 0.3);

  const total = portrait ? height * 0.62 : width * 0.86;
  const conn = portrait ? 70 * u : Math.min(140 * u, total * 0.08);
  const nodeW = portrait ? width * 0.8 : (total - conn * (n - 1)) / n;
  const dot = 118 * u;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 70 * u}}>
      {scene.title ? <KineticText text={scene.title} size={80 * u} fitWidth={width * 0.86} delay={enter} /> : null}
      <div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: portrait ? 'center' : 'flex-start'}}>
        {items.map((item, i) => {
          const at = start + i * fpb;
          const s = spring({frame: frame - at, fps, config: {damping: 13, stiffness: 150, mass: 0.8}});
          const lit = interpolate(frame, [at, at + 6], [0, 1], clamp);
          const draw = interpolate(frame, [at + fpb * 0.35, at + fpb], [0, 1], clamp);
          return (
            <React.Fragment key={i}>
              <Sfx name="pop" at={at} i={i} volume={0.5} />
              <div
                style={{
                  width: nodeW,
                  display: 'flex',
                  flexDirection: portrait ? 'row' : 'column',
                  alignItems: 'center',
                  gap: 22 * u,
                  textAlign: portrait ? 'left' : 'center',
                  transform: `translateY(${(1 - s) * 60 * u}px) scale(${0.85 + 0.15 * s})`,
                  opacity: Math.min(1, s * 1.6),
                  filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
                }}
              >
                <div
                  style={{
                    width: dot,
                    height: dot,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 52 * u,
                    fontFamily: displayFamily,
                    fontWeight: Math.min(800, displayMaxWeight),
                    color: '#fff',
                    background: accentFill(135),
                    boxShadow: `0 0 ${70 * u * lit}px ${alpha(colors.accent, 0.7)}, inset 0 0 0 ${3 * u}px ${alpha('#ffffff', 0.25)}`,
                  }}
                >
                  {item.icon ?? i + 1}
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8 * u}}>
                  <div style={{fontFamily: displayFamily, fontWeight: Math.min(700, displayMaxWeight), fontSize: 42 * u, letterSpacing: '-0.02em', color: colors.fg}}>
                    {item.title}
                  </div>
                  {item.desc ? (
                    <div style={{fontFamily: bodyFamily, fontSize: 27 * u, lineHeight: 1.35, color: colors.muted}}>{item.desc}</div>
                  ) : null}
                </div>
              </div>
              {i < n - 1 ? (
                <div
                  style={{
                    position: 'relative',
                    width: portrait ? 4 * u : conn,
                    height: portrait ? conn : 4 * u,
                    marginTop: portrait ? 0 : dot / 2 - 2 * u,
                    alignSelf: portrait ? 'flex-start' : undefined,
                    marginLeft: portrait ? width * 0.1 + dot / 2 - 2 * u : 0,
                    borderRadius: 4 * u,
                    background: alpha(colors.fg, dark ? 0.12 : 0.15),
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 4 * u,
                      background: accentFill(portrait ? 180 : 90),
                      transform: portrait ? `scaleY(${draw})` : `scaleX(${draw})`,
                      transformOrigin: portrait ? 'top' : 'left',
                    }}
                  />
                  {draw > 0 && draw < 1 ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: portrait ? -6 * u : `calc(${draw * 100}% - ${8 * u}px)`,
                        top: portrait ? `calc(${draw * 100}% - ${8 * u}px)` : -6 * u,
                        width: 16 * u,
                        height: 16 * u,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: `0 0 ${24 * u}px ${colors.accent2}`,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
