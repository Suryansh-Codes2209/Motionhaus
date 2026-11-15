import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {labelFamily} from '../fonts';
import {alpha} from '../lib/util';
import {style} from '../styles';
import {episode} from '../video.config';
import {seriesFamily} from './fonts';

// The badge's chip surface in the active edit style (also used by the
// long-form chapter chip).
export const chipShape = (colors: {bg: string; fg: string; accent: string}): React.CSSProperties =>
  style.name === 'vox'
    ? {borderRadius: 6, background: '#FFFDF7', border: `3px solid ${colors.fg}`, boxShadow: `6px 7px 0 ${colors.fg}`}
    : style.name === 'terminal'
      ? {borderRadius: 2, background: alpha(colors.bg, 0.85), border: `2px solid ${alpha(colors.accent, 0.7)}`}
      : {borderRadius: 999, background: alpha(colors.bg, 0.72), border: `2px solid ${alpha(colors.fg, 0.12)}`, backdropFilter: 'blur(14px)'};

// The series line: the episode number ("#042") takes the accent colour, the
// rest stays muted. The text is the channel's (publish.badge).
const BadgeLine: React.FC<{text: string; accent: string}> = ({text, accent}) => {
  const m = text.match(/^(#\d+)(.*)$/s);
  if (!m) return <>{text}</>;
  return (
    <>
      <span style={{color: accent}}>{m[1]}</span>
      {m[2]}
    </>
  );
};

// Persistent top-left badge: makes clear this is Launch Radar covering a
// launch, not the product's own ad (spec §2.1). Long-form places it higher
// and smaller via `at`.
export const SeriesBug: React.FC<{at?: {top: number; left: number; scale: number}}> = ({at = {top: 110, left: 48, scale: 1}}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors, name} = episode.series;
  const s = spring({frame: frame - 3, fps, config: {damping: 16}});
  const shape = chipShape(colors);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: at.top,
          left: at.left,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 32px 12px 12px',
          ...shape,
          opacity: s,
          transform: `translateX(${(1 - s) * -40}px) scale(${at.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <Img src={staticFile('brand/mark.svg')} style={{width: 76, height: 76, borderRadius: '50%'}} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
          <div style={{fontFamily: seriesFamily, fontWeight: 700, fontSize: 33, letterSpacing: 1.5, color: colors.fg}}>
            {name.toUpperCase()}
          </div>
          <div style={{fontFamily: labelFamily, fontSize: 25, color: colors.muted}}>
            {episode.platform === 'instagram' ? (
              // the "#nnn · via GitHub" line read like a link roundup on Instagram
              episode.series.handle
            ) : (
              <BadgeLine text={episode.series.badge ?? `#${String(episode.episode).padStart(3, '0')} · via ${episode.sourceLabel}`} accent={style.name === 'vox' ? colors.accent2 : colors.accent} />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
