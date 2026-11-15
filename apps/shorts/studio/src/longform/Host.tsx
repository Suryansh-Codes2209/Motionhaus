import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Timeline} from '../timeline';
import {episode} from '../video.config';
import {type Gesture, hostMotion, Mascot, mouthAt} from './Mascot';

// The explainer host comes and goes: Rado pops up only in scenes whose script
// sets `host`, talks over that scene's VO (mouth from the word timings),
// gestures toward the content, and sinks away before the next cut.
export type HostCue = {side?: 'left' | 'right'; gesture?: Gesture};

const W = 380; // on-screen width of the mascot (1920×1080 frame)

const HostIn: React.FC<{cue: HostCue; scene: number; duration: number}> = ({cue, scene, duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const side = cue.side ?? 'right';
  const toward: 1 | -1 = side === 'left' ? 1 : -1; // the content is toward the centre
  const words = (episode.voice[scene]?.words ?? []).map((w) => ({from: Math.round((w.startMs / 1000) * fps), to: Math.round((w.endMs / 1000) * fps)}));
  const talk = mouthAt(frame, words, fps);
  const m = hostMotion(frame, duration, fps);
  const t = frame / fps;
  const bob = Math.sin(t * 2.6) * 10;
  const lean = toward * (2 + talk * 3) + Math.sin(t * 1.3) * 2;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          bottom: -190, // peeks up from the corner: head and arms in frame, flame below
          [side]: 36,
          width: W,
          height: W * 1.55,
          opacity: m.opacity,
          transform: `translateY(${m.y + bob}px) rotate(${m.rot * -toward + lean}deg)`,
          transformOrigin: '50% 85%',
          filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))',
        }}
      >
        <Mascot gesture={cue.gesture ?? 'idle'} talk={talk} look={toward} t={t} pointSide={toward} seed={scene} />
      </div>
    </AbsoluteFill>
  );
};

/** One Sequence per hosted scene: from when its content enters until just before the transition out. */
export const Host: React.FC<{tl: Timeline}> = ({tl}) => (
  <>
    {tl.items.map((it) => {
      const cue = (it.scene as {host?: HostCue}).host;
      if (!cue) return null;
      const from = it.from + it.enter;
      const duration = Math.max(20, it.duration - it.enter - tl.T);
      return (
        <Sequence key={it.index} from={from} durationInFrames={duration}>
          <HostIn cue={cue} scene={it.index} duration={duration} />
        </Sequence>
      );
    })}
  </>
);
