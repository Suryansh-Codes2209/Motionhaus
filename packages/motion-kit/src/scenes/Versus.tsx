import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill, style} from '../styles';
import {config} from '../video.config';

type Side = SceneOf<'versus'>['left'];

// Head-to-head: two panels (stacked in portrait, side by side in landscape),
// a VS badge that slams in, then one stat row per side per half-beat. The
// `winner` side gets the accent edge.
export const Versus: React.FC<{scene: SceneOf<'versus'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;

  const vsAt = enter + Math.round(fpb * 0.5);
  const rowsAt = enter + fpb;
  const vs = spring({frame: frame - vsAt, fps, config: {damping: 9, stiffness: 180}});
  const panelW = portrait ? width * 0.86 : width * 0.36;
  const panelH = portrait ? height * 0.25 : height * 0.56;

  const panel = (side: Side, idx: 0 | 1) => {
    const s = spring({frame: frame - enter - idx * 4, fps, config: {damping: 15}});
    const dir = idx === 0 ? -1 : 1;
    const win = scene.winner === (idx === 0 ? 'left' : 'right');
    // Paper uses the red pen for the winner; yellow marker ink is unreadable as text.
    const winInk = style.name === 'vox' ? colors.accent2 : colors.accent;
    const surface: React.CSSProperties =
      style.name === 'radar'
        ? {
            borderRadius: 32 * u,
            background: win ? alpha(colors.accent, 0.1) : alpha(colors.fg, 0.05),
            border: `${3 * u}px solid ${win ? colors.accent : alpha(colors.fg, 0.12)}`,
            boxShadow: win ? `0 0 ${80 * u}px ${alpha(colors.accent, 0.25)}` : 'none',
          }
        : {...style.card(colors, u), ...(win ? {borderColor: winInk} : {})};
    return (
      <div
        style={{
          width: panelW,
          height: panelH,
          boxSizing: 'border-box',
          padding: `${36 * u}px ${44 * u}px`,
          ...surface,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 18 * u,
          opacity: s,
          transform: portrait ? `translateY(${(1 - s) * dir * 80 * u}px)` : `translateX(${(1 - s) * dir * 120 * u}px)`,
        }}
      >
        <div
          style={{
            fontFamily: displayFamily,
            fontWeight: Math.min(800, displayMaxWeight),
            fontSize: 72 * u,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: win ? winInk : colors.fg,
            marginBottom: 8 * u,
          }}
        >
          {side.name}
        </div>
        {side.rows.map((r, i) => {
          const at = rowsAt + i * Math.round(fpb * 0.5) + idx * 3;
          const o = interpolate(frame, [at, at + 8], [0, 1], clamp);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 24 * u,
                opacity: o,
                transform: `translateX(${(1 - o) * dir * 30 * u}px)`,
                borderTop: `${1.5 * u}px solid ${alpha(colors.fg, 0.08)}`,
                paddingTop: 12 * u,
              }}
            >
              <span style={{fontFamily: bodyFamily, fontSize: 34 * u, color: colors.muted}}>{r.label}</span>
              <span style={{fontFamily: monoFamily, fontSize: 40 * u, fontWeight: 700, color: colors.fg}}>{r.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 40 * u,
        paddingBottom: portrait ? height * 0.1 : 0,
      }}
    >
      <Sfx name="impact" at={vsAt} volume={0.55} />
      {scene.title ? <KineticText text={scene.title} size={64 * u} fitWidth={width * 0.86} delay={enter} /> : null}
      <div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', gap: (portrait ? 70 : 120) * u, position: 'relative'}}>
        {panel(scene.left, 0)}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 120 * u,
            height: 120 * u,
            marginLeft: -60 * u,
            marginTop: -60 * u,
            borderRadius: '50%',
            background: accentFill(135),
            color: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: displayFamily,
            fontWeight: Math.min(900, displayMaxWeight),
            fontSize: 48 * u,
            zIndex: 2,
            transform: `scale(${vs}) rotate(${(1 - vs) * -90}deg)`,
            boxShadow: `0 0 ${60 * u}px ${alpha(colors.accent, 0.6)}`,
          }}
        >
          VS
        </div>
        {panel(scene.right, 1)}
      </div>
    </AbsoluteFill>
  );
};
