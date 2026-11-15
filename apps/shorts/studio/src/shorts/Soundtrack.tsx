import React from 'react';
import {Audio, interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import {clamp} from '../lib/util';
import {episode} from '../video.config';
import {duckGain, type VoiceClip} from './timing';

// Voiceover clips, the outro line and the music bed, ducked under the VO.
// Shared by the Short (9:16) and Long (16:9) compositions.
export const Soundtrack: React.FC<{clips: VoiceClip[]; outroFrom: number}> = ({clips, outroFrom}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const oVoice = episode.outro.voice;
  const allVo = oVoice ? [...clips, {from: outroFrom, frames: Math.ceil(oVoice.durationSec * fps)}] : clips;
  const music = episode.music;
  return (
    <>
      {clips.map((c) => (
        <Sequence key={c.scene} from={c.from} layout="none">
          <Audio src={staticFile(episode.voice[c.scene]!.src)} />
        </Sequence>
      ))}
      {oVoice ? (
        <Sequence from={outroFrom} layout="none">
          <Audio src={staticFile(oVoice.src)} />
        </Sequence>
      ) : null}
      {music ? (
        <Audio
          src={staticFile(music.src)}
          volume={(f) =>
            music.volume *
            interpolate(f, [0, fps * 0.3, durationInFrames - fps * 1.2, durationInFrames], [0, 1, 1, 0], clamp) *
            duckGain(f, allVo, music.duck, Math.round(fps * 0.2))
          }
        />
      ) : null}
    </>
  );
};
