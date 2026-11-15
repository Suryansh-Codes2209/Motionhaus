import React from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SPLIT} from '../components/SplitPanel';
import {alpha} from '../lib/util';
import {Mascot, mouthAt, type Gesture} from '../longform/Mascot';
import {episode} from '../video.config';
import {faceWindows, type VoiceClip} from './timing';

// headshot: the speaker under the graphics panel. With a recorded take
// (props.face) each scene plays its own stretch of the footage in sync with
// its VO, as jump cuts with an alternating punch-in, and holds a frame between
// scenes. Without one, Rado talks the VO instead.
const RADIUS = 56;

export const Headshot: React.FC<{clips: VoiceClip[]; until: number}> = ({clips, until}) => {
  const {width, height} = useVideoConfig();
  const top = Math.round(height * SPLIT) - RADIUS;
  return (
    <div style={{position: 'absolute', left: 0, top, width, height: height - top, borderRadius: `${RADIUS}px ${RADIUS}px 0 0`, overflow: 'hidden', boxShadow: '0 -18px 50px rgba(0,0,0,0.18)'}}>
      {episode.face ? <Footage clips={clips} until={until} src={episode.face.src} /> : episode.series.mascot === false ? null : <Rado clips={clips} />}
    </div>
  );
};

const Footage: React.FC<{clips: VoiceClip[]; until: number; src: string}> = ({clips, until, src}) => {
  const {fps} = useVideoConfig();
  const focusY = episode.face?.focusY ?? 0.3;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {faceWindows(clips, until).map((w, i) => {
        const start = episode.voice[clips[i].scene]?.face?.startSec ?? 0;
        return (
          <Sequence key={i} from={w.from} durationInFrames={w.len}>
            <Take start={Math.round(start * fps)} lead={w.lead} play={w.play} punch={i % 2 === 1} focusY={focusY} src={src} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// One take: holds its first frame until the VO starts (lead), plays for the
// VO's length, then holds its last frame.
const Take: React.FC<{start: number; lead: number; play: number; punch: boolean; focusY: number; src: string}> = ({start, lead, play, punch, focusY, src}) => {
  const frame = useCurrentFrame();
  const video = (
    <OffthreadVideo
      src={staticFile(src)}
      muted
      startFrom={start}
      style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${focusY * 100}%`, transform: `scale(${punch ? 1.12 : 1})`, transformOrigin: `50% ${focusY * 100}%`}}
    />
  );
  // inside the Sequence the video's own frame = frame - lead
  if (frame < lead) return <Freeze frame={0}>{video}</Freeze>;
  if (frame >= lead + play) return <Freeze frame={Math.max(0, play - 1)}>{video}</Freeze>;
  return <Sequence from={lead} layout="none">{video}</Sequence>;
};

const GESTURES: Gesture[] = ['wave', 'point', 'think', 'point', 'cheer'];

const Rado: React.FC<{clips: VoiceClip[]}> = ({clips}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {colors} = episode.series;
  const words = clips.flatMap((c) => c.words.map((w) => ({from: c.from + Math.round((w.startMs / 1000) * fps), to: c.from + Math.round((w.endMs / 1000) * fps)})));
  const scene = [...clips].reverse().find((c) => frame >= c.from)?.scene ?? 0;
  const t = frame / fps;
  const size = width * 0.62;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 60% at 50% 70%, ${alpha(colors.accent, 0.5)}, ${colors.fg} 75%)`}}>
      <div style={{position: 'absolute', left: (width - size) / 2, bottom: -size * 0.42, width: size, height: size * 1.55, transform: `translateY(${Math.sin(t * 2.4) * 10}px)`, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.35))'}}>
        <Mascot gesture={GESTURES[scene % GESTURES.length]} talk={mouthAt(frame, words, fps)} look={0} t={t} seed={scene} />
      </div>
    </AbsoluteFill>
  );
};
