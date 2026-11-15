import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {labelFamily} from '../fonts';
import {alpha, clamp} from '../lib/util';
import {style} from '../styles';
import {episode} from '../video.config';

// News-style chip above the hook ("FOLLOW-UP · GITHUB · OCT 21"), shown for
// the first scene only. Gives the opening a dateline, like a news lower third.
export const Kicker: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors} = episode.series;
  if (!episode.kicker) return null;
  const s = spring({frame: frame - 2, fps, config: {damping: 14}});
  const out = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  const blink = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.35;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: 560,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 30px',
          borderRadius: style.name === 'vox' || style.name === 'terminal' ? 4 : 999,
          border: `2px solid ${alpha(colors.accent, 0.6)}`,
          background: style.name === 'vox' ? colors.fg : alpha(colors.accent, 0.12),
          fontFamily: labelFamily,
          fontWeight: style.name === 'vox' ? 700 : 400,
          fontSize: 30,
          letterSpacing: 3,
          color: colors.accent,
          opacity: s * out,
          transform: `translateY(${(1 - s) * -24}px)`,
          clipPath: `inset(0 ${(1 - s) * 100}% 0 0 round ${style.name === 'vox' || style.name === 'terminal' ? 4 : 999}px)`,
        }}
      >
        <span style={{width: 14, height: 14, borderRadius: '50%', background: colors.accent2, opacity: blink, boxShadow: `0 0 16px ${colors.accent2}`}} />
        {episode.kicker}
      </div>
    </AbsoluteFill>
  );
};
