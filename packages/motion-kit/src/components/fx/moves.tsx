import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {displayFamily, displayMaxWeight} from '../../fonts';
import {config} from '../../video.config';
import {emphasisStyle, tokenize} from '../KineticText';

// The motion vocabulary: named entrance moves, eases and idle loops that any
// text (or any box) can take. One move = a pure function of progress 0..1, so
// every scene can say "pop" or "maskUp" instead of hand-rolling springs.
// The names follow the editor-preset vocabulary catalogued at 24fps.dev
// (see fx/CREDITS.md); the implementations are ours.

export type MoveName =
  | 'fade'
  | 'rise' // up from below
  | 'drop' // down from above
  | 'slideLeft'
  | 'slideRight'
  | 'pop' // small → overshoot → rest
  | 'slam' // huge and blurred → rest, hard
  | 'scale'
  | 'blur' // defocused → sharp
  | 'riseBlur'
  | 'maskUp' // rises out of a clipped line (the classic title reveal)
  | 'wipe' // revealed left to right
  | 'flip' // turns over on the x axis
  | 'flipY'
  | 'stretch' // squashed wide → rest
  | 'squeeze' // squashed tall → rest
  | 'spin'
  | 'swing' // hangs from the top edge and settles
  | 'roll' // rolls in from the left
  | 'jelly' // wobbling squash and stretch
  | 'zoomIn' // from far away
  | 'shrink' // from too close
  | 'flicker' // a failing tube catching
  | 'glitch'; // jittering slices

export type EaseName = 'linear' | 'out' | 'inOut' | 'expo' | 'back' | 'elastic' | 'snap';

const c01 = (x: number) => Math.min(1, Math.max(0, x));

export const EASE: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // overshoots by ~10% then settles
  back: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  elastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
  // nearly instant: 80% of the way in the first fifth
  snap: (t) => 1 - Math.pow(1 - t, 6),
};

// The ease a move reads best with when the caller names none.
const DEFAULT_EASE: Partial<Record<MoveName, EaseName>> = {pop: 'back', slam: 'snap', jelly: 'elastic', swing: 'elastic', drop: 'back', flicker: 'linear', glitch: 'linear', wipe: 'inOut'};

/**
 * CSS for `move` at raw progress t (0 = not started, 1 = at rest). `seed`
 * keeps the random moves (flicker, glitch) different per item.
 */
export const moveStyle = (move: MoveName, t: number, ease?: EaseName, seed = 0): React.CSSProperties => {
  if (t >= 1) return {};
  if (t <= 0) return {opacity: 0};
  const p = EASE[ease ?? DEFAULT_EASE[move] ?? 'out'](c01(t));
  const q = 1 - p;
  const fadeIn = c01(t * 3);
  switch (move) {
    case 'fade':
      return {opacity: p};
    case 'rise':
      return {transform: `translateY(${q * 0.7}em)`, opacity: fadeIn};
    case 'drop':
      return {transform: `translateY(${-q * 0.9}em)`, opacity: fadeIn};
    case 'slideLeft':
      return {transform: `translateX(${q * 1.2}em)`, opacity: fadeIn};
    case 'slideRight':
      return {transform: `translateX(${-q * 1.2}em)`, opacity: fadeIn};
    case 'pop':
      return {transform: `scale(${0.3 + 0.7 * p})`, opacity: fadeIn};
    case 'slam':
      return {transform: `scale(${1 + q * 2.2})`, filter: `blur(${q * 18}px)`, opacity: c01(t * 5)};
    case 'scale':
      return {transform: `scale(${0.7 + 0.3 * p})`, opacity: p};
    case 'blur':
      return {filter: `blur(${q * 22}px)`, opacity: p};
    case 'riseBlur':
      return {transform: `translateY(${q * 0.5}em)`, filter: `blur(${q * 16}px)`, opacity: p};
    case 'maskUp':
      return {transform: `translateY(${q * 110}%)`, clipPath: `inset(${-q * 110 - 15}% -10% -15% -10%)`};
    case 'wipe':
      return {clipPath: `inset(-20% ${q * 100}% -20% -5%)`};
    case 'flip':
      return {transform: `perspective(600px) rotateX(${q * 90}deg)`, transformOrigin: '50% 100%', opacity: fadeIn};
    case 'flipY':
      return {transform: `perspective(600px) rotateY(${q * -90}deg)`, opacity: fadeIn};
    case 'stretch':
      return {transform: `scale(${1 + q * 1.6}, ${1 - q * 0.6})`, opacity: fadeIn};
    case 'squeeze':
      return {transform: `scale(${1 - q * 0.7}, ${1 + q * 0.9})`, opacity: fadeIn};
    case 'spin':
      return {transform: `rotate(${q * -180}deg) scale(${0.4 + 0.6 * p})`, opacity: fadeIn};
    case 'swing':
      return {transform: `rotate(${q * 28}deg)`, transformOrigin: '50% 0%', opacity: fadeIn};
    case 'roll':
      return {transform: `translateX(${-q * 1.6}em) rotate(${-q * 120}deg)`, opacity: fadeIn};
    case 'jelly':
      return {transform: `scale(${1 + q * 0.5}, ${1 - q * 0.5})`, opacity: fadeIn};
    case 'zoomIn':
      return {transform: `scale(${0.05 + 0.95 * p})`, opacity: fadeIn};
    case 'shrink':
      return {transform: `scale(${1 + q * 3})`, opacity: p};
    case 'flicker':
      return {opacity: random(`fk${seed}-${Math.floor(t * 9)}`) < 0.25 + t * 0.75 ? 1 : 0.08};
    case 'glitch': {
      const k = Math.floor(t * 8);
      const dx = (random(`gl${seed}-${k}`) - 0.5) * q * 1.2;
      const top = random(`gy${seed}-${k}`) * 60;
      return {transform: `translateX(${dx}em) skewX(${dx * 30}deg)`, clipPath: t < 0.7 ? `inset(${top * q}% 0 ${(40 - top * 0.6) * q}% 0)` : undefined, opacity: 1};
    }
  }
};

export type LoopName = 'float' | 'pulse' | 'shake' | 'wobble' | 'wave' | 'heartbeat' | 'breathe' | 'swing';

/** Idle motion after the entrance: `f` frames since the item landed, `i` its index (wave offsets by it). */
export const loopStyle = (loop: LoopName | undefined, f: number, fps: number, i = 0): string => {
  if (!loop || f <= 0) return '';
  const s = f / fps;
  switch (loop) {
    case 'float':
      return `translateY(${Math.sin(s * 2.2 + i) * 0.06}em)`;
    case 'pulse':
      return `scale(${1 + 0.05 * Math.sin(s * 6)})`;
    case 'shake':
      return `translate(${Math.sin(s * 47 + i) * 0.02}em, ${Math.cos(s * 53) * 0.02}em)`;
    case 'wobble':
      return `rotate(${Math.sin(s * 5 + i) * 2.5}deg)`;
    case 'wave':
      return `translateY(${Math.sin(s * 5 - i * 0.6) * 0.09}em)`;
    case 'heartbeat': {
      const b = (s * 1.4) % 1;
      return `scale(${1 + 0.1 * Math.exp(-b * 9) + 0.06 * Math.exp(-Math.abs(b - 0.22) * 22)})`;
    }
    case 'breathe':
      return `scale(${1 + 0.03 * Math.sin(s * 1.6)})`;
    case 'swing':
      return `rotate(${Math.sin(s * 2.4) * 4}deg)`;
  }
};

type Order = 'forward' | 'reverse' | 'center' | 'edges' | 'random';

// Position of item i (of n) in the reveal order, 0..n-1.
const rank = (i: number, n: number, order: Order, seed: string) => {
  switch (order) {
    case 'reverse':
      return n - 1 - i;
    case 'center':
      return Math.abs(i - (n - 1) / 2) * 2;
    case 'edges':
      return (n - 1) / 2 - Math.abs(i - (n - 1) / 2);
    case 'random':
      return random(`${seed}${i}`) * (n - 1);
    default:
      return i;
  }
};

type Props = {
  text: string; // *emphasis* marks the accent words, as everywhere
  size: number;
  move?: MoveName;
  split?: 'words' | 'chars' | 'line';
  order?: Order;
  at?: number; // frame the first item starts
  stagger?: number; // frames between items
  dur?: number; // frames one item takes
  ease?: EaseName;
  loop?: LoopName;
  // words: frames between words that shrink as the line goes on (an
  // accelerating build); overrides stagger. e.g. [9, 6, 4]
  gaps?: number[];
  // words: each word this much bigger than the last (1.15 = +15%)
  grow?: number;
  family?: string;
  weight?: number;
  color?: string;
  upper?: boolean;
  align?: 'left' | 'center' | 'right';
  fitWidth?: number; // shrink so the line fits this width
  widthScale?: number; // glyph width vs the default sans (condensed ≈ 0.72)
  letterSpacing?: string;
  lineHeight?: number;
  outline?: {width: number; color: string}; // hollow, stroked letters
  stroke?: {width: number; color: string}; // filled letters with an outer stroke
  shadow?: string;
  onDark?: boolean; // emphasis over a photo
  style?: React.CSSProperties;
};

// Kinetic text built from the move vocabulary: split into words or
// characters, revealed in any order, then left idling on a loop.
export const MotionText: React.FC<Props> = ({
  text,
  size,
  move = 'rise',
  split = 'words',
  order = 'forward',
  at = 0,
  stagger = 3,
  dur = 9,
  ease,
  loop,
  gaps,
  grow,
  family = displayFamily,
  weight = 800,
  color,
  upper,
  align = 'center',
  fitWidth,
  widthScale = 1,
  letterSpacing = '-0.03em',
  lineHeight = 1.02,
  outline,
  stroke,
  shadow,
  onDark,
  style,
}) => {
  const frame = useCurrentFrame();
  const fps = config.fps;
  const {fg} = config.brand.colors;
  const tokens = tokenize(upper ? text.toUpperCase() : text);
  const chars = tokens.reduce((n, t) => n + t.word.length + 1, 0);
  const fontSize = fitWidth ? Math.min(size, fitWidth / Math.max(1, chars * 0.55 * widthScale)) : size;

  // start frame per word (gaps give an accelerating build)
  const starts: number[] = [];
  tokens.forEach((_, i) => {
    if (gaps?.length) starts.push(i === 0 ? at : starts[i - 1] + gaps[Math.min(i - 1, gaps.length - 1)]);
    else starts.push(at + rank(i, tokens.length, order, text) * stagger);
  });

  const paint: React.CSSProperties = outline
    ? {color: 'transparent', WebkitTextStroke: `${outline.width}px ${outline.color}`}
    : stroke
      ? {WebkitTextStroke: `${stroke.width}px ${stroke.color}`, paintOrder: 'stroke fill'}
      : {};

  const item = (key: React.Key, body: React.ReactNode, start: number, i: number, em: boolean, scale = 1) => {
    const t = (frame - start) / dur;
    const css = moveStyle(move, t, ease, i);
    const idle = loopStyle(loop, frame - start - dur, fps, i);
    return (
      <span
        key={key}
        style={{
          display: 'inline-block',
          whiteSpace: 'pre',
          fontSize: scale === 1 ? undefined : `${scale}em`,
          ...paint,
          ...(em && !outline ? emphasisStyle(frame, start, onDark) : {}),
          ...css,
          transform: [css.transform, idle].filter(Boolean).join(' ') || undefined,
        }}
      >
        {body}
      </span>
    );
  };

  let ci = 0;
  const total = chars;
  return (
    <div
      style={{
        fontFamily: family,
        fontSize,
        fontWeight: family === displayFamily ? Math.min(weight, displayMaxWeight) : weight,
        letterSpacing,
        lineHeight,
        color: color ?? fg,
        textAlign: align,
        textShadow: shadow,
        ...style,
      }}
    >
      {split === 'line'
        ? item('l', tokens.map((t) => t.word).join(' '), at, 0, false)
        : tokens.map((t, i) => {
            const scale = grow ? Math.pow(grow, i) : 1;
            if (split === 'words') return <React.Fragment key={i}>{item(i, t.word, starts[i], i, t.em, scale)} </React.Fragment>;
            return (
              <React.Fragment key={i}>
                <span style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
                  {[...t.word].map((ch, j) => {
                    const k = ci++;
                    return item(j, ch, at + rank(k, total, order, text) * stagger, k, t.em);
                  })}
                </span>{' '}
                {(ci++, null)}
              </React.Fragment>
            );
          })}
    </div>
  );
};

/**
 * The word a hook or a type scene headlines: the first *emphasised* run when
 * it is short (≤ 12 characters), else its longest word; with no emphasis,
 * the longest word of the text.
 */
export const keywordOf = (text: string) => {
  const tokens = tokenize(text);
  const clean = (w: string) => w.replace(/[.,!?:;]+$/, '');
  const longest = (ws: string[]) => [...ws].sort((a, b) => b.length - a.length)[0] ?? '';
  const first = tokens.findIndex((t) => t.em);
  if (first < 0) return longest(tokens.map((t) => clean(t.word)));
  let end = first;
  while (end < tokens.length && tokens[end].em && (end === first || !/[.,!?:;]$/.test(tokens[end - 1].word))) end++;
  const run = tokens.slice(first, end).map((t) => clean(t.word));
  return run.join(' ').length <= 12 ? run.join(' ') : longest(run);
};
