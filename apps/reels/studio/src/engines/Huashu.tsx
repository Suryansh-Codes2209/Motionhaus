import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Drives the vendored huashu-art-motion engine (packages/art-engine, MIT) inside
// an iframe, one frame at a time. Its contract: boot sets window.__ready (or
// __bootFailed); for any time t, `await prepare(t); renderFrame(t)` draws that
// exact frame onto window.__canvas. Deterministic, so Remotion can render any
// frame in any tab.
//
// Served from <public>/huashu/ (apps/reels/studio/scripts/sync-engine.sh, or
// the reels CLI links it into a reel's public dir).

type EngineWindow = Window & {
  __ready?: boolean;
  __bootFailed?: string;
  __total?: number;
  prepare: (t: number) => Promise<void>;
  renderFrame: (t: number) => void;
  renderSolo: (id: string, lt: number, opt?: {counter?: boolean}) => void;
  __canvas?: HTMLCanvasElement;
};

type Common = {
  /** seconds added to the sequence-local time (start mid-scene) */
  offset?: number;
  /** playback speed of the engine clock */
  rate?: number;
  /** cover crops to fill (landscape art in a 9:16 frame), contain letterboxes */
  fit?: 'cover' | 'contain';
  /** cover only: horizontal focus 0..1 (0.5 = centre) */
  focusX?: number;
};

export type HuashuProps = Common &
  (
    | {kind: 'style'; id: string; counter?: boolean} // one art style: 01–36 from the gallery film, 38–55 from style_studies
    | {kind: 'film'; film: string} // a whole film: 'gallery', 'style_studies', 'demos/long_scroll'
    | {kind: 'clip'; spec: string} // explainer clip from a spec json (path under public/); size comes from the spec
  );

const BOOT_TIMEOUT = 120000;

export const Huashu: React.FC<HuashuProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const ref = useRef<HTMLIFrameElement>(null);
  const [boot] = useState(() => delayRender('huashu engine boot', {timeoutInMilliseconds: BOOT_TIMEOUT}));
  const [ready, setReady] = useState(false);
  // the engine's canvas size, read after boot (art scenes are 1920x1080; clips use the spec's size)
  const [[cw, ch], setSize] = useState<[number, number]>([1920, 1080]);
  const src =
    props.kind === 'clip'
      ? `${staticFile('huashu/clip.html')}?render=1&spec=${encodeURIComponent(`../${props.spec}`)}`
      : `${staticFile('huashu/index.html')}?render=1&film=${encodeURIComponent(props.kind === 'film' ? props.film : parseInt(props.id, 10) >= 38 ? 'style_studies' : 'gallery')}`;

  const onLoad = useCallback(() => {
    const win = ref.current?.contentWindow as EngineWindow | null;
    if (!win) return cancelRender(new Error('huashu: iframe has no window'));
    const started = Date.now();
    const poll = () => {
      if (win.__bootFailed) return cancelRender(new Error(`huashu boot failed: ${win.__bootFailed}`));
      if (win.__ready) {
        if (win.__canvas) setSize([win.__canvas.width, win.__canvas.height]);
        setReady(true);
        continueRender(boot);
        return;
      }
      if (Date.now() - started > BOOT_TIMEOUT - 2000) return cancelRender(new Error('huashu: engine never became ready'));
      setTimeout(poll, 30);
    };
    poll();
  }, [boot]);

  const t = (props.offset ?? 0) + (frame / fps) * (props.rate ?? 1);
  useEffect(() => {
    if (!ready) return;
    const win = ref.current?.contentWindow as EngineWindow | null;
    if (!win) return;
    const h = delayRender(`huashu frame ${frame}`);
    (async () => {
      await win.prepare(t);
      if (props.kind === 'style') win.renderSolo(props.id, t, {counter: props.counter ?? false});
      else win.renderFrame(t);
      continueRender(h);
    })().catch((e) => cancelRender(e));
  }, [ready, t, frame, props]);

  const cover = (props.fit ?? 'cover') === 'cover';
  const scale = cover ? Math.max(W / cw, H / ch) : Math.min(W / cw, H / ch);
  const x = cover ? (W - cw * scale) * (props.focusX ?? 0.5) : (W - cw * scale) / 2;
  const y = (H - ch * scale) / 2;

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <iframe
        ref={ref}
        src={src}
        onLoad={onLoad}
        style={{position: 'absolute', border: 0, width: cw, height: ch, transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(${scale})`}}
      />
    </AbsoluteFill>
  );
};
