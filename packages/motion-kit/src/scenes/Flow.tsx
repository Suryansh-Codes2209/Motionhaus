import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {AnimatedBeam} from '../components/fx/beams';
import {GlassCard} from '../components/GlassCard';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, useUnit} from '../lib/util';
import {accentFill} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// explainer: "how it flows". Nodes zig-zag down the frame; on each beat the
// next node lands and an AnimatedBeam (Magic UI) fires into it.
export const Flow: React.FC<{scene: SceneOf<'flow'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const nodes = scene.nodes.slice(0, 5);
  const n = nodes.length;

  const top = height * (scene.title ? 0.27 : 0.2);
  const bottom = height * 0.62; // last node clears the caption band (from ~72%)
  const step = n > 1 ? (bottom - top) / (n - 1) : 0;
  const cardW = width * 0.56;
  const cardH = 120 * u;
  const pos = nodes.map((_, i) => ({x: width * (i % 2 ? 0.66 : 0.34), y: top + step * i}));
  const landAt = (i: number) => enter + (scene.title ? fpb * 0.6 : 0) + i * fpb;

  return (
    <AbsoluteFill>
      {scene.title ? (
        <div style={{position: 'absolute', top: height * 0.12, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={scene.title} size={78 * u} fitWidth={width * 0.86} delay={enter} />
        </div>
      ) : null}
      {pos.slice(1).map((p, i) => (
        <AnimatedBeam
          key={i}
          from={{x: pos[i].x, y: pos[i].y + cardH * 0.5}}
          to={{x: p.x, y: p.y - cardH * 0.5}}
          curvature={(i % 2 ? -1 : 1) * 60 * u}
          start={landAt(i + 1) - Math.round(fpb * 0.6)}
          duration={Math.round(fpb * 1.4)}
          every={Math.round(fpb * 2.5)}
          width={width}
          height={height}
          colorFrom={colors.accent}
          colorTo={colors.accent2}
          pathColor={alpha(colors.fg, 0.18)}
          pathWidth={4 * u}
        />
      ))}
      {nodes.map((node, i) => {
        const at = landAt(i);
        const s = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 170, mass: 0.8}});
        const glow = spring({frame: frame - at - 4, fps, config: {damping: 20}});
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos[i].x - cardW / 2,
              top: pos[i].y - cardH / 2,
              transform: `scale(${0.7 + 0.3 * s})`,
              opacity: Math.min(1, s * 1.5),
              filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
            }}
          >
            <Sfx name="pop" at={at} i={i} volume={0.45} />
            <GlassCard width={cardW} sheenAt={at + 8} style={{padding: `${22 * u}px ${26 * u}px`, height: cardH, display: 'flex', alignItems: 'center', boxSizing: 'border-box'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 20 * u}}>
                <div
                  style={{
                    width: 76 * u,
                    height: 76 * u,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 38 * u,
                    background: accentFill(135),
                    boxShadow: `0 0 ${36 * u * glow}px ${alpha(colors.accent, 0.55)}`,
                  }}
                >
                  {node.icon ?? i + 1}
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 4 * u, minWidth: 0}}>
                  <div style={{fontFamily: displayFamily, fontWeight: Math.min(700, displayMaxWeight), fontSize: 38 * u, color: colors.fg, letterSpacing: '-0.02em', lineHeight: 1.1}}>{node.label}</div>
                  {node.desc ? <div style={{fontFamily: bodyFamily, fontSize: 25 * u, color: colors.muted, lineHeight: 1.25}}>{node.desc}</div> : null}
                </div>
              </div>
            </GlassCard>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
