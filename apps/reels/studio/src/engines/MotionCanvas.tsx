import {Logger, Renderer, ValueDispatcher, Vector2, type FullSceneDescription, type Project, type SceneDescription} from '@motion-canvas/core';
import React, {useEffect, useMemo, useRef} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';

// Motion Canvas scenes (generator-based: `yield* node.x(300, 1)`) rendered
// inside Remotion. Motion Canvas's own Renderer.renderFrame(settings, t)
// resets the playback, seeks to t and draws one frame to a canvas; we copy
// that canvas. No Vite plugin needed: we fill in what it would (scene name,
// onReplaced) and pin the random seed so every render tab agrees.
//
// Scenes use the imperative API (new Txt({...}), view.add(...)) because this
// project's JSX is React's. Seeking replays from 0, so keep scenes short.

export type McScene = SceneDescription<any>;

function toProject(name: string, scenes: McScene[], seed: number): Project {
  const full = scenes.map((s, i) => {
    const d = {...s, name: `${name}-${i}`} as FullSceneDescription<any>;
    d.onReplaced = new ValueDispatcher(d);
    (d.meta as any).seed.set(seed + i);
    return d;
  });
  return {name, scenes: full, logger: new Logger(), plugins: [], experimentalFeatures: false} as unknown as Project;
}

export const MotionCanvas: React.FC<{name: string; scenes: () => McScene[]; seed?: number; background?: string}> = ({name, scenes, seed = 1, background}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => {
    const project = toProject(name, scenes(), seed);
    project.logger.onLogged.subscribe((p: any) => {
      if (p.level === 'error') cancelRender(new Error(`motion-canvas: ${p.message}${p.stack ? `\n${p.stack}` : ''}`));
    });
    return new Renderer(project);
    // scenes() builds fresh descriptions; rebuild only if the name/seed change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, seed]);

  useEffect(() => {
    const h = delayRender(`motion-canvas ${name} frame ${frame}`);
    (async () => {
      await renderer.renderFrame(
        {name, fps, size: new Vector2(width, height), resolutionScale: 1, colorSpace: 'srgb', background: background ?? null, range: [0, Infinity], exporter: {name: '@motion-canvas/core/image-sequence', options: {}}} as any,
        frame / fps,
      );
      const g = canvas.current?.getContext('2d');
      if (g) {
        g.clearRect(0, 0, width, height);
        g.drawImage(renderer.stage.finalBuffer, 0, 0, width, height);
      }
      continueRender(h);
    })().catch((e) => cancelRender(e));
  }, [renderer, frame, fps, width, height, name, background]);

  return <canvas ref={canvas} width={width} height={height} style={{width, height}} />;
};
