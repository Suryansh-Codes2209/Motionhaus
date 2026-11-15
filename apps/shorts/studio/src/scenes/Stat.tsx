import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {NumberTicker} from '../components/fx/text';
import {KineticText} from '../components/KineticText';
import {style} from '../styles';
import {bodyFamily, displayFamily, displayMaxWeight, displayWidthScale} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// A single big number that counts up with an expo ease and a glow pulse.
export const Stat: React.FC<{scene: SceneOf<'stat'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;

  const end = enter + fpb * 2;
  // Easing.out(Easing.exp) tops out at 0.999, so snap to the exact value at the end.
  const v =
    frame >= end
      ? scene.value
      : interpolate(frame, [enter, end], [0, scene.value], {...clamp, easing: Easing.out(Easing.exp)});
  const text = `${scene.prefix ?? ''}${v.toLocaleString('en-US', {
    minimumFractionDigits: scene.decimals ?? 0,
    maximumFractionDigits: scene.decimals ?? 0,
  })}${scene.suffix ?? ''}`;
  const pulse = interpolate(frame, [end, end + 6, end + 24], [1, 1.06, 1], clamp);
  const glow = interpolate(frame, [enter, end, end + 30], [0, 1, 0.6], clamp);
  const size = Math.min(300 * u, (width * 0.8) / Math.max(1, text.length * 0.6 * displayWidthScale));

  // Non-radar styles roll an odometer (Magic UI NumberTicker) in the style's ink.
  const tickerColor = style.name === 'vox' ? colors.fg : colors.accent;
  // A single-weight serif (toy box) can't carry a big number: tickers use the heavy body sans there.
  const serif = displayMaxWeight < 500;
  const ticker =
    style.name === 'radar' ? null : (
      <div
        style={{
          fontFamily: serif ? bodyFamily : displayFamily,
          fontWeight: serif ? 800 : Math.min(800, displayMaxWeight),
          fontSize: serif ? size * 0.9 : size,
          letterSpacing: '-0.04em',
          color: tickerColor,
          transform: `scale(${pulse})`,
          filter: style.name === 'vox' || serif ? undefined : `drop-shadow(0 0 ${40 * u * glow}px ${alpha(colors.accent, style.name === 'explainer' ? 0.25 : 0.7)})`,
        }}
      >
        <NumberTicker value={scene.value} start={enter} duration={fpb * 2} decimals={scene.decimals} prefix={scene.prefix} suffix={scene.suffix} />
      </div>
    );

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <Sfx name="impact" at={enter} volume={0.6} />
      <Sfx name="pop" at={end} volume={0.5} />
      {ticker ?? <div
        style={{
          fontFamily: displayFamily,
          fontWeight: Math.min(800, displayMaxWeight),
          fontSize: size,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          backgroundImage: `linear-gradient(120deg, ${colors.fg} 20%, ${colors.accent} 60%, ${colors.accent2})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          transform: `scale(${pulse})`,
          filter: `drop-shadow(0 0 ${50 * u * glow}px ${alpha(colors.accent, 0.7)})`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {text}
      </div>}
      <KineticText
        text={scene.label}
        size={50 * u}
        fitWidth={width * 0.85}
        delay={enter + fpb}
        weight={500}
        color={colors.muted}
        family={bodyFamily}
        letterSpacing="-0.01em"
      />
    </AbsoluteFill>
  );
};
