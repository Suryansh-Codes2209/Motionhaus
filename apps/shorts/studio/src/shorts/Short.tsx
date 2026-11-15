import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {LaunchVideo} from '../LaunchVideo';
import {getTimeline} from '../timeline';
import {config, episode} from '../video.config';
import {SPLIT} from '../components/SplitPanel';
import {style} from '../styles';
import {Captions} from './Captions';
import {Headshot} from './Headshot';
import {Outro} from './Outro';
import {SeriesBug} from './SeriesBug';
import {Soundtrack} from './Soundtrack';
import {captionPages, outroFrames, outroStart, voiceClips} from './timing';

// The 9:16 short: the LaunchReel film for the product, wrapped in Launch
// Radar's layers: series badge, voiceover, captions, ducked music, outro.
export const Short: React.FC = () => {
  const {fps} = useVideoConfig();
  const tl = getTimeline(config);
  const clips = voiceClips(tl, episode.voice, fps);
  const oFrom = outroStart(tl.total);
  const preset = episode.captions?.preset ?? 'style';
  // slam shows one word at a time; the other presets keep the series' page size
  const pages = captionPages(clips, fps, preset === 'slam' ? 1 : (episode.captions?.wordsPerPage ?? 3));
  const {colors} = episode.series;
  const badgeFrom = style.layout === 'split' ? 0 : (tl.items[1]?.from ?? 0);

  return (
    <AbsoluteFill style={{backgroundColor: config.brand.colors.bg}}>
      <Sequence durationInFrames={tl.total}>
        <LaunchVideo />
      </Sequence>
      {style.layout === 'split' ? <Headshot clips={clips} until={oFrom} /> : null}
      {/* Frame 0 belongs to the product and the twist (2026-11-08 review): no
          dateline chip, and the series badge only comes in with scene 2. */}
      <Sequence durationInFrames={oFrom}>
        {episode.cover ? null : <Captions preset={preset} pages={pages} fg={colors.fg} accent={colors.accent} ink={colors.bg} top={style.layout === 'split' ? Math.round(1920 * SPLIT) + 40 : undefined} />}
      </Sequence>
      <Sequence from={badgeFrom} durationInFrames={Math.max(1, oFrom - badgeFrom)}>
        <SeriesBug />
      </Sequence>
      <Sequence from={oFrom} durationInFrames={outroFrames(episode, fps)}>
        <Outro />
      </Sequence>
      <Soundtrack clips={clips} outroFrom={oFrom + 6} />
    </AbsoluteFill>
  );
};
