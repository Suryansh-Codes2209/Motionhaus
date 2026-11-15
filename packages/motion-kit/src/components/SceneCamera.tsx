import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useScene} from '../lib/SceneContext';
import {clamp} from '../lib/util';
import type {Scene} from '../types';

// A per-scene camera for long-form (look.sceneCamera): once the content is
// on screen it glides from one area of interest to the next (left card →
// right card, node → node down a flow), then eases back to the full view.
// Every scene also gets a slow push, so no scene sits frozen, and the camera
// works in 3D: it arrives at a slight angle (alternating sides scene to
// scene) and yaws toward each area it glides to.
//
// A target is a point in the frame (0..1) and a zoom. The point is pulled
// part of the way to the centre (PAN), so edges never swing out of frame.
// Wide layouts (versus, steps, features) fill ~90% of the width: keep their
// zoom ≤ 1.08 and targets within 0.1 of the centre, or the outer cards crop.

type Target = {x: number; y: number; z: number};

const PAN = 0.55;
const WIDE: Target = {x: 0.5, y: 0.5, z: 1};

// Areas of interest per scene type, in reading order. Statement scenes
// (hook, stat, cta) get one punch-in on their text. Scenes with their own
// camera (screenshot, spotlight, clipping, photo) only push.
const PATHS: Partial<Record<Scene['type'], Target[]>> = {
  versus: [{x: 0.4, y: 0.54, z: 1.07}, {x: 0.6, y: 0.54, z: 1.07}, {x: 0.5, y: 0.5, z: 1.01}],
  flow: [{x: 0.48, y: 0.42, z: 1.06}, {x: 0.52, y: 0.52, z: 1.06}, {x: 0.5, y: 0.62, z: 1.06}, {x: 0.5, y: 0.5, z: 1.01}],
  features: [{x: 0.4, y: 0.54, z: 1.07}, {x: 0.6, y: 0.54, z: 1.07}, {x: 0.5, y: 0.5, z: 1.01}],
  steps: [{x: 0.4, y: 0.55, z: 1.07}, {x: 0.6, y: 0.55, z: 1.07}, {x: 0.5, y: 0.5, z: 1.01}],
  bento: [{x: 0.4, y: 0.54, z: 1.07}, {x: 0.6, y: 0.52, z: 1.07}, {x: 0.5, y: 0.5, z: 1.01}],
  code: [{x: 0.48, y: 0.46, z: 1.1}, {x: 0.5, y: 0.58, z: 1.14}],
  log: [{x: 0.47, y: 0.46, z: 1.08}, {x: 0.5, y: 0.58, z: 1.12}],
  chat: [{x: 0.53, y: 0.46, z: 1.08}, {x: 0.47, y: 0.58, z: 1.1}],
  comment: [{x: 0.47, y: 0.46, z: 1.08}, {x: 0.53, y: 0.62, z: 1.08}],
  quote: [{x: 0.5, y: 0.5, z: 1.1}],
  chart: [{x: 0.44, y: 0.54, z: 1.08}, {x: 0.6, y: 0.5, z: 1.1}],
  document: [{x: 0.5, y: 0.46, z: 1.08}],
  hook: [{x: 0.5, y: 0.5, z: 1.12}],
  type: [{x: 0.5, y: 0.5, z: 1.12}],
  stat: [{x: 0.5, y: 0.48, z: 1.14}],
  cta: [{x: 0.5, y: 0.47, z: 1.1}],
};

const MOVE_EVERY_SEC = 3.2; // at most one move per this many seconds

/** Targets with their start frames, spread over the scene after its content lands. */
export function cameraMoves(type: Scene['type'], duration: number, enter: number, fpb: number, fps: number) {
  const path = PATHS[type] ?? [];
  const first = enter + fpb * 2;
  const last = duration - fpb * 2; // settled before the transition out
  if (!path.length || last <= first) return [];
  const fit = Math.max(1, Math.min(path.length, Math.floor((last - first) / (MOVE_EVERY_SEC * fps)) + 1));
  // Too short for the whole path: keep the first targets, but always end wide.
  const chosen = fit < path.length ? [...path.slice(0, fit - 1), path[path.length - 1]] : path;
  const step = chosen.length > 1 ? (last - first) / (chosen.length - 1) : 0;
  return chosen.map((t, i) => ({...t, at: Math.round(first + i * step)}));
}

export const SceneCamera: React.FC<{scene: Scene; children: React.ReactNode}> = ({scene, children}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {enter, duration, fpb, index} = useScene();

  let cur = WIDE;
  for (const m of cameraMoves(scene.type, duration, enter, fpb, fps)) {
    const p = spring({frame: frame - m.at, fps, config: {damping: 22, stiffness: 70, mass: 0.9}});
    cur = {x: cur.x + (m.x - cur.x) * p, y: cur.y + (m.y - cur.y) * p, z: cur.z + (m.z - cur.z) * p};
  }
  const push = interpolate(frame, [0, duration], [1, 1.035], clamp);
  const z = cur.z * push;
  const tx = -(cur.x - 0.5) * width * z * PAN;
  const ty = -(cur.y - 0.5) * height * z * PAN;
  // Arrival angle: the camera swings in from one side and settles square.
  const side = index % 2 === 0 ? 1 : -1;
  const arrive = spring({frame: frame - enter, fps, config: {damping: 24, stiffness: 50, mass: 1}});
  // Looking at a target off-centre turns the camera toward it.
  const yaw = side * (1 - arrive) * 9 + (cur.x - 0.5) * -14;
  const pitch = (1 - arrive) * 4 + (cur.y - 0.5) * 8;

  return (
    <AbsoluteFill style={{perspective: 1800, perspectiveOrigin: '50% 50%'}}>
      <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${z}) rotateY(${yaw}deg) rotateX(${pitch}deg)`, transformStyle: 'preserve-3d'}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
