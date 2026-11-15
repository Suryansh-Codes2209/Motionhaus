import React from 'react';
import {Audio, interpolate, staticFile, useVideoConfig} from 'remotion';
import {clamp} from '../lib/util';
import type {Timeline} from '../timeline';
import {config} from '../video.config';
import {Sfx, type SfxName} from './Sfx';
import {kitOf, WHOOSH_LAG_FRAMES} from './sfxKit';

const WHOOSHES: SfxName[] = ['whoosh-1', 'whoosh-2', 'whoosh-3'];
const TRANSITION_SFX: Record<string, SfxName> = {glitch: 'glitch', rgbSplit: 'glitch', filmBurn: 'fire', iris: 'shutter', diamond: 'shutter', flash: 'shutter', lightSweep: 'riser', maskText: 'riser', maskInk: 'whoosh-2', maskBrush: 'whoosh-3'};

// Global audio: music bed with fades, a whoosh on every transition and a
// four-beat riser that lands exactly on each logo reveal. With a real kit
// (config.sfxKit) Sfx aligns by measured peak: whoosh peaks land
// WHOOSH_LAG_FRAMES after the cut and the riser's peak on the reveal; the
// synthesized fallback keeps the old lead-ins.
export const SoundTrack: React.FC<{tl: Timeline}> = ({tl}) => {
  const {fps} = useVideoConfig();
  const v = config.musicVolume;
  const kit = kitOf(config);

  return (
    <>
      {config.music ? (
        <Audio
          src={staticFile(config.music)}
          volume={(f) =>
            interpolate(f, [0, fps * 0.4, tl.total - fps * 1.5, tl.total], [0, v, v, 0], clamp)
          }
        />
      ) : null}
      {tl.items.slice(1).map((it) =>
        it.scene.transition === 'none' ? null : (
          // each transition gets the sound of its picture: a glitch cut
          // crackles, a film burn ignites, an iris clicks like a shutter
          TRANSITION_SFX[it.scene.transition ?? ''] ? (
            <Sfx key={`w${it.index}`} name={TRANSITION_SFX[it.scene.transition ?? '']} i={it.index} at={it.from} volume={0.7} />
          ) : (
            <Sfx
              key={`w${it.index}`}
              name={WHOOSHES[it.index % WHOOSHES.length]}
              i={kit ? it.index : undefined}
              at={kit ? it.from + WHOOSH_LAG_FRAMES : Math.max(0, it.from - fps * 0.12)}
              volume={0.6}
            />
          )
        ),
      )}
      {tl.items
        .filter((it) => it.scene.type === 'logo')
        .map((it, n) => (
          <Sfx
            key={`r${it.index}`}
            name="riser"
            i={n}
            at={kit ? it.from + it.enter : Math.max(0, it.from + it.enter - Math.round(tl.fpb * 4))}
            volume={0.55}
          />
        ))}
    </>
  );
};
