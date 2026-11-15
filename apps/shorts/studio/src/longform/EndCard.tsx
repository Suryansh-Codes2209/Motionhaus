import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {emphasisStyle} from '../components/KineticText';
import {StyleBackground} from '../components/StyleLayers';
import {labelFamily} from '../fonts';
import {alpha, clamp} from '../lib/util';
import {style} from '../styles';
import {episode} from '../video.config';
import {seriesFamily} from '../shorts/fonts';
import {OUTRO_OVERLAP} from '../shorts/timing';

// 16:9 end card. The left 45% carries the mark, the outro line and the
// handle; the right side stays clear for YouTube end-screen elements (a
// video tile and the subscribe button are placed there in Studio).
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors, handle} = episode.series;
  const fade = interpolate(frame, [0, OUTRO_OVERLAP], [0, 1], clamp);
  const mark = spring({frame: frame - 2, fps, config: {damping: 11, stiffness: 140}});
  const text = spring({frame: frame - 8, fps, config: {damping: 16}});
  const ring = (frame / fps) % 1.6;

  const words = episode.outro.text.split(' ');
  const head = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');
  const cx = 420;
  const cy = 330;

  return (
    <AbsoluteFill style={{background: colors.bg, opacity: fade}}>
      {style.name === 'radar' ? null : <StyleBackground />}
      {[0, 0.53, 1.06].map((d) => {
        const t = ((ring + d) % 1.6) / 1.6;
        const r = 240 + t * 520;
        return (
          <div
            key={d}
            style={{position: 'absolute', left: cx - r / 2, top: cy - r / 2, width: r, height: r, borderRadius: '50%', border: `3px solid ${alpha(colors.accent, 0.3 * (1 - t))}`}}
          />
        );
      })}
      <Img
        src={staticFile('brand/mark.svg')}
        style={{
          position: 'absolute',
          left: cx - 120,
          top: cy - 120,
          width: 240,
          height: 240,
          borderRadius: '50%',
          transform: `scale(${mark}) rotate(${(1 - mark) * -25}deg)`,
          boxShadow: `0 0 100px ${alpha(colors.accent2, 0.45)}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 540,
          width: 760,
          fontFamily: seriesFamily,
          fontWeight: 700,
          fontSize: 76,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          color: colors.fg,
          opacity: text,
          transform: `translateY(${(1 - text) * 30}px)`,
        }}
      >
        <div>{head}</div>
        {style.name === 'radar' ? (
          <div style={{background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})`, WebkitBackgroundClip: 'text', color: 'transparent'}}>{tail}</div>
        ) : (
          <div>
            <span style={emphasisStyle(frame, 8)}>{tail}</span>
          </div>
        )}
        <div style={{fontFamily: labelFamily, fontWeight: 400, fontSize: 32, letterSpacing: 0, color: colors.muted, marginTop: 24}}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};
