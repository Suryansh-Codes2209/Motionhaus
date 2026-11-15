import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {config} from '../video.config';
import {kitOf, peakStart, variantFile} from './sfxKit';

export type SfxName =
  | 'whoosh-1' | 'whoosh-2' | 'whoosh-3' | 'impact' | 'riser' | 'pop' | 'tick'
  // event roles (real-recording kit v2; without a kit they fall back to the synth set)
  | 'glitch' | 'shutter' | 'stamp' | 'unlock' | 'fire' | 'static' | 'typing' | 'drop' | 'alarm' | 'error';

// One-shot sound effect at a frame relative to the enclosing Sequence/scene.
// `at` is the event frame. With a real-recording kit (config.sfxKit) the
// file's measured peak lands on it, and `i` (the hit's index in a run: item,
// line, word) rotates the role's takes so repeated hits never reuse one file
// back to back. Without a kit both are no-ops and the file starts at `at`.
export const Sfx: React.FC<{name: SfxName; at: number; i?: number; volume?: number}> = ({
  name,
  at,
  i,
  volume = 1,
}) => {
  const {fps} = useVideoConfig();
  if (!config.sfx) return null;
  const kit = kitOf(config);
  const file = variantFile(name, i, kit);
  return (
    <Sequence from={peakStart(at, file, kit, fps)} layout="none">
      <Audio src={staticFile(`audio/sfx/${file}.wav`)} volume={volume * config.sfxVolume} />
    </Sequence>
  );
};
