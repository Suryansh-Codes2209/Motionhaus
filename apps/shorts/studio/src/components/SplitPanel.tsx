import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {StyleBackground} from './StyleLayers';

// headshot layout: the top SPLIT of the frame is the graphics panel, the rest
// belongs to the speaker (drawn by the host composition: shorts/Headshot).
export const SPLIT = 0.53;
// Scenes are laid out for the full frame; the panel shows them at this scale,
// centred, which keeps roughly the middle 60% of the frame (19–81%) where content sits.
const SCALE = 0.85;

export const SplitPanel: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  const panel = height * SPLIT;
  return (
    <AbsoluteFill>
      <StyleBackground />
      <div style={{position: 'absolute', left: 0, top: 0, width, height: panel, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '50% 0', transform: `translateY(${panel / 2 - (height * SCALE) / 2}px) scale(${SCALE})`}}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
