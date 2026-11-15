import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Huashu} from '../engines/Huashu';
import {labelFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {config} from '../video.config';

// A painting cutaway from the huashu art engine (packages/art-engine): the
// same window-cat-table composition drawn in one of 35 art styles. Use it as
// a metaphor beat ("typing SQL by hand feels prehistoric" → cave painting),
// 2–4 s, never as decoration. The label types in bottom-left like a caption.
export const Art: React.FC<{scene: SceneOf<'art'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {enter} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const s = spring({frame: frame - enter - 6, fps, config: {damping: 16}});
  const chars = Math.round(interpolate(frame, [enter + 6, enter + 6 + (scene.label?.length ?? 0) * 1.2], [0, scene.label?.length ?? 0], clamp));

  return (
    <AbsoluteFill>
      <Huashu kind="style" id={scene.id} focusX={scene.focusX} offset={scene.offset ?? 2} />
      {scene.label ? (
        <div
          style={{
            position: 'absolute',
            left: 64 * u,
            bottom: 72 * u,
            padding: `${14 * u}px ${26 * u}px`,
            borderRadius: 10 * u,
            background: alpha('#000000', 0.62),
            color: '#ffffff',
            fontFamily: labelFamily,
            fontSize: 34 * u,
            letterSpacing: 1,
            opacity: s,
            transform: `translateY(${(1 - s) * 20 * u}px)`,
            borderLeft: `${6 * u}px solid ${colors.accent}`,
          }}
        >
          {scene.label.slice(0, chars)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
