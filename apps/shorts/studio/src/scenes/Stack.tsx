import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight, labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import {accentFill, style} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// 3d: a system as an exploded stack of layers. All layers arrive pressed
// together, laid back in isometric perspective; then they pull apart one per
// beat (bottom first) and each one's label slides out beside it. The top
// layer is the hero and gets the accent edge.
export const Stack: React.FC<{scene: SceneOf<'stack'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const layers = scene.layers.slice(0, 4);
  const n = layers.length;
  const w = width * 0.5;
  const h = w * 0.62;
  const arrive = enter + (scene.title ? fpb : 0);
  const land = spring({frame: frame - arrive, fps, config: {damping: 14, stiffness: 110}});
  const spin = interpolate(frame, [arrive, duration], [-38, -52], clamp);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 * u}}>
      {scene.title ? <KineticText text={scene.title} size={86 * u} fitWidth={width * 0.86} delay={enter} /> : null}
      <div style={{position: 'relative', width: w, height: h + (n - 1) * 170 * u, perspective: 2400 * u, transform: `translateX(${-width * 0.2}px)`}}>
        {layers.map((l, k) => {
          // k = 0 is the top layer; layers separate bottom-up
          const order = n - 1 - k;
          const at = arrive + fpb * (1 + order);
          const sep = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 140}});
          const gap = interpolate(sep, [0, 1], [18, 170]) * u;
          const y = k * gap + (1 - land) * 400 * u;
          const hero = k === 0;
          const labelIn = interpolate(frame, [at + 4, at + 14], [0, 1], clamp);
          return (
            <React.Fragment key={k}>
              <Sfx name={hero ? 'impact' : 'whoosh-1'} at={at - (hero ? 0 : 3)} volume={hero ? 0.45 : 0.3} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: y,
                  width: w,
                  height: h,
                  transform: `rotateX(58deg) rotateZ(${spin}deg)`,
                  transformStyle: 'preserve-3d',
                  zIndex: n - k,
                  opacity: Math.min(1, land * 2),
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    ...style.card(colors, u),
                    border: hero ? `${3 * u}px solid ${colors.accent}` : style.card(colors, u).border,
                    background: hero ? `linear-gradient(150deg, ${alpha(colors.accent, 0.35)}, ${alpha(colors.accent2, 0.12)})` : style.card(colors, u).background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: h * 0.32,
                  }}
                >
                  {l.icon ?? null}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: y + h * 0.28,
                  left: w * 1.08,
                  width: width * 0.38,
                  opacity: labelIn,
                  transform: `translateX(${(1 - labelIn) * 40 * u}px)`,
                  zIndex: 10,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12 * u}}>
                  <div style={{width: 14 * u, height: 14 * u, borderRadius: 14 * u, background: hero ? accentFill(135) : alpha(colors.fg, 0.5)}} />
                  <div style={{fontFamily: displayFamily, fontWeight: Math.min(700, displayMaxWeight), fontSize: 50 * u, color: colors.fg, letterSpacing: '-0.02em'}}>{l.label}</div>
                </div>
                {l.desc ? <div style={{fontFamily: bodyFamily, fontSize: 30 * u, lineHeight: 1.3, color: colors.muted, marginTop: 6 * u, marginLeft: 26 * u}}>{l.desc}</div> : null}
                <div style={{fontFamily: labelFamily, fontSize: 18 * u, color: alpha(colors.fg, 0.4), marginTop: 6 * u, marginLeft: 26 * u}}>{`L${n - k}`}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
