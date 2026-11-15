import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {labelFamily} from '../fonts';
import {clamp} from '../lib/util';
import {style} from '../styles';
import {episode} from '../video.config';
import {seriesFamily} from '../shorts/fonts';
import {chipShape} from '../shorts/SeriesBug';

// Top-right chip announcing a new chapter ("02 · How it works"), mirrored
// against the series badge on the left. Mounted in a Sequence per chapter.
export const ChapterChip: React.FC<{n: number; title: string; duration: number}> = ({n, title, duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors} = episode.series;
  const s = spring({frame, fps, config: {damping: 16}});
  const out = interpolate(frame, [duration - 10, duration], [1, 0], clamp);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 44,
          right: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 30px',
          ...chipShape(colors),
          opacity: s * out,
          transform: `translateX(${(1 - s) * 40}px)`,
        }}
      >
        <span style={{fontFamily: labelFamily, fontSize: 22, letterSpacing: 2, color: style.name === 'vox' ? colors.accent2 : colors.accent}}>
          {String(n).padStart(2, '0')}
        </span>
        <span style={{fontFamily: seriesFamily, fontWeight: 700, fontSize: 28, color: colors.fg}}>{title}</span>
      </div>
    </AbsoluteFill>
  );
};
