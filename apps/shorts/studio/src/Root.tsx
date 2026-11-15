import React from 'react';
import {Composition, Still} from 'remotion';
import {Long} from './longform/Long';
import {Thumbnail} from './longform/Thumbnail';
import {longDuration} from './longform/timing';
import {Short} from './shorts/Short';
import {shortDuration} from './shorts/timing';
import {getTimeline} from './timeline';
import {config, episode} from './video.config';

// "Short" renders 9:16 episodes, "Long" 16:9 deep dives (props with
// config.format "16:9"), "Thumbnail-N" the long-form thumbnail variants.
export const RemotionRoot: React.FC = () => {
  const total = getTimeline(config).total;
  const variants = Math.max(1, episode.thumbnail?.variants.length ?? 0);
  return (
    <>
      <Composition id="Short" component={Short} durationInFrames={shortDuration(total, episode, config.fps)} fps={config.fps} width={1080} height={1920} />
      <Composition id="Long" component={Long} durationInFrames={longDuration(total, episode, config.fps)} fps={config.fps} width={1920} height={1080} />
      {Array.from({length: variants}, (_, i) => (
        <Still key={i} id={`Thumbnail-${i + 1}`} component={Thumbnail} defaultProps={{variant: i}} width={1280} height={720} />
      ))}
    </>
  );
};
