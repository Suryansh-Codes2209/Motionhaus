// Text effects. ShimmerText ports Magic UI's AnimatedShinyText / Animated
// Gradient Text, NumberTicker ports Magic UI's NumberTicker (both MIT, via
// 21st.dev/@dillionverma), and GlitchText echoes HyperText. All frame-driven.
import React from 'react';
import {Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {clamp} from '../../lib/util';

// A bright band sweeping across text painted in the given colours. Use it
// inline (it renders a span).
export const ShimmerText: React.FC<{
  children: React.ReactNode;
  base: string; // text colour (or a CSS gradient for the body)
  shine: string;
  period?: number; // frames per sweep
  delay?: number;
  style?: React.CSSProperties;
}> = ({children, base, shine, period = 50, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const p = ((Math.max(0, frame - delay) % period) / period) * 2.6 - 0.8; // -0.8 → 1.8
  const baseLayer = base.includes('gradient(') ? base : `linear-gradient(${base}, ${base})`;
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, transparent ${(p - 0.18) * 100}%, ${shine} ${p * 100}%, transparent ${(p + 0.18) * 100}%), ${baseLayer}`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

// Text that tears into RGB-shifted slices on glitch frames, then holds.
// `bursts`: local frames where a glitch starts (each lasts ~6 frames).
export const GlitchText: React.FC<{
  text: string;
  bursts: number[];
  colorA: string;
  colorB: string;
  style?: React.CSSProperties;
}> = ({text, bursts, colorA, colorB, style}) => {
  const frame = useCurrentFrame();
  const b = bursts.find((s) => frame >= s && frame < s + 6);
  const on = b !== undefined;
  const j = (k: string) => (on ? (random(`${k}${frame}`) - 0.5) * 0.12 : 0);
  return (
    <span style={{position: 'relative', display: 'inline-block', ...style}}>
      <span style={{opacity: on ? 0.85 : 1}}>{text}</span>
      {on ? (
        <>
          <span aria-hidden style={{position: 'absolute', inset: 0, color: colorA, mixBlendMode: 'screen', transform: `translate(${j('a')}em, ${j('b') / 2}em)`, clipPath: `inset(${random(`c${frame}`) * 60}% 0 ${random(`d${frame}`) * 30}% 0)`}}>
            {text}
          </span>
          <span aria-hidden style={{position: 'absolute', inset: 0, color: colorB, mixBlendMode: 'screen', transform: `translate(${-j('e')}em, 0)`, clipPath: `inset(${random(`f${frame}`) * 30}% 0 ${random(`g${frame}`) * 60}% 0)`}}>
            {text}
          </span>
        </>
      ) : null}
    </span>
  );
};

const ROW = 1.2; // digit cell height in em; roomy enough for tall serif figures

// Odometer: every digit rolls in its own column toward the target value.
// `value` is the final number; the count runs from `start` over `duration`.
export const NumberTicker: React.FC<{
  value: number;
  start: number;
  duration: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({value, start, duration, decimals = 0, prefix = '', suffix = '', style}) => {
  const frame = useCurrentFrame();
  // Easing.out(Easing.exp) tops out at 0.999, so snap to the exact value at the end.
  const v = frame >= start + duration ? value : interpolate(frame, [start, start + duration], [0, value], {...clamp, easing: Easing.out(Easing.exp)});
  const final = value.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  const scaled = v * 10 ** decimals;
  // Walk the final string right-to-left so separators stay put and each
  // digit column knows its power of ten.
  let place = 0;
  const cells = final
    .split('')
    .reverse()
    .map((ch, i) => {
      if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
      const pos = scaled / 10 ** place;
      place++;
      // Lower digits roll continuously; the column for this place sits at pos mod 10.
      const roll = place === 1 ? pos % 10 : Math.floor(pos) % 10 + Math.max(0, (pos % 1) * 10 - 9);
      return (
        <span key={i} style={{display: 'inline-block', height: `${ROW}em`, overflow: 'hidden', verticalAlign: 'top'}}>
          <span style={{display: 'flex', flexDirection: 'column', transform: `translateY(${-roll * ROW}em)`}}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, k) => (
              <span key={k} style={{height: `${ROW}em`, lineHeight: ROW}}>
                {d}
              </span>
            ))}
          </span>
        </span>
      );
    })
    .reverse();
  return (
    <span style={{display: 'inline-flex', alignItems: 'flex-start', fontVariantNumeric: 'tabular-nums lining-nums', lineHeight: ROW, ...style}}>
      {prefix}
      {cells}
      {suffix}
    </span>
  );
};

// Characters appear one by one with a block cursor (typewriter / terminal).
export const Typewriter: React.FC<{
  text: string;
  start: number;
  cps?: number; // characters per frame
  cursor?: string | false;
  cursorColor?: string;
  style?: React.CSSProperties;
}> = ({text, start, cps = 1, cursor = '▍', cursorColor, style}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) * cps)));
  const typing = n < text.length;
  const blink = typing || Math.floor(frame / 8) % 2 === 0;
  if (frame < start) return null;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {cursor && blink ? <span style={{color: cursorColor}}>{cursor}</span> : null}
    </span>
  );
};
