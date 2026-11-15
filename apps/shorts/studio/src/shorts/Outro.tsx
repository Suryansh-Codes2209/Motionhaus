import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {StyleBackground} from '../components/StyleLayers';
import {emphasisStyle} from '../components/KineticText';
import {labelFamily} from '../fonts';
import {alpha, clamp} from '../lib/util';
import {style} from '../styles';
import {episode} from '../video.config';
import {seriesFamily} from './fonts';
import {OUTRO_OVERLAP} from './timing';

// Series end card: rocket mark, "Follow for tomorrow's launch" (Instagram:
// a share prompt), an optional sub line, handle.
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors, handle} = episode.series;
  const fade = interpolate(frame, [0, OUTRO_OVERLAP], [0, 1], clamp);
  const mark = spring({frame: frame - 2, fps, config: {damping: 11, stiffness: 140}});
  const text = spring({frame: frame - 8, fps, config: {damping: 16}});
  const ring = (frame / fps) % 1.2;

  // "Follow for tomorrow's launch" → last two words in the accent gradient.
  const words = episode.outro.text.split(' ');
  const head = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');

  return (
    <AbsoluteFill style={{background: colors.bg, opacity: fade, alignItems: 'center', justifyContent: 'center'}}>
      {style.name === 'radar' ? null : <StyleBackground />}
      {[0, 0.4, 0.8].map((d) => {
        const t = ((ring + d) % 1.2) / 1.2;
        return (
          <div
            key={d}
            style={{
              position: 'absolute',
              width: 360 + t * 700,
              height: 360 + t * 700,
              borderRadius: '50%',
              border: `3px solid ${alpha(colors.accent, 0.35 * (1 - t))}`,
              top: 760 - (360 + t * 700) / 2,
            }}
          />
        );
      })}
      <Img
        src={staticFile('brand/mark.svg')}
        style={{
          position: 'absolute',
          top: 580,
          width: 360,
          height: 360,
          borderRadius: '50%',
          transform: `scale(${mark}) rotate(${(1 - mark) * -25}deg)`,
          boxShadow: `0 0 120px ${alpha(colors.accent2, 0.45)}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 1010,
          width: 900,
          textAlign: 'center',
          fontFamily: seriesFamily,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          color: colors.fg,
          opacity: text,
          transform: `translateY(${(1 - text) * 30}px)`,
        }}
      >
        <div>{head}</div>
        {style.name === 'radar' ? (
          <div
            style={{
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})`,
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {tail}
          </div>
        ) : (
          <div>
            <span style={emphasisStyle(frame, 8)}>{tail}</span>
          </div>
        )}
        {episode.outro.sub ? <div style={{fontFamily: labelFamily, fontWeight: 400, fontSize: 40, letterSpacing: 0, color: colors.fg, marginTop: 26}}>{episode.outro.sub}</div> : null}
        <div style={{fontFamily: labelFamily, fontWeight: 400, fontSize: 36, letterSpacing: 0, color: colors.muted, marginTop: 26}}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
