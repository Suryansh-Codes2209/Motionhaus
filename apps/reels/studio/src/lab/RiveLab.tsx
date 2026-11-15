import {RemotionRiveCanvas} from '@remotion/rive';
import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';

// Rive (.riv state-machine animations made in the Rive editor), advanced by
// @remotion/rive to the current frame. Drop a .riv into public/rive/ and pass
// its name; `animation` picks a timeline by name or index (default: first).
// Sample: public/rive/rope.riv from rive-app/rive-android (MIT).
export type RiveClipProps = {file: string; animation?: string; fit: 'contain' | 'cover'};
export const RiveClip: React.FC<RiveClipProps> = ({file, animation, fit}) => (
  <AbsoluteFill style={{background: '#0B0B0F'}}>
    <RemotionRiveCanvas src={staticFile(`rive/${file}`)} fit={fit} animation={animation} />
  </AbsoluteFill>
);
