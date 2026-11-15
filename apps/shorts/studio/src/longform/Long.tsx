import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {LaunchVideo} from '../LaunchVideo';
import {getTimeline} from '../timeline';
import {config, episode} from '../video.config';
import {SeriesBug} from '../shorts/SeriesBug';
import {Soundtrack} from '../shorts/Soundtrack';
import {voiceClips} from '../shorts/timing';
import {Backdrop} from './Backdrop';
import {ChapterChip} from './ChapterChip';
import {EndCard} from './EndCard';
import {Host} from './Host';
import {CHAPTER_CARD_SEC, chapterStarts, endCardFrames, endCardStart} from './timing';

// The 16:9 deep dive: the same LaunchReel film and Radar layers as the
// Short, minus burned-in captions (the .srt is uploaded instead), plus
// chapter chips and an end card that leaves room for end-screen elements.
// The background changes per chapter (Backdrop) and Rado, the mascot, pops
// in to explain in the scenes that ask for a host.
export const Long: React.FC = () => {
  const {fps} = useVideoConfig();
  const tl = getTimeline(config);
  const clips = voiceClips(tl, episode.voice, fps);
  const eFrom = endCardStart(tl.total);
  const chapters = chapterStarts(tl, episode.chapters);
  const chip = Math.round(CHAPTER_CARD_SEC * fps);

  return (
    <AbsoluteFill style={{backgroundColor: config.brand.colors.bg}}>
      <Backdrop tl={tl} total={tl.total} />
      <Sequence durationInFrames={tl.total}>
        <LaunchVideo />
      </Sequence>
      {episode.series.mascot === false ? null : <Host tl={tl} />}
      <Sequence durationInFrames={eFrom}>
        <SeriesBug at={{top: 40, left: 44, scale: 0.72}} />
      </Sequence>
      {chapters.map((c, i) =>
        c.from === 0 ? null : (
          <Sequence key={c.scene} from={c.from} durationInFrames={chip}>
            <ChapterChip n={i + 1} title={c.title} duration={chip} />
          </Sequence>
        ),
      )}
      <Sequence from={eFrom} durationInFrames={endCardFrames(episode, fps)}>
        <EndCard />
      </Sequence>
      <Soundtrack clips={clips} outroFrom={eFrom + 6} />
    </AbsoluteFill>
  );
};
