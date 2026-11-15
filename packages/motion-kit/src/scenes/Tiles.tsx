import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {KineticText} from '../components/KineticText';
import {Sticker} from '../components/fx/toy';
import {labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import {style} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

const isImage = (s: string) => /\.(png|svg|jpe?g|webp)$/i.test(s);

// toybox: app-icon tiles that pop in one per beat with a squash-and-stretch
// bounce. One tile can get crossed out (a red ✕ badge and a slash), one can
// get a green check, and a sticker can slap onto the last tile.
export const Tiles: React.FC<{scene: SceneOf<'tiles'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const tiles = scene.tiles.slice(0, 3);
  const n = tiles.length;
  const size = Math.min(300 * u, (width * 0.82 - (n - 1) * 60 * u) / n);
  const first = enter + (scene.title ? fpb : fpb * 0.25);
  const lastAt = first + (n - 1) * fpb;
  const markAt = lastAt + fpb;
  const badgeOn = scene.badgeOn ?? n - 1;
  const badgeAt = markAt + (scene.strike != null || scene.check != null ? fpb : 0);
  const mark = spring({frame: frame - markAt, fps, config: {damping: 11, stiffness: 220}});
  const card = style.card(colors, u);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 70 * u}}>
      {scene.title ? <KineticText text={scene.title} size={116 * u} fitWidth={width * 0.86} delay={enter} /> : null}
      <div style={{display: 'flex', gap: 60 * u, alignItems: 'flex-start'}}>
        {tiles.map((t, i) => {
          const at = first + i * fpb;
          const s = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 200, mass: 0.7}});
          // squash on landing: wide and short, then tall and thin, then settle
          const squash = 1 + 0.08 * Math.sin(Math.min(1, (frame - at) / 10) * Math.PI * 2) * interpolate(frame - at, [0, 14], [1, 0], clamp);
          const struck = scene.strike === i;
          const checked = scene.check === i;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * u, opacity: Math.min(1, s * 2)}}>
              <Sfx name="pop" at={at} volume={0.55} />
              <div
                style={{
                  position: 'relative',
                  width: size,
                  height: size,
                  ...card,
                  borderRadius: size * 0.24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translateY(${(1 - s) * 140 * u}px) scale(${s * squash}, ${s / squash})`,
                  transformOrigin: '50% 100%',
                  filter: struck && frame >= markAt ? `grayscale(${mark * 0.6})` : undefined,
                }}
              >
                {isImage(t.icon) ? (
                  <Img src={staticFile(t.icon)} style={{width: size * 0.56, height: size * 0.56, objectFit: 'contain'}} />
                ) : (
                  <span style={{fontSize: size * 0.46, lineHeight: 1}}>{t.icon}</span>
                )}
                {struck ? (
                  <svg width={size} height={size} style={{position: 'absolute', inset: 0}}>
                    <line x1={size * 0.22} y1={size * 0.22} x2={size * 0.22 + size * 0.56 * mark} y2={size * 0.22 + size * 0.56 * mark} stroke={colors.accent} strokeWidth={14 * u} strokeLinecap="round" />
                  </svg>
                ) : null}
                {struck || checked ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: -18 * u,
                      right: -18 * u,
                      width: 64 * u,
                      height: 64 * u,
                      borderRadius: 64 * u,
                      background: struck ? '#E5484D' : '#22B15E',
                      border: `${5 * u}px solid #ffffff`,
                      color: '#ffffff',
                      fontSize: 34 * u,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `scale(${frame >= markAt ? mark : 0})`,
                      boxShadow: `0 ${8 * u}px ${20 * u}px rgba(0,0,0,0.2)`,
                    }}
                  >
                    {struck ? '✕' : '✓'}
                  </div>
                ) : null}
                {scene.sticker && badgeOn === i ? (
                  <div style={{position: 'absolute', bottom: -30 * u, left: '50%', transform: 'translateX(-50%)'}}>
                    <Sticker text={scene.sticker} at={badgeAt} color={colors.accent} size={0.9} />
                  </div>
                ) : null}
              </div>
              {t.label ? (
                <div
                  style={{
                    fontFamily: labelFamily,
                    fontSize: 30 * u,
                    color: colors.fg,
                    padding: `${8 * u}px ${20 * u}px`,
                    borderRadius: 14 * u,
                    background: alpha(colors.fg, 0.06),
                  }}
                >
                  {t.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {scene.strike != null || scene.check != null ? <Sfx name={scene.strike != null ? 'impact' : 'pop'} at={markAt} volume={0.45} /> : null}
      {scene.sticker ? <Sfx name="pop" at={badgeAt} volume={0.6} /> : null}
    </AbsoluteFill>
  );
};
