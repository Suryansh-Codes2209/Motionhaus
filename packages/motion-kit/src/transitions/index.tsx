import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {pushCut} from '@remotion/transitions/push-cut';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import React from 'react';
import {AbsoluteFill, interpolate, random, useVideoConfig} from 'remotion';
import {StyleBackground} from '../components/StyleLayers';
import {impactFamily} from '../fonts';
import {look, style} from '../styles';
import type {TransitionName} from '../types';

type NoProps = Record<string, never>;

// Outgoing shot rushes past the camera with a zoom blur while the next one
// settles in from slightly behind it.
const ZoomPunch: React.FC<TransitionPresentationComponentProps<NoProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const entering = presentationDirection === 'entering';
  const scale = entering ? interpolate(p, [0, 1], [0.75, 1]) : interpolate(p, [0, 1], [1, 1.9]);
  const blur = entering ? interpolate(p, [0, 1], [22, 0]) : interpolate(p, [0, 1], [0, 26]);
  const opacity = entering
    ? interpolate(p, [0, 0.45, 1], [0, 1, 1])
    : interpolate(p, [0, 0.55, 1], [1, 0, 0]);
  return (
    <AbsoluteFill style={{transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity}}>
      {children}
    </AbsoluteFill>
  );
};

const zoomPunch = (): TransitionPresentation<NoProps> => ({component: ZoomPunch, props: {}});

// vox: the next page slides up over the last one with a tilt and a cast
// shadow, like a sheet of paper laid on a desk.
const Paper: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill style={{filter: `brightness(${interpolate(p, [0, 1], [1, 0.82])})`, transform: `scale(${interpolate(p, [0, 1], [1, 0.96])})`}}>{children}</AbsoluteFill>;
  }
  const y = interpolate(p, [0, 1], [105, 0]);
  const rot = interpolate(p, [0, 1], [5, 0]);
  return (
    <AbsoluteFill style={{transform: `translateY(${y}%) rotate(${rot}deg)`, boxShadow: '0 -30px 60px rgba(0,0,0,0.25)', transformOrigin: 'bottom left'}}>
      {children}
    </AbsoluteFill>
  );
};

// terminal: hard cut hidden under a few frames of sliced, RGB-shifted jitter.
const Glitch: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const visible = entering ? p >= 0.5 : p < 0.5;
  const k = Math.round(p * 12);
  const jitter = Math.sin(Math.PI * p);
  const dx = (random(`gx${k}${entering}`) - 0.5) * 80 * jitter;
  const top = random(`gt${k}`) * 70;
  return (
    <AbsoluteFill style={{opacity: visible ? 1 : 0}}>
      <AbsoluteFill style={{transform: `translateX(${dx * 0.3}px)`, filter: jitter > 0.3 ? `hue-rotate(${dx * 2}deg) saturate(1.6)` : undefined}}>{children}</AbsoluteFill>
      {jitter > 0.2 ? (
        <AbsoluteFill style={{clipPath: `inset(${top}% 0 ${100 - top - 8}% 0)`, transform: `translateX(${dx}px)`}}>{children}</AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// explainer: soft crossfade through a light blur.
const Blur: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const blur = entering ? interpolate(p, [0, 1], [18, 0]) : interpolate(p, [0, 1], [0, 18]);
  const opacity = entering ? interpolate(p, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'}) : interpolate(p, [0.4, 1], [1, 0], {extrapolateLeft: 'clamp'});
  const scale = entering ? interpolate(p, [0, 1], [1.04, 1]) : interpolate(p, [0, 1], [1, 0.98]);
  return <AbsoluteFill style={{filter: `blur(${blur}px)`, opacity, transform: `scale(${scale})`}}>{children}</AbsoluteFill>;
};

// toybox: the old scene shrinks away like a toy put back in the box; the next
// one springs up past full size and settles.
const Pop: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill style={{transform: `scale(${interpolate(p, [0, 1], [1, 0.82])})`, opacity: interpolate(p, [0, 0.5], [1, 0], {extrapolateRight: 'clamp'})}}>{children}</AbsoluteFill>;
  }
  // damped overshoot: 0.7 → 1.06 → 1
  const k = interpolate(p, [0.25, 1], [0, 1], {extrapolateLeft: 'clamp'});
  const scale = 1 - 0.3 * Math.exp(-5 * k) * Math.cos(k * Math.PI * 1.6);
  return <AbsoluteFill style={{transform: `scale(${p < 0.25 ? 0.7 : scale})`, opacity: interpolate(p, [0.2, 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{children}</AbsoluteFill>;
};

// 3d: the scene turns away like the face of a cube and the next face comes round.
const Flip: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const deg = entering ? interpolate(p, [0, 1], [90, 0]) : interpolate(p, [0, 1], [0, -90]);
  return (
    <AbsoluteFill style={{perspective: 2200, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transformOrigin: entering ? 'left center' : 'right center',
          transform: `translateX(${entering ? (1 - p) * 100 : -p * 100}%) rotateY(${deg}deg)`,
          filter: `brightness(${1 - Math.abs(deg) / 180})`,
          backfaceVisibility: 'hidden',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// any: the camera flies through the old scene (it grows and blurs past the
// lens) and the new one rushes up from the distance.
const ZoomIn: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const scale = entering ? interpolate(p, [0, 1], [0.35, 1]) : interpolate(p, [0, 1], [1, 3.2]);
  const blur = entering ? interpolate(p, [0, 0.7], [16, 0], {extrapolateRight: 'clamp'}) : interpolate(p, [0, 1], [0, 30]);
  const opacity = entering ? interpolate(p, [0.2, 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(p, [0.4, 0.75], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity}}>{children}</AbsoluteFill>;
};

// any: the camera pulls back: the old scene shrinks into a card in the
// distance while the new one starts too close and settles out to full frame.
const ZoomOut: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const scale = entering ? interpolate(p, [0, 1], [2.4, 1]) : interpolate(p, [0, 1], [1, 0.3]);
  const blur = entering ? interpolate(p, [0, 0.7], [24, 0], {extrapolateRight: 'clamp'}) : interpolate(p, [0, 1], [0, 8]);
  const opacity = entering ? interpolate(p, [0.25, 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(p, [0.45, 0.8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity, borderRadius: entering ? 0 : interpolate(p, [0, 1], [0, 60]), overflow: 'hidden'}}>
      {children}
    </AbsoluteFill>
  );
};

// any: a whip pan. Both scenes slide hard sideways while a directional blur
// (stacked offset copies) smears them, so the cut hides inside the smear.
const Whip: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const e = entering ? 1 - p : p; // 0 = at rest, 1 = mid-whip
  const x = (entering ? 1 : -1) * Math.pow(e, 2.2) * 110;
  const smear = Math.sin(Math.PI * Math.min(1, e)) ;
  const visible = entering ? p >= 0.5 : p < 0.5;
  return (
    <AbsoluteFill style={{opacity: visible ? 1 : 0, overflow: 'hidden'}}>
      {[0, 1, 2, 3].map((i) => (
        <AbsoluteFill key={i} style={{transform: `translateX(${x - i * 6 * smear * (entering ? 1 : -1)}%)`, opacity: i === 0 ? 1 : 0.28 * smear, filter: `blur(${smear * 10}px)`}}>
          {children}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// any: film burn. The outgoing frame overexposes into an orange-white burn,
// the incoming one comes out of it.
const FilmBurn: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const heat = entering ? interpolate(p, [0.5, 1], [1, 0], {extrapolateLeft: 'clamp'}) : interpolate(p, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'});
  const visible = entering ? p >= 0.5 : p < 0.5;
  return (
    <AbsoluteFill style={{opacity: visible ? 1 : 0}}>
      <AbsoluteFill style={{filter: `brightness(${1 + heat * 2.2}) saturate(${1 + heat}) sepia(${heat * 0.6})`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at ${30 + p * 40}% 60%, rgba(255,250,235,${heat}) 0%, rgba(255,140,40,${heat * 0.85}) 35%, rgba(200,40,0,${heat * 0.5}) 70%, transparent 100%)`, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

// any: iris. The next scene opens in a circle from the centre with a bright rim.
const Iris: React.FC<TransitionPresentationComponentProps<NoProps>> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') return <AbsoluteFill style={{filter: `brightness(${1 - p * 0.4})`}}>{children}</AbsoluteFill>;
  const r = Math.pow(p, 1.6) * 75; // % of the diagonal-ish
  return <AbsoluteFill style={{clipPath: `circle(${r}% at 50% 50%)`}}>{children}</AbsoluteFill>;
};

// ── any style: the editor-preset vocabulary ────────────────────────────────
type P = TransitionPresentationComponentProps<NoProps>;
const half = (entering: boolean, p: number) => (entering ? p >= 0.5 : p < 0.5);

// Scenes are transparent over the film's shared backdrop, so a scene that is
// masked, split or moved as a sheet needs its own copy of the backdrop under
// it, or the other scene shows through. (Long-form sets and the split layout
// draw their own background: there the scene stays as it is.)
const Solid: React.FC<{children: React.ReactNode}> = ({children}) =>
  look.backdrop === false || style.layout === 'split' ? (
    <>{children}</>
  ) : (
    <AbsoluteFill>
      <StyleBackground />
      {children}
    </AbsoluteFill>
  );

// flash: a hard cut under a white frame.
const Flash: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const w = Math.pow(Math.sin(Math.PI * p), 3);
  return (
    <AbsoluteFill style={{opacity: half(entering, p) ? 1 : 0}}>
      <AbsoluteFill style={{filter: `brightness(${1 + w * 1.5})`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: '#ffffff', opacity: w * 0.9}} />
    </AbsoluteFill>
  );
};

// dip: down to the background colour and back up.
const Dip: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const o = entering ? interpolate(p, [0.5, 1], [0, 1], {extrapolateLeft: 'clamp'}) : interpolate(p, [0, 0.5], [1, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// rgbSplit: red and cyan copies slide apart; the cut hides at the widest tear.
const RgbSplit: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const d = Math.sin(Math.PI * p) * 46;
  const id = `trgb-${entering ? 'in' : 'out'}`;
  return (
    <AbsoluteFill style={{opacity: half(entering, p) ? 1 : 0}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-10%" y="0%" width="120%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={d} dy={0} result="ro" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx={-d} dy={0} result="gbo" />
          <feBlend in="ro" in2="gbo" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: d > 1 ? `url(#${id})` : undefined, transform: `scale(${1 + Math.sin(Math.PI * p) * 0.04})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// A mask over the entering scene; the old one sits still underneath.
const masked = (mask: (p: number) => string, dimOld = 0.25): React.FC<P> => {
  const C: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
    if (presentationDirection === 'exiting') return <AbsoluteFill style={{filter: dimOld ? `brightness(${1 - p * dimOld})` : undefined}}>{children}</AbsoluteFill>;
    const m = mask(p);
    return <AbsoluteFill style={{WebkitMaskImage: m, maskImage: m}}><Solid>{children}</Solid></AbsoluteFill>;
  };
  return C;
};

// blinds: 9 horizontal slats open.
const Blinds = masked((p) => {
  const s = 100 / 9;
  return `repeating-linear-gradient(180deg, #000 0%, #000 ${p * s}%, transparent ${p * s}%, transparent ${s}%)`;
});

// clock: a hand sweeps round from 12 o'clock.
const Clock = masked((p) => `conic-gradient(from 0deg at 50% 50%, #000 ${p * 360}deg, transparent ${p * 360 + 0.5}deg)`);

// diamond: a diamond iris from the centre.
const Diamond: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') return <AbsoluteFill style={{filter: `brightness(${1 - p * 0.35})`}}>{children}</AbsoluteFill>;
  const r = Math.pow(p, 1.4) * 105;
  return <AbsoluteFill style={{clipPath: `polygon(50% ${50 - r}%, ${50 + r}% 50%, 50% ${50 + r}%, ${50 - r}% 50%)`}}><Solid>{children}</Solid></AbsoluteFill>;
};

// strips: 6 vertical strips of the next scene slide in from alternate ends.
const Strips: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') return <AbsoluteFill>{children}</AbsoluteFill>;
  const n = 6;
  return (
    <AbsoluteFill>
      {Array.from({length: n}, (_, i) => {
        const local = Math.min(1, Math.max(0, p * 1.5 - (i / n) * 0.5));
        const e = 1 - Math.pow(1 - local, 3);
        return (
          <AbsoluteFill key={i} style={{clipPath: `inset(0 ${100 - ((i + 1) * 100) / n}% 0 ${(i * 100) / n}%)`, transform: `translateY(${(i % 2 ? 1 : -1) * (1 - e) * 100}%)`}}>
            <Solid>{children}</Solid>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// split: the old scene parts like doors (top half up, bottom half down).
const Split: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'entering') return <AbsoluteFill style={{transform: `scale(${0.92 + 0.08 * p})`, filter: `brightness(${0.6 + 0.4 * p})`}}>{children}</AbsoluteFill>;
  const e = p * p * (3 - 2 * p);
  return (
    <AbsoluteFill style={{zIndex: 1}}>
      <AbsoluteFill style={{clipPath: 'inset(0 0 50% 0)', transform: `translateY(${-e * 52}%)`}}><Solid>{children}</Solid></AbsoluteFill>
      <AbsoluteFill style={{clipPath: 'inset(50% 0 0 0)', transform: `translateY(${e * 52}%)`}}><Solid>{children}</Solid></AbsoluteFill>
    </AbsoluteFill>
  );
};

// cube: the scene tips away like the top face of a cube and the next rises.
const Cube: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const deg = entering ? interpolate(p, [0, 1], [-90, 0]) : interpolate(p, [0, 1], [0, 90]);
  return (
    <AbsoluteFill style={{perspective: 2400, overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: entering ? 'center top' : 'center bottom', transform: `translateY(${entering ? (1 - p) * 100 : -p * 100}%) rotateX(${deg}deg)`, filter: `brightness(${1 - Math.abs(deg) / 150})`, backfaceVisibility: 'hidden'}}><Solid>{children}</Solid></AbsoluteFill>
    </AbsoluteFill>
  );
};

// pageTurn: the old scene swings away on its left edge like a page.
const PageTurn: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'entering') return <AbsoluteFill style={{filter: `brightness(${0.55 + 0.45 * p})`}}>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{perspective: 2600, zIndex: 1}}>
      <AbsoluteFill style={{transformOrigin: 'left center', transform: `rotateY(${-p * 105}deg)`, filter: `brightness(${1 - p * 0.5})`, boxShadow: '40px 0 80px rgba(0,0,0,0.4)', backfaceVisibility: 'hidden'}}><Solid>{children}</Solid></AbsoluteFill>
    </AbsoluteFill>
  );
};

// spin: both scenes turn through a blur, the cut at the fastest point.
const Spin: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const e = entering ? 1 - p : p;
  return (
    <AbsoluteFill style={{opacity: half(entering, p) ? 1 : 0, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `rotate(${(entering ? -1 : 1) * Math.pow(e, 2) * 90}deg) scale(${1 + e * 0.9})`, filter: `blur(${e * 16}px)`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// stretch: the frame pulls wide and smears; the next one snaps back from it.
const Stretch: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const e = entering ? 1 - p : p;
  return (
    <AbsoluteFill style={{opacity: half(entering, p) ? 1 : 0, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scaleX(${1 + Math.pow(e, 2) * 5})`, filter: `blur(${e * 10}px)`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// swirl: both scenes twist and shrink through a heavy blur.
const Swirl: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const e = entering ? 1 - p : p;
  const o = entering ? interpolate(p, [0.3, 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(p, [0.3, 0.7], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{transform: `rotate(${(entering ? -1 : 1) * e * 140}deg) scale(${1 - e * 0.65})`, filter: `blur(${e * 26}px)`, opacity: o}}>{children}</AbsoluteFill>;
};

// lightSweep: a slanted bar of light crosses the frame; behind it is the next scene.
const LightSweep: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') return <AbsoluteFill>{children}</AbsoluteFill>;
  const x = -30 + p * 160; // % across, leading edge
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: `polygon(0 0, ${x + 12}% 0, ${x - 12}% 100%, 0 100%)`}}><Solid>{children}</Solid></AbsoluteFill>
      <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', background: `linear-gradient(104deg, transparent ${x - 16}%, rgba(255,255,255,0.95) ${x}%, transparent ${x + 10}%)`, opacity: Math.sin(Math.PI * p)}} />
    </AbsoluteFill>
  );
};

// whipUp: a vertical whip pan (the frame tilts up through a smear).
const WhipUp: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => {
  const entering = presentationDirection === 'entering';
  const e = entering ? 1 - p : p;
  const y = (entering ? 1 : -1) * Math.pow(e, 2.2) * 110;
  const smear = Math.sin(Math.PI * Math.min(1, e));
  return (
    <AbsoluteFill style={{opacity: half(entering, p) ? 1 : 0, overflow: 'hidden'}}>
      {[0, 1, 2, 3].map((i) => (
        <AbsoluteFill key={i} style={{transform: `translateY(${y - i * 6 * smear * (entering ? 1 : -1)}%)`, opacity: i === 0 ? 1 : 0.28 * smear, filter: `blur(${smear * 10}px)`}}>
          {children}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// push: the next scene pushes the old one off the top.
const Push: React.FC<P> = ({children, presentationDirection, presentationProgress: p}) => (
  <AbsoluteFill style={{transform: `translateY(${presentationDirection === 'entering' ? (1 - p) * 100 : -p * 100}%)`}}><Solid>{children}</Solid></AbsoluteFill>
);

// ── mask edits: the next scene is cut into the old one through a shape ──────
// The old scene holds still and darkens underneath; the shape is a clip-path
// (vector, so it stays sharp at any scale) that ends up covering the frame.
type MaskProps = {word?: string};
type MP = TransitionPresentationComponentProps<MaskProps>;
const Under: React.FC<{p: number; children: React.ReactNode}> = ({p, children}) => (
  <AbsoluteFill style={{filter: `brightness(${1 - Math.min(1, p * 1.8) * 0.6}) saturate(${1 - Math.min(1, p * 1.8) * 0.5})`, transform: `scale(${1 + p * 0.04})`}}>{children}</AbsoluteFill>
);
// Transitions run on a steep ease (most of the change in the middle frames).
// A mask reads better at an even pace, so this flattens that ease back out.
const even = (p: number) => (p < 0.5 ? 0.5 * Math.pow(2 * p, 1 / 2.2) : 1 - 0.5 * Math.pow(2 * (1 - p), 1 / 2.2));
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// maskText: the next scene shows through one huge word (scene.maskWord), then
// the camera flies through the letters until they fill the frame.
const MaskText: React.FC<MP> = ({children, presentationDirection, presentationProgress: raw, passedProps}) => {
  const p = even(raw);
  const {width, height} = useVideoConfig();
  if (presentationDirection === 'exiting') return <Under p={p}>{children}</Under>;
  if (p >= 0.995) return <AbsoluteFill><Solid>{children}</Solid></AbsoluteFill>;
  const word = (passedProps.word ?? 'NEXT').toUpperCase().slice(0, 12);
  const id = `mask-text-${word.replace(/[^A-Z0-9]/g, '')}`;
  const size = Math.min(height * 0.78, (width * 0.92) / Math.max(1, word.length * 0.5));
  // 0–0.45 the word lands and holds; 0.45–1 it flies at the camera.
  const land = 0.8 + 0.2 * smooth(p / 0.3);
  const fly = Math.pow(46, Math.pow(Math.max(0, (p - 0.45) / 0.55), 1.7));
  const hole = Math.pow(Math.max(0, (p - 0.62) / 0.38), 1.5) * Math.hypot(width, height) * 0.62;
  const text = (
    <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="central" fontFamily={impactFamily} fontSize={size} letterSpacing={size * 0.01} transform={`translate(${width / 2} ${height / 2}) scale(${land * fly}) translate(${-width / 2} ${-height / 2})`}>
      {word}
    </text>
  );
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <clipPath id={id} clipPathUnits="userSpaceOnUse">
          {text}
          {hole > 0 ? <circle cx={width / 2} cy={height / 2} r={hole} /> : null}
        </clipPath>
      </svg>
      <AbsoluteFill style={{clipPath: `url(#${id})`}}>
        <Solid>{children}</Solid>
      </AbsoluteFill>
      {/* a bright rim on the letters while they are still readable */}
      <svg width={width} height={height} style={{position: 'absolute', opacity: 1 - smooth((p - 0.45) / 0.3)}}>
        {React.cloneElement(text, {fill: 'none', stroke: '#ffffff', strokeWidth: 5 / (land * fly), strokeLinejoin: 'round'})}
      </svg>
    </AbsoluteFill>
  );
};

// maskInk: ink blots bloom from a handful of points and run together.
const MaskInk: React.FC<MP> = ({children, presentationDirection, presentationProgress: raw}) => {
  const p = even(raw);
  const {width, height} = useVideoConfig();
  if (presentationDirection === 'exiting') return <Under p={p}>{children}</Under>;
  if (p >= 0.995) return <AbsoluteFill><Solid>{children}</Solid></AbsoluteFill>;
  const cols = 4;
  const rows = 3;
  const reach = Math.hypot(width / cols, height / rows) * 1.25;
  const blots: string[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const cx = ((i % cols) + 0.2 + random(`ix${i}`) * 0.6) * (width / cols);
    const cy = (Math.floor(i / cols) + 0.2 + random(`iy${i}`) * 0.6) * (height / rows);
    const delay = random(`id${i}`) * 0.42;
    const r = Math.pow(smooth((p - delay) / (1 - delay)), 1.3) * reach;
    if (r < 1) continue;
    const pts: string[] = [];
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      // lumpy edge: two seeded harmonics, strongest while the blot is small
      const lump = 1 + (0.16 * Math.sin(a * 3 + random(`ia${i}`) * 6.3) + 0.09 * Math.sin(a * 7 + random(`ib${i}`) * 6.3)) * (1.2 - 0.6 * p);
      pts.push(`${(cx + Math.cos(a) * r * lump).toFixed(1)} ${(cy + Math.sin(a) * r * lump).toFixed(1)}`);
    }
    blots.push(`M${pts.join('L')}Z`);
  }
  return (
    <AbsoluteFill style={{clipPath: blots.length ? `path(nonzero, '${blots.join('')}')` : 'inset(50%)'}}>
      <Solid>{children}</Solid>
    </AbsoluteFill>
  );
};

// maskBrush: five slanted brush strokes paint the next scene on, alternating
// sides, each with a ragged leading edge.
const MaskBrush: React.FC<MP> = ({children, presentationDirection, presentationProgress: raw}) => {
  const p = even(raw);
  const {width, height} = useVideoConfig();
  if (presentationDirection === 'exiting') return <Under p={p}>{children}</Under>;
  if (p >= 0.995) return <AbsoluteFill><Solid>{children}</Solid></AbsoluteFill>;
  const n = 5;
  const band = height / n;
  const slant = width * 0.06;
  const strokes: string[] = [];
  for (let i = 0; i < n; i++) {
    const local = smooth((p - i * 0.12) / (1 - (n - 1) * 0.12));
    if (local <= 0) continue;
    const ltr = i % 2 === 0;
    const top = i * band - band * 0.12;
    const bottom = (i + 1) * band + band * 0.12;
    const tip = -width * 0.2 + local * width * 1.45; // distance travelled from the starting side
    const X = (d: number) => (ltr ? d : width - d);
    const teeth = 9;
    const pts = [`${X(-width * 0.1)} ${top}`];
    for (let k = 0; k <= teeth; k++) {
      const y = top + ((bottom - top) * k) / teeth;
      const rag = (random(`br${i}-${k}`) - 0.5) * width * 0.07 * (1 - local * 0.6);
      pts.push(`${X(tip + rag + (slant * (k - teeth / 2)) / teeth).toFixed(1)} ${y.toFixed(1)}`);
    }
    pts.push(`${X(-width * 0.1)} ${bottom}`);
    strokes.push(`M${(ltr ? pts : pts.reverse()).join('L')}Z`);
  }
  return (
    <AbsoluteFill style={{clipPath: strokes.length ? `path(nonzero, '${strokes.join('')}')` : 'inset(50%)'}}>
      <Solid>{children}</Solid>
    </AbsoluteFill>
  );
};

const make = (component: React.FC<TransitionPresentationComponentProps<NoProps>>): TransitionPresentation<NoProps> => ({component, props: {}});

// Default rotation comes from the edit style (src/styles).
const ROTATION: TransitionName[] = style.transitions;

// The concrete presentation types differ per transition, so this returns the
// widest shape TransitionSeries.Transition accepts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPresentation = (name: TransitionName | undefined, index: number, word?: string): TransitionPresentation<any> | null => {
  const n = name ?? ROTATION[(index - 1) % ROTATION.length];
  switch (n) {
    case 'zoomPunch':
      return zoomPunch();
    case 'pushCut':
      return pushCut({flashColor: '#ffffff', flashOpacity: 0.3, flashFrames: 4});
    case 'slideLeft':
      return slide({direction: 'from-right'});
    case 'slideUp':
      return slide({direction: 'from-bottom'});
    case 'wipe':
      return wipe({direction: 'from-left'});
    case 'fade':
      return fade();
    case 'paper':
      return make(Paper);
    case 'whip':
      return make(Whip);
    case 'filmBurn':
      return make(FilmBurn);
    case 'iris':
      return make(Iris);
    case 'zoomIn':
      return make(ZoomIn);
    case 'zoomOut':
      return make(ZoomOut);
    case 'glitch':
      return make(Glitch);
    case 'blur':
      return make(Blur);
    case 'pop':
      return make(Pop);
    case 'flip':
      return make(Flip);
    case 'flash':
      return make(Flash);
    case 'dip':
      return make(Dip);
    case 'rgbSplit':
      return make(RgbSplit);
    case 'blinds':
      return make(Blinds);
    case 'strips':
      return make(Strips);
    case 'diamond':
      return make(Diamond);
    case 'clock':
      return make(Clock);
    case 'split':
      return make(Split);
    case 'cube':
      return make(Cube);
    case 'pageTurn':
      return make(PageTurn);
    case 'spin':
      return make(Spin);
    case 'stretch':
      return make(Stretch);
    case 'swirl':
      return make(Swirl);
    case 'lightSweep':
      return make(LightSweep);
    case 'whipUp':
      return make(WhipUp);
    case 'push':
      return make(Push);
    case 'maskText':
      return {component: MaskText, props: {word}};
    case 'maskInk':
      return {component: MaskInk, props: {}};
    case 'maskBrush':
      return {component: MaskBrush, props: {}};
    case 'none':
      return null;
  }
};
