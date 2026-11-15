import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Sfx} from '../../audio/Sfx';
import {useScene} from '../../lib/SceneContext';
import {alpha, clamp} from '../../lib/util';

// Real photos cutting on the beat, the way documentary B-roll is cut: a hard
// cut every `every` beats, a one-frame white flash and a camera-shutter sound
// on each cut, and every shot pushing in (or pulling out, alternating) so the
// picture never sits still. Used by the `photo` scene's montage mode and by
// any scene's `broll` backdrop.
export const PhotoMontage: React.FC<{
  images: string[];
  every?: number; // beats per photo
  from?: number; // frame of the first photo (default 0)
  sound?: number; // shutter volume (0 = silent)
  filter?: string;
}> = ({images, every = 1, from = 0, sound = 0.5, filter = 'saturate(1.15) contrast(1.08)'}) => {
  const frame = useCurrentFrame();
  const {fpb, duration, index} = useScene();
  const len = Math.max(4, Math.round(fpb * every));
  const cuts: number[] = [];
  for (let at = from; at < duration; at += len) cuts.push(at);
  const shot = Math.max(0, Math.min(cuts.length - 1, Math.floor((frame - from) / len)));
  const start = cuts[shot] ?? 0;
  const src = images[shot % images.length];
  const t = interpolate(frame, [start, start + len], [0, 1], clamp);
  const zoomIn = (shot + index) % 2 === 0;
  const scale = zoomIn ? 1.04 + 0.1 * t : 1.14 - 0.1 * t;
  // each shot drifts a little toward a different corner
  const dx = ((shot * 37) % 7) - 3;
  const dy = ((shot * 53) % 5) - 2;
  const flash = interpolate(frame - start, [0, 2], [0.55, 0], clamp);
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${scale}) translate(${dx * t}%, ${dy * t}%)`}}>
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: alpha('#ffffff', frame >= from ? flash : 0)}} />
      {sound > 0 ? cuts.map((c, i) => <Sfx key={c} name="shutter" at={c} i={i} volume={sound} />) : null}
    </AbsoluteFill>
  );
};

// Any scene's `broll`: the montage behind the scene's own content, washed in
// the palette's background so the scene's type stays readable. Light
// palettes get a pale newsprint wash over a mono print; dark ones a dark scrim.
export const BRoll: React.FC<{images: string[]; bg: string; dark: boolean}> = ({images, bg, dark}) => (
  <AbsoluteFill>
    <PhotoMontage images={images} every={1.5} sound={0.3} filter={dark ? 'saturate(1.1) contrast(1.05)' : 'grayscale(1) contrast(1.15)'} />
    <AbsoluteFill style={{background: alpha(bg, dark ? 0.62 : 0.8)}} />
  </AbsoluteFill>
);
