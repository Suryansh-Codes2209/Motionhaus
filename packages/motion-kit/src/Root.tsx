import React from 'react';
import {Composition} from 'remotion';
import {LaunchVideo} from './LaunchVideo';
import {getTimeline} from './timeline';
import type {Format} from './types';
import {config} from './video.config';

const DIMENSIONS: Record<Format, [number, number]> = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
};

export const RemotionRoot: React.FC = () => {
  const [width, height] = DIMENSIONS[config.format];
  return (
    <Composition
      id="LaunchVideo"
      component={LaunchVideo}
      durationInFrames={getTimeline(config).total}
      fps={config.fps}
      width={width}
      height={height}
    />
  );
};
