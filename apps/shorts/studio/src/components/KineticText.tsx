import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {displayFamily, displayMaxWeight, displayWidthScale, serifItalicFamily} from '../fonts';
import {alpha, isDark} from '../lib/util';
import {style} from '../styles';
import {config} from '../video.config';

// How an *emphasised* word is painted in the active edit style. onDark: the
// text sits on a photo or another dark plate, where the marker's dark ink
// vanishes, so the word is painted in the accent instead.
export const emphasisStyle = (frame: number, startFrame: number, onDark = false): React.CSSProperties => {
  const {fg, accent, accent2} = config.brand.colors;
  switch (style.emphasis) {
    case 'marker': {
      if (onDark) return {color: accent};
      // Highlighter swipe behind the word, drawn left to right after it lands.
      const p = Math.min(1, Math.max(0, (frame - startFrame - 6) / 8));
      return {
        color: fg,
        backgroundImage: `linear-gradient(100deg, ${alpha(accent, 0.75)}, ${alpha(accent, 0.6)})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${p * 100}% 42%`,
        backgroundPosition: '0 82%',
      };
    }
    case 'solid':
      return {color: accent};
    case 'serif': {
      // Italic serif in the accent, underlined by a hand stroke once it lands.
      const p = Math.min(1, Math.max(0, (frame - startFrame - 5) / 9));
      return {
        color: accent,
        fontFamily: serifItalicFamily,
        fontStyle: 'italic',
        fontWeight: 400,
        backgroundImage: `linear-gradient(${accent}, ${accent})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${p * 100}% 0.06em`,
        backgroundPosition: '0 92%',
      };
    }
    case 'shimmer': {
      const t = (((frame - startFrame) % 45) / 45) * 2.6 - 0.8;
      return {
        backgroundImage: `linear-gradient(100deg, transparent ${(t - 0.2) * 100}%, ${alpha('#ffffff', 0.95)} ${t * 100}%, transparent ${(t + 0.2) * 100}%), linear-gradient(100deg, ${accent}, ${accent2})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        filter: `drop-shadow(0 0 0.25em ${alpha(accent, 0.45)})`,
      };
    }
    default:
      return {
        backgroundImage: `linear-gradient(100deg, ${accent}, ${accent2})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      };
  }
};

type Props = {
  text: string;
  size: number;
  delay?: number;
  stagger?: number; // frames between words
  weight?: number;
  color?: string;
  family?: string;
  align?: 'left' | 'center';
  // If set, shrinks the font so the text fits on one line of this width.
  fitWidth?: number;
  letterSpacing?: string;
  lineHeight?: number;
};

// Splits "*a few words*" into emphasized tokens.
export const tokenize = (text: string) => {
  let on = false;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      let w = raw;
      const starts = w.startsWith('*');
      if (starts) {
        on = true;
        w = w.slice(1);
      }
      const em = on;
      if (/\*[.,!?:;]*$/.test(w)) {
        on = false;
        w = w.replace(/\*([.,!?:;]*)$/, '$1');
      }
      return {word: w, em};
    });
};

// Word-by-word masked rise with blur and a little rotation: the classic
// After Effects text reveal.
export const KineticText: React.FC<Props> = ({
  text,
  size,
  delay = 0,
  stagger = 3,
  weight = 700,
  color,
  family = displayFamily,
  align = 'center',
  fitWidth,
  letterSpacing = '-0.03em',
  lineHeight = 1.05,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {fg} = config.brand.colors;
  const tokens = tokenize(text);
  const chars = tokens.reduce((n, t) => n + t.word.length + 1, 0);
  const fontSize = fitWidth ? Math.min(size, fitWidth / Math.max(1, chars * 0.55 * (family === displayFamily ? displayWidthScale : 1))) : size;

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
      }}
    >
      {tokens.map((t, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: {damping: 14, stiffness: 160, mass: 0.7},
        });
        const blur = Math.max(0, (1 - s) * 14);
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block',
                overflow: 'hidden',
                verticalAlign: 'top',
                padding: '0.1em 0.05em',
                margin: '-0.1em 0',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: `translateY(${(1 - s) * 105}%) rotate(${(1 - s) * 7}deg)`,
                  transformOrigin: 'left bottom',
                  filter: `blur(${blur}px)`,
                  opacity: Math.min(1, s * 1.5),
                  ...(t.em ? emphasisStyle(frame, delay + i * stagger, color !== undefined && isDark(fg) && !isDark(color)) : {}),
                }}
              >
                {t.word}
              </span>
            </span>{' '}
          </React.Fragment>
        );
      })}
    </div>
  );
};
