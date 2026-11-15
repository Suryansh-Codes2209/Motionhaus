import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Huashu} from '../engines/Huashu';
import {useScene} from '../lib/SceneContext';
import type {SceneOf} from '../types';

// An explainer clip from the huashu art engine: one JSON spec in one of its
// grammars (whiteboard, kinetic type, keynote cards, finance chart, Vox
// collage, Kurzgesagt, 3Blue1Brown). The spec's clock starts when the scene's
// content would enter, so the first cue lands after the transition.
export const Clip: React.FC<{scene: SceneOf<'clip'>}> = ({scene}) => {
  const {fps} = useVideoConfig();
  const {enter, fpb} = useScene();
  return (
    <AbsoluteFill>
      <Huashu kind="clip" spec={scene.spec} fit="contain" offset={-(enter + fpb * 0.2) / fps} />
    </AbsoluteFill>
  );
};
