import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sfx} from '../audio/Sfx';
import {tokenize} from '../components/KineticText';
import {bodyFamily, monoFamily} from '../fonts';
import {useScene} from '../lib/SceneContext';
import {alpha, clamp, isDark, useUnit} from '../lib/util';
import type {SceneOf} from '../types';
import {accentFill} from '../styles';
import {config} from '../video.config';

type Post = {author: string; text: string};

// A real forum comment (HN, Reddit, GitHub issue) as a card: avatar, handle,
// source and date, then the text typing in word by word. An optional reply
// slides in underneath, indented, for a back-and-forth.
export const Comment: React.FC<{scene: SceneOf<'comment'>}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const {enter, fpb} = useScene();
  const u = useUnit();
  const {colors} = config.brand;
  const dark = isDark(colors.bg);
  const cardW = Math.min(width * 0.88, 1500 * u);

  const firstWords = tokenize(scene.text).length;
  const replyAt = enter + firstWords * 2 + fpb * 1.5;

  const card = (post: Post, at: number, reply: boolean) => {
    const s = spring({frame: frame - at, fps, config: {damping: 16}});
    const words = tokenize(post.text);
    const typeAt = at + 6;
    return (
      <div
        style={{
          width: reply ? cardW * 0.9 : cardW,
          alignSelf: reply ? 'flex-end' : 'center',
          padding: `${34 * u}px ${40 * u}px`,
          borderRadius: 28 * u,
          background: dark ? alpha(colors.fg, 0.06) : alpha('#ffffff', 0.85),
          border: `${2 * u}px solid ${alpha(colors.fg, 0.1)}`,
          borderLeft: reply ? `${6 * u}px solid ${colors.accent}` : undefined,
          boxShadow: `0 ${24 * u}px ${60 * u}px ${alpha('#000000', dark ? 0.45 : 0.12)}`,
          opacity: s,
          transform: `translateY(${(1 - s) * 50 * u}px) scale(${0.96 + 0.04 * s})`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 20 * u, marginBottom: 22 * u}}>
          <div
            style={{
              width: 64 * u,
              height: 64 * u,
              borderRadius: '50%',
              background: accentFill(135),
              color: colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: bodyFamily,
              fontWeight: 800,
              fontSize: 32 * u,
            }}
          >
            {post.author.slice(0, 1).toUpperCase()}
          </div>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <span style={{fontFamily: bodyFamily, fontWeight: 700, fontSize: 34 * u, color: colors.fg}}>{post.author}</span>
            <span style={{fontFamily: monoFamily, fontSize: 24 * u, color: colors.muted}}>
              {scene.source}
              {scene.date ? ` · ${scene.date}` : ''}
              {reply ? ' · reply' : ''}
            </span>
          </div>
        </div>
        <div style={{fontFamily: bodyFamily, fontSize: (reply ? 40 : 44) * u, lineHeight: 1.35, fontWeight: 500, color: colors.fg}}>
          {words.map((w, i) => {
            const o = interpolate(frame, [typeAt + i * 2, typeAt + i * 2 + 4], [0, 1], clamp);
            return (
              <span key={i} style={{opacity: o, color: w.em ? colors.accent : undefined, fontWeight: w.em ? 700 : undefined}}>
                {w.word}{' '}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 28 * u, padding: `0 ${(width - cardW) / 2}px`}}>
      <Sfx name="pop" at={enter} i={0} volume={0.5} />
      {scene.reply ? <Sfx name="pop" at={replyAt} i={1} volume={0.45} /> : null}
      <div style={{width: cardW, display: 'flex', flexDirection: 'column', gap: 28 * u}}>
        {card({author: scene.author, text: scene.text}, enter, false)}
        {scene.reply ? card(scene.reply, replyAt, true) : null}
      </div>
    </AbsoluteFill>
  );
};
