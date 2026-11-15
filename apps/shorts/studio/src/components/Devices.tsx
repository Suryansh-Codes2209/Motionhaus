import React from 'react';
import {Img, staticFile} from 'remotion';
import {bodyFamily} from '../fonts';
import {alpha, useUnit} from '../lib/util';
import {config} from '../video.config';

type ScreenProps = {
  src: string;
  height: number; // visible screen height in px
  scroll?: boolean;
  progress: number; // 0..1 over the scene
};

// Scroll mode pans a tall capture top→bottom; otherwise a slow Ken Burns zoom.
const Screen: React.FC<ScreenProps> = ({src, height, scroll, progress}) => (
  <div style={{position: 'relative', height, overflow: 'hidden', background: '#fff'}}>
    <Img
      src={staticFile(src)}
      style={
        scroll
          ? {
              width: '100%',
              display: 'block',
              transform: `translateY(calc(${-progress} * (100% - ${height}px)))`,
            }
          : {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
              transform: `scale(${1 + progress * 0.08})`,
              transformOrigin: '50% 20%',
            }
      }
    />
  </div>
);

export const BrowserFrame: React.FC<ScreenProps & {width: number; url: string}> = ({
  width,
  url,
  height,
  ...screen
}) => {
  const u = useUnit();
  const bar = 46 * u;
  return (
    <div
      style={{
        width,
        borderRadius: 18 * u,
        overflow: 'hidden',
        background: '#16161c',
        boxShadow: `0 ${50 * u}px ${140 * u}px rgba(0,0,0,0.5), 0 0 0 ${1.5 * u}px ${alpha(config.brand.colors.fg, 0.14)}`,
      }}
    >
      <div
        style={{
          height: bar,
          display: 'flex',
          alignItems: 'center',
          gap: 9 * u,
          padding: `0 ${18 * u}px`,
          background: '#1d1d24',
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{width: 13 * u, height: 13 * u, borderRadius: '50%', background: c}} />
        ))}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              minWidth: '38%',
              padding: `${6 * u}px ${18 * u}px`,
              borderRadius: 8 * u,
              background: '#2a2a33',
              color: '#a9a9b6',
              fontFamily: bodyFamily,
              fontSize: 16 * u,
              textAlign: 'center',
            }}
          >
            {url}
          </div>
        </div>
      </div>
      <Screen height={height - bar} {...screen} />
    </div>
  );
};

export const PhoneFrame: React.FC<ScreenProps & {width: number}> = ({width, height, ...screen}) => {
  const bezel = width * 0.035;
  return (
    <div
      style={{
        width,
        height,
        padding: bezel,
        borderRadius: width * 0.16,
        background: '#0c0c10',
        boxShadow: `0 ${width * 0.08}px ${width * 0.25}px rgba(0,0,0,0.55), inset 0 0 0 ${width * 0.006}px #3a3a44`,
        position: 'relative',
      }}
    >
      <div style={{borderRadius: width * 0.13, overflow: 'hidden', height: '100%'}}>
        <Screen height={height - bezel * 2} {...screen} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: bezel + width * 0.03,
          left: '50%',
          transform: 'translateX(-50%)',
          width: width * 0.3,
          height: width * 0.085,
          borderRadius: width * 0.05,
          background: '#000',
        }}
      />
    </div>
  );
};
