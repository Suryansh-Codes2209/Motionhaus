import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {bodyFamily, displayFamily, impactFamily, labelFamily, serifItalicFamily} from '../fonts';
import {alpha, clamp} from '../lib/util';
import {style} from '../styles';
import {seriesFamily} from './fonts';
import type {CaptionPage} from './timing';

type Skin = {
  family: string;
  weight: number;
  size: number;
  // the strip behind the whole page (vox paper strip, explainer card, terminal box)
  strip?: (fg: string, ink: string) => React.CSSProperties;
  // a word's colours and the shape behind the active word
  word: (o: {active: boolean; past: boolean; emphasis: boolean; hit: number; fg: string; accent: string; ink: string}) => {css: React.CSSProperties; plate?: React.CSSProperties};
  prefix?: string;
  upper?: boolean;
  lower?: boolean;
  slam?: boolean; // the page slams in from oversize instead of rising
  top?: number; // its own vertical position (giant single words sit higher)
};

// Caption presets a script can ask for (script.json → "captions"). 'style'
// keeps the edit style's own skin; the others are the word-highlight looks
// catalogued at 24fps.dev (see fx/CREDITS.md), worth switching to when the
// style's skin has run several episodes in a row.
export type CaptionPreset = 'style' | 'slam' | 'bigKey' | 'pill' | 'sweep' | 'underline';

// Text is the series ink (fg) stroked with the paper (ink = bg), so a preset
// reads on dark and on light palettes alike.
const PRESETS: Record<Exclude<CaptionPreset, 'style'>, Skin> = {
  // one giant condensed word per beat, slammed in: rapid-fire hooks and lists
  slam: {
    family: impactFamily,
    weight: 400,
    size: 200,
    upper: true,
    slam: true,
    top: 1290,
    word: ({emphasis, fg, accent, ink}) => ({css: {color: emphasis ? accent : fg, WebkitTextStroke: `16px ${ink}`, paintOrder: 'stroke fill', textShadow: '0 12px 34px rgba(0,0,0,0.55)', letterSpacing: 1}}),
  },
  // small lowercase filler, the *emphasised* word of each beat blown up
  bigKey: {
    family: bodyFamily,
    weight: 700,
    size: 62,
    lower: true,
    word: ({active, emphasis, hit, fg, accent, ink}) => ({
      css: {
        color: emphasis ? accent : fg,
        opacity: emphasis || active ? 1 : 0.86,
        ...(emphasis ? {fontSize: '1.8em', fontWeight: 800, transform: `scale(${0.9 + 0.1 * hit})`} : {}),
        WebkitTextStroke: `${emphasis ? 14 : 9}px ${ink}`,
        paintOrder: 'stroke fill',
        textShadow: '0 8px 26px rgba(0,0,0,0.5)',
      },
    }),
  },
  // a rounded pill jumps to the word being said
  pill: {
    family: bodyFamily,
    weight: 800,
    size: 82,
    word: ({active, hit, fg, accent, ink}) => ({
      css: {color: active ? '#ffffff' : fg, ...(active ? {} : stroke(ink))},
      plate: active ? {borderRadius: 999, background: accent, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', transform: `scale(${0.8 + 0.2 * hit})`} : undefined,
    }),
  },
  // words turn the accent as they are said and stay lit (lyric style)
  sweep: {
    family: bodyFamily,
    weight: 800,
    size: 84,
    word: ({past, fg, accent, ink}) => ({css: {color: past ? accent : fg, ...stroke(ink)}}),
  },
  // an underline tracks the word being said
  underline: {
    family: displayFamily,
    weight: 800,
    size: 84,
    word: ({active, hit, fg, accent, ink}) => ({
      css: {color: fg, ...stroke(ink)},
      plate: active ? {left: 12, right: 12, top: 'auto', bottom: 0, height: 10, borderRadius: 5, background: accent, transformOrigin: 'left', transform: `scaleX(${hit})`} : undefined,
    }),
  },
};

const stroke = (ink: string): React.CSSProperties => ({WebkitTextStroke: `14px ${ink}`, paintOrder: 'stroke fill', textShadow: '0 8px 28px rgba(0,0,0,0.5)'});

// One caption skin per edit style. Placement (the Shorts safe zone) is shared.
const SKINS: Record<string, Skin> = {
  radar: {
    family: seriesFamily,
    weight: 700,
    size: 88,
    word: ({active, emphasis, hit, fg, accent, ink}) => ({
      css: {color: active ? ink : emphasis ? accent : fg, ...(active ? {} : stroke(ink))},
      plate: active ? {borderRadius: 22, background: accent, boxShadow: '0 10px 36px rgba(0,0,0,0.45)', transform: `rotate(-2deg) scale(${0.85 + 0.15 * hit})`} : undefined,
    }),
  },
  vox: {
    family: bodyFamily,
    weight: 800,
    size: 76,
    strip: (fg) => ({background: '#FFFDF7', border: `4px solid ${fg}`, boxShadow: `8px 9px 0 ${fg}`, padding: '10px 18px', transform: 'rotate(-1deg)'}),
    word: ({active, emphasis, hit, fg, accent}) => ({
      css: {color: fg},
      plate:
        active || emphasis
          ? {left: 6, right: 6, top: '48%', bottom: '8%', background: alpha(accent, active ? 0.85 : 0.45), transformOrigin: 'left', transform: `scaleX(${active ? hit : 1}) rotate(-1deg)`, borderRadius: 4}
          : undefined,
    }),
  },
  explainer: {
    family: displayFamily,
    weight: 800,
    size: 80,
    strip: (fg, ink) => ({background: alpha(ink, 0.82), borderRadius: 28, padding: '8px 16px', boxShadow: `0 16px 40px ${alpha('#000000', 0.3)}`, border: `2px solid ${alpha(fg, 0.12)}`}),
    word: ({active, emphasis, fg, accent}) => ({
      css: {color: active || emphasis ? accent : fg, opacity: active ? 1 : 0.92},
      plate: active ? {left: 14, right: 14, bottom: 4, top: 'auto', height: 7, borderRadius: 4, background: accent} : undefined,
    }),
  },
  neon: {
    family: bodyFamily,
    weight: 800,
    size: 86,
    word: ({active, emphasis, fg, accent, ink}) => ({
      css: active
        ? {color: '#ffffff', textShadow: `0 0 18px ${accent}, 0 0 42px ${accent}`, WebkitTextStroke: `10px ${ink}`, paintOrder: 'stroke fill'}
        : {color: emphasis ? accent : fg, ...stroke(ink)},
    }),
  },
  terminal: {
    family: labelFamily,
    weight: 700,
    size: 74,
    prefix: '>',
    strip: (_fg, ink) => ({background: alpha(ink, 0.88), padding: '6px 14px', border: `2px solid currentColor`}),
    word: ({active, emphasis, fg, accent, ink}) => ({
      css: {color: active ? ink : emphasis ? accent : fg},
      plate: active ? {background: accent, borderRadius: 0} : undefined,
    }),
  },
  // toybox: the italic serif line in capitals, ink on paper, the word being
  // said lifts into the accent.
  toybox: {
    family: serifItalicFamily,
    weight: 400,
    size: 104,
    upper: true,
    word: ({active, emphasis, hit, fg, accent}) => ({
      css: {color: active || emphasis ? accent : fg, fontStyle: 'italic', transform: active ? `translateY(${-6 * hit}px)` : undefined},
    }),
  },
  // 3d: heavy type with an extruded edge (stacked hard shadows).
  '3d': {
    family: displayFamily,
    weight: 800,
    size: 88,
    word: ({active, emphasis, fg, accent, ink}) => {
      const edge = active ? accent : ink;
      return {
        css: {
          color: active ? '#ffffff' : emphasis ? accent : fg,
          textShadow: [1, 2, 3, 4, 5, 6, 7].map((i) => `${i * 0.6}px ${i}px 0 ${edge}`).join(', ') + ', 0 18px 30px rgba(0,0,0,0.55)',
        },
      };
    },
  },
  // headshot: bold white on the face (shadow, no box), emphasis and the
  // active word in the accent, like a creator's own captions.
  headshot: {
    family: bodyFamily,
    weight: 800,
    size: 84,
    word: ({active, emphasis, fg, accent}) => ({
      css: {
        color: active || emphasis ? accent : '#ffffff',
        WebkitTextStroke: `10px ${alpha(fg, 0.85)}`,
        paintOrder: 'stroke fill',
        textShadow: '0 6px 22px rgba(0,0,0,0.55)',
      },
    }),
  },
};

// Burned-in captions, 1–3 words per page, skinned per edit style. Placed in
// the Shorts safe zone: above the bottom title/channel overlay (~20%) and
// clear of the right action rail.
// top: the split (headshot) layout puts them just under the panel, on the face.
export const Captions: React.FC<{pages: CaptionPage[]; fg: string; accent: string; ink: string; top?: number; preset?: CaptionPreset}> = ({pages, fg, accent, ink, top: topProp, preset = 'style'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  if (!page) return null;
  const skin = (preset !== 'style' && PRESETS[preset]) || SKINS[style.name] || SKINS.radar;
  const top = topProp ?? skin.top ?? 1390;
  const custom = preset !== 'style' && Boolean(PRESETS[preset]);

  const pop = spring({frame: frame - page.from, fps, config: {damping: 15, stiffness: 260}});
  const out = interpolate(frame, [page.to - 3, page.to], [1, 0], clamp);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top, left: 60, right: 150, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '0 6px',
            fontFamily: skin.family,
            fontWeight: skin.weight,
            fontSize: skin.size,
            lineHeight: 1.15,
            letterSpacing: style.name === 'terminal' && !custom ? 0 : -1.5,
            color: accent,
            ...skin.strip?.(fg, ink),
            transform: skin.slam ? `scale(${1 + (1 - Math.min(1, pop)) * 0.7})` : `${skin.strip?.(fg, ink).transform ?? ''} translateY(${(1 - pop) * 18}px) scale(${0.9 + 0.1 * pop})`,
            opacity: Math.min(1, pop * 1.8) * out,
          }}
        >
          {skin.prefix && !custom ? <span style={{color: accent, padding: '2px 10px 8px 4px'}}>{skin.prefix}</span> : null}
          {page.words.map((w, i) => {
            const next = page.words[i + 1]?.from ?? page.to;
            const active = frame >= w.from && frame < next;
            const hit = Math.min(1, spring({frame: frame - w.from, fps, config: {damping: 12, stiffness: 320}, durationInFrames: 8}));
            const bump = active && (custom || style.name !== 'vox') && !skin.slam ? 1 + 0.1 * Math.sin(hit * Math.PI) : 1;
            const {css, plate} = skin.word({active, past: frame >= w.from, emphasis: !!w.emphasis, hit, fg, accent, ink});
            const {transform: wt, ...rest} = css;
            return (
              <span key={i} style={{position: 'relative', display: 'inline-block', padding: '2px 18px 8px', transform: `scale(${bump}) ${wt ?? ''}`, zIndex: active ? 1 : 0, ...rest}}>
                {plate ? <span style={{position: 'absolute', inset: 0, zIndex: -1, ...plate}} /> : null}
                {skin.upper ? w.text.toUpperCase() : skin.lower ? w.text.toLowerCase() : w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
