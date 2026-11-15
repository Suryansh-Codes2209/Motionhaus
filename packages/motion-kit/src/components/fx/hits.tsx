import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx, type SfxName} from '../../audio/Sfx';
import {useScene} from '../../lib/SceneContext';
import {alpha, clamp} from '../../lib/util';
import type {GradeName, HitFx, Scene} from '../../types';
import {config} from '../../video.config';

// Beat-timed accents (scene.hits): each one is a few frames long and lands
// on a word, so the edit answers the voice instead of running on a timer.
// They are the pattern interrupts of a short: a viewer's eye resets on
// every one. Timings follow the editor presets catalogued at 24fps.dev.

const LEN: Record<HitFx, number> = {punch: 12, flash: 7, invert: 3, freeze: 16, strobe: 8, rgb: 7, jolt: 8, blur: 9, echo: 10};
const SOUND: Record<HitFx, {name: SfxName; volume: number}> = {
  punch: {name: 'impact', volume: 0.55},
  flash: {name: 'shutter', volume: 0.6},
  invert: {name: 'glitch', volume: 0.5},
  freeze: {name: 'shutter', volume: 0.7},
  strobe: {name: 'static', volume: 0.4},
  rgb: {name: 'glitch', volume: 0.55},
  jolt: {name: 'whoosh-3', volume: 0.5},
  blur: {name: 'whoosh-1', volume: 0.35},
  echo: {name: 'whoosh-2', volume: 0.45},
};

export const SceneHits: React.FC<{hits: NonNullable<Scene['hits']>; children: React.ReactNode}> = ({hits, children}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {fpb, index} = useScene();
  const px = width / 1080;

  let scale = 1;
  let dx = 0;
  let rot = 0;
  let blur = 0;
  let white = 0;
  let split = 0;
  let echo = 0;
  const filters: string[] = [];

  hits.forEach((h) => {
    const at = Math.round(h.at * fpb);
    const f = frame - at;
    if (f < 0 || f >= LEN[h.fx]) return;
    const k = 1 - f / LEN[h.fx]; // 1 on the hit, falling to 0
    switch (h.fx) {
      case 'punch':
        // 14% zoom that overshoots on the first frames and eases back out
        scale *= 1 + 0.14 * Math.exp(-f / 4) * (f < 2 ? 0.7 + 0.3 * f : 1);
        break;
      case 'flash':
        white = Math.max(white, 0.9 * k * k);
        break;
      case 'invert':
        filters.push('invert(1) hue-rotate(180deg)');
        break;
      case 'freeze':
        white = Math.max(white, f < 4 ? 0.95 * (1 - f / 4) : 0);
        filters.push(`grayscale(${0.85 * Math.min(1, k * 2)}) contrast(${1 + 0.5 * Math.min(1, k * 2)})`);
        scale *= 1 + 0.03 * Math.min(1, k * 2);
        break;
      case 'strobe':
        filters.push(f % 2 === 0 ? 'brightness(1.9) contrast(1.2)' : 'brightness(0.35)');
        break;
      case 'rgb':
        split = Math.max(split, 22 * k * px);
        break;
      case 'jolt':
        dx += Math.cos(f * 2.4) * 46 * k * k * px;
        rot += Math.sin(f * 2.1) * 1.2 * k;
        blur = Math.max(blur, 7 * k);
        scale *= 1.04;
        break;
      case 'blur':
        blur = Math.max(blur, 18 * Math.sin(Math.PI * Math.min(1, f / LEN.blur)));
        scale *= 1 + 0.05 * Math.sin(Math.PI * Math.min(1, f / LEN.blur));
        break;
      case 'echo':
        echo = Math.max(echo, k);
        break;
    }
  });

  if (blur > 0.3) filters.push(`blur(${blur}px)`);
  const id = `rgb-${index}`;
  if (split > 0.5) filters.push(`url(#${id})`);
  const moving = scale !== 1 || dx !== 0 || rot !== 0;

  return (
    <AbsoluteFill>
      {split > 0.5 ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={split} dy={0} result="ro" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
            <feOffset in="gb" dx={-split} dy={0} result="gbo" />
            <feBlend in="ro" in2="gbo" mode="screen" />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{transform: moving ? `translateX(${dx}px) rotate(${rot}deg) scale(${scale})` : undefined, filter: filters.length ? filters.join(' ') : undefined}}>{children}</AbsoluteFill>
      {/* echo: two ghost copies of the frame fly outward and fade */}
      {echo > 0
        ? [1, 2].map((i) => (
            <AbsoluteFill key={i} style={{transform: `scale(${1 + (1 - echo) * 0.22 * i})`, opacity: 0.32 * echo, mixBlendMode: 'screen', pointerEvents: 'none'}}>
              {children}
            </AbsoluteFill>
          ))
        : null}
      {white > 0.01 ? <AbsoluteFill style={{background: '#ffffff', opacity: white, pointerEvents: 'none'}} /> : null}
      {hits.map((h, i) => (
        <Sfx key={`${h.fx}${h.at}`} name={SOUND[h.fx].name} at={Math.round(h.at * fpb)} i={index + i} volume={SOUND[h.fx].volume} />
      ))}
    </AbsoluteFill>
  );
};

// Colour grades (scene.grade): a filter on the picture plus, for some, a
// tint laid over it.
const GRADES: Record<GradeName, {filter: string; tint?: (accent: string) => React.CSSProperties}> = {
  tealOrange: {filter: 'contrast(1.12) saturate(1.2)', tint: () => ({background: 'linear-gradient(180deg, rgba(0,140,160,0.22), rgba(255,130,40,0.2))', mixBlendMode: 'soft-light'})},
  noir: {filter: 'grayscale(1) contrast(1.35) brightness(0.95)'},
  warm: {filter: 'sepia(0.28) saturate(1.25) contrast(1.05)'},
  cold: {filter: 'saturate(0.85) contrast(1.1) hue-rotate(-8deg)', tint: () => ({background: 'rgba(60,110,255,0.14)', mixBlendMode: 'soft-light'})},
  punchy: {filter: 'contrast(1.25) saturate(1.45)'},
  // two inks: the picture in grey, the brand accent laid over it
  duotone: {filter: 'grayscale(1) contrast(1.2)', tint: (accent) => ({background: accent, mixBlendMode: 'color'})},
  faded: {filter: 'contrast(0.88) saturate(0.75) brightness(1.06)', tint: () => ({background: 'rgba(255,240,220,0.1)'})},
};

export const Grade: React.FC<{grade: GradeName; children: React.ReactNode}> = ({grade, children}) => {
  const g = GRADES[grade];
  if (!g) return <>{children}</>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: g.filter}}>{children}</AbsoluteFill>
      {g.tint ? <AbsoluteFill style={{pointerEvents: 'none', ...g.tint(config.brand.colors.accent)}} /> : null}
    </AbsoluteFill>
  );
};

// leak: a warm light leak that drifts across the frame and breathes.
export const LightLeak: React.FC = () => {
  const frame = useCurrentFrame();
  const {duration} = useScene();
  const k = interpolate(frame, [0, 12, duration - 10, duration], [0, 1, 1, 0], clamp);
  const x = 20 + 60 * (frame / Math.max(1, duration));
  const breathe = 0.75 + 0.25 * Math.sin(frame * 0.09);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: k * breathe}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 90% at ${x}% 20%, rgba(255,170,80,0.55), rgba(255,70,40,0.22) 45%, transparent 75%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 40% 60% at ${100 - x}% 95%, rgba(255,90,160,0.3), transparent 70%)`}} />
    </AbsoluteFill>
  );
};

// tiltShift: the top and bottom thirds fall out of focus, so a screenshot or
// photo reads like a miniature and the eye stays on the middle band. (A
// blurred copy masked to the edges: backdrop-filter mirrors the frame edge.)
export const TiltShift: React.FC<{children: React.ReactNode}> = ({children}) => {
  const mask = 'linear-gradient(180deg, #000 0%, transparent 32%, transparent 68%, #000 100%)';
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{pointerEvents: 'none', WebkitMaskImage: mask, maskImage: mask}}>
        <AbsoluteFill style={{filter: 'blur(9px)', transform: 'scale(1.03)'}}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// spotlight: the edges fall dark around a soft pool of light in the centre.
export const Spot: React.FC = () => {
  const frame = useCurrentFrame();
  const {enter} = useScene();
  const k = interpolate(frame, [enter, enter + 14], [0, 1], clamp);
  const {bg} = config.brand.colors;
  return <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse 62% 44% at 50% 46%, transparent 40%, ${alpha(bg, 0.82 * k)} 100%)`}} />;
};
