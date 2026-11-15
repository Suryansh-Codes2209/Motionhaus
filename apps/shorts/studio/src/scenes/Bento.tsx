import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {BorderBeam} from '../components/fx/beams';
import {KineticText} from '../components/KineticText';
import {bodyFamily, displayFamily, displayMaxWeight} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useIsPortrait, useUnit} from '../lib/util';
import {accentFill, style} from '../styles';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// neon: a Magic UI-style bento grid. The hero tile spans the full width (and
// can hold a screenshot), the rest pair up below; tiles pop in one per
// half-beat, a BorderBeam orbits the hero and a spotlight glides across.
// In landscape the hero takes the left half and the rest pair up on the right.
export const Bento: React.FC<{scene: SceneOf<'bento'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, fpb, duration} = useScene();
  const u = useUnit();
  const portrait = useIsPortrait();
  const {colors} = config.brand;
  const tiles = scene.tiles.slice(0, 5);

  const gap = 18 * u;
  const W = width * 0.88;
  const left = (width - W) / 2;
  const radius = 30 * u;
  const card = style.card(colors, u);

  let rects: {x: number; y: number; w: number; h: number}[];
  if (portrait) {
    const top = height * (scene.title ? 0.2 : 0.15);
    const heroH = height * (tiles[0]?.image ? 0.2 : 0.14);
    const smallW = (W - gap) / 2;
    const smallH = height * 0.095; // grid ends above the caption band (from ~72%)
    rects = tiles.map((_, i) => {
      if (i === 0) return {x: left, y: top, w: W, h: heroH};
      const k = i - 1;
      const lastAlone = i === tiles.length - 1 && k % 2 === 0;
      return {
        x: lastAlone ? left : left + (k % 2) * (smallW + gap),
        y: top + heroH + gap + Math.floor(k / 2) * (smallH + gap),
        w: lastAlone ? W : smallW,
        h: smallH,
      };
    });
  } else {
    const rows = Math.max(1, Math.ceil((tiles.length - 1) / 2));
    const smallH = 240 * u;
    const gridH = rows * smallH + (rows - 1) * gap;
    const top = Math.max(height * (scene.title ? 0.27 : 0.16), (height - gridH) / 2 + (scene.title ? 50 * u : 0));
    const heroW = tiles.length > 1 ? (W - gap) * 0.48 : W;
    const rx = left + heroW + gap;
    const smallW = (W - heroW - gap * 2) / 2;
    rects = tiles.map((_, i) => {
      if (i === 0) return {x: left, y: top, w: heroW, h: gridH};
      const k = i - 1;
      const lastAlone = i === tiles.length - 1 && k % 2 === 0;
      return {
        x: lastAlone ? rx : rx + (k % 2) * (smallW + gap),
        y: top + Math.floor(k / 2) * (smallH + gap),
        w: lastAlone ? smallW * 2 + gap : smallW,
        h: smallH,
      };
    });
  }

  const first = enter + (scene.title ? fpb * 0.7 : 0);
  const spot = interpolate(frame, [first, duration], [-0.2, 1.2], clamp);

  return (
    <AbsoluteFill>
      {scene.title ? (
        <div style={{position: 'absolute', top: height * 0.115, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <KineticText text={scene.title} size={76 * u} fitWidth={width * 0.86} delay={enter} />
        </div>
      ) : null}
      {tiles.map((t, i) => {
        const r = rects[i];
        const at = first + i * fpb * 0.5;
        const s = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 160, mass: 0.8}});
        const hero = i === 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              ...card,
              borderRadius: radius,
              overflow: 'hidden',
              transform: `translateY(${(1 - s) * 70 * u}px) scale(${0.9 + 0.1 * s})`,
              opacity: Math.min(1, s * 1.6),
              filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
            }}
          >
            <Sfx name="pop" at={at} i={i} volume={0.45} />
            {t.image ? (
              <Img
                src={staticFile(t.image)}
                style={{position: 'absolute', right: -r.w * (portrait ? 0.06 : 0.04), top: r.h * (portrait ? 0.18 : 0.06), width: r.w * (portrait ? 0.62 : 0.56), ...(portrait ? {} : {height: r.h * 0.6, objectFit: 'cover', objectPosition: 'top'}), borderRadius: 18 * u, boxShadow: `0 ${20 * u}px ${50 * u}px rgba(0,0,0,0.5)`, transform: 'rotate(-4deg)', border: `${1.5 * u}px solid ${alpha(colors.fg, 0.15)}`}}
              />
            ) : null}
            {/* moving spotlight (Magic Card) */}
            <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${(spot * width - r.x) / r.w * 100}% 30%, ${alpha(colors.accent, 0.22)}, transparent 55%)`}} />
            <div style={{position: 'absolute', left: 30 * u, right: t.image && portrait ? r.w * 0.45 : 30 * u, bottom: 26 * u, top: 26 * u, display: 'flex', flexDirection: 'column', justifyContent: hero ? 'flex-end' : 'space-between', gap: 10 * u}}>
              {t.icon ? (
                <div style={{width: 64 * u, height: 64 * u, borderRadius: 18 * u, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 * u, background: accentFill(135)}}>{t.icon}</div>
              ) : null}
              <div>
                <div style={{fontFamily: displayFamily, fontWeight: Math.min(800, displayMaxWeight), fontSize: (hero ? 46 : 32) * u, lineHeight: 1.1, letterSpacing: '-0.02em', color: colors.fg}}>{t.title}</div>
                {t.desc ? <div style={{fontFamily: bodyFamily, fontSize: (hero ? 28 : 23) * u, lineHeight: 1.3, color: colors.muted, marginTop: 6 * u}}>{t.desc}</div> : null}
              </div>
            </div>
            {hero ? <BorderBeam width={r.w} height={r.h} radius={radius} colorFrom={colors.accent} colorTo={colors.accent2} borderWidth={3 * u} period={Math.round(fpb * 6)} opacity={Math.min(1, s)} /> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
