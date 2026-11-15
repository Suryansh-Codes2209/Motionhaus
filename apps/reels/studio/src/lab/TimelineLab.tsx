import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {stagger} from 'animejs';
import {useAnimeTimeline, useGsapTimeline} from '../engines/timelines';
import {family} from '../fonts';

const ink = '#0B0B0F';
const accent = '#FFE14D';
const hot = '#FF3B5C';

// GSAP title: letters drop in on a stagger with back.out, an underline wipes,
// the subtitle slides up, then the whole card punches out.
export type GsapTitleProps = {title: string; subtitle: string};
export const GsapTitle: React.FC<GsapTitleProps> = ({title, subtitle}) => {
  const ref = useGsapTimeline((tl) => {
    tl.from('.ch', {yPercent: 120, rotate: (i: number) => random(`ch${i}`) * 50 - 25, opacity: 0, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.04})
      .from('.bar', {scaleX: 0, transformOrigin: 'left center', duration: 0.5, ease: 'expo.out'}, '-=0.25')
      .from('.sub', {y: 60, opacity: 0, duration: 0.5, ease: 'power3.out'}, '-=0.3')
      .to('.card', {scale: 1.08, duration: 0.15, ease: 'power2.out'}, '+=1.2')
      .to('.card', {scale: 0, rotate: -8, opacity: 0, duration: 0.35, ease: 'back.in(2)'});
  });
  return (
    <AbsoluteFill ref={ref} style={{background: ink, alignItems: 'center', justifyContent: 'center', fontFamily: family('Montserrat')}}>
      <div className="card" style={{textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '20px 0'}}>
          {[...title].map((c, i) => (
            <span key={i} className="ch" style={{display: 'inline-block', fontSize: 128, fontWeight: 900, color: i % 3 === 0 ? accent : '#fff', whiteSpace: 'pre'}}>
              {c}
            </span>
          ))}
        </div>
        <div className="bar" style={{height: 14, background: hot, borderRadius: 7, margin: '0 60px'}} />
        <div className="sub" style={{marginTop: 34, fontSize: 54, fontWeight: 800, color: '#fff', opacity: 0.85}}>
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
// Anime.js grid: a 9x16 grid of tiles ripples out from the centre with a
// staggered scale + rotate wave, then the label pops.
export type AnimeGridProps = {label: string};
export const AnimeGrid: React.FC<AnimeGridProps> = ({label}) => {
  const cols = 9, rows = 16;
  const ref = useAnimeTimeline((tl, root) => {
    const tiles = root.querySelectorAll('.tile');
    tl.add(tiles, {scale: [{to: 0.2, ease: 'outSine', duration: 500}, {to: 1, ease: 'inOutQuad', duration: 900}], rotate: [0, 180], backgroundColor: [accent, hot], delay: stagger(60, {grid: [cols, rows], from: 'center'})}, 0)
      .add(root.querySelector('.label')!, {scale: [0, 1], opacity: [0, 1], duration: 700, ease: 'outElastic(1, .6)'}, 1400);
  });
  return (
    <AbsoluteFill ref={ref} style={{background: ink, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 100px)`, gap: 16}}>
        {Array.from({length: cols * rows}, (_, i) => (
          <div key={i} className="tile" style={{width: 100, height: 100, borderRadius: 18, background: accent}} />
        ))}
      </div>
      <div className="label" style={{position: 'absolute', fontFamily: family('Anton'), fontSize: 180, color: '#fff', WebkitTextStroke: `16px ${ink}`, paintOrder: 'stroke fill'}}>
        {label}
      </div>
    </AbsoluteFill>
  );
};
