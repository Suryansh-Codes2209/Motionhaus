import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BrowserFrame} from '../components/Devices';
import {StyleBackground} from '../components/StyleLayers';
import {tokenize} from '../components/KineticText';
import {displayFamily, displayMaxWeight, labelFamily} from '../fonts';
import {alpha} from '../lib/util';
import {accentFill, style} from '../styles';
import {config, episode} from '../video.config';
import {seriesFamily} from '../shorts/fonts';
import {Padlock} from '../components/fx/padlock';
import {Mascot} from './Mascot';
import type {ThumbVariant} from '../shorts/types';

const FALLBACK: ThumbVariant = {headline: episode.config.brand.name, focus: 'screenshot'};

// 1280×720 YouTube thumbnail, one still per variant, in one of three layouts
// (product, photo, versus: see ThumbVariant). Every layout keeps the same
// rules: a 3–4 word headline that reads at 160px wide, one focal image, one
// accent mark, and the bottom-right corner empty for YouTube's duration badge.
export const Thumbnail: React.FC<{variant: number}> = ({variant}) => {
  const v = episode.thumbnail?.variants[variant] ?? FALLBACK;
  const layout = v.layout ?? 'product';
  return (
    <AbsoluteFill style={{backgroundColor: config.brand.colors.bg, overflow: 'hidden'}}>
      {layout === 'photo' ? <PhotoLayout v={v} /> : layout === 'versus' ? <VersusLayout v={v} /> : layout === 'react' ? <ReactLayout v={v} /> : <ProductLayout v={v} />}
      <SeriesTag color={layout === 'product' ? config.brand.colors.fg : '#ffffff'} />
    </AbsoluteFill>
  );
};

const ProductLayout: React.FC<{v: ThumbVariant}> = ({v}) => {
  const {fg, accent} = config.brand.colors;
  const img = v.image ?? (v.focus === 'logo' ? 'site/logo-shot.png' : 'site/hero.png');
  return (
    <>
      <StyleBackground />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 70% at 78% 50%, ${alpha(accent, 0.35)}, transparent 70%)`}} />
      {/* Product: tilted browser frame bleeding off the right edge. */}
      <div style={{position: 'absolute', left: 640, top: 120, transform: 'perspective(1400px) rotateY(-14deg) rotateX(6deg) rotate(-2deg)', transformOrigin: 'left center'}}>
        {v.focus === 'logo' ? (
          <div style={{width: 520, height: 520, borderRadius: 48, background: alpha(fg, 0.06), border: `3px solid ${alpha(fg, 0.12)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 40px 120px ${alpha('#000000', 0.5)}`}}>
            <Img src={staticFile(img)} style={{maxWidth: '80%', maxHeight: '80%', objectFit: 'contain'}} />
          </div>
        ) : (
          <BrowserFrame src={img} width={820} height={520} url={config.brand.url} progress={0} />
        )}
      </div>
      <Headline text={v.headline} left={56} top={70} width={640} />
      {v.sub ? <Sub text={v.sub} left={56} top={470} /> : null}
      <Mark kind={v.accent ?? 'arrow'} arrowAt={{left: 470, top: 330}} circle={{left: 640, top: 380, width: 600, height: 240}} />
    </>
  );
};

// A real photo is the whole thumbnail: faces, places and objects pull more
// clicks than a UI capture. The headline sits on the photo's emptier side
// over a hard dark gradient (dark whatever the palette), so white type reads
// on any image.
const PhotoLayout: React.FC<{v: ThumbVariant}> = ({v}) => {
  const bg = '#05060a';
  const right = v.side === 'right';
  const img = v.image ?? 'site/hero.png';
  return (
    <>
      <Img src={staticFile(img)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.25) contrast(1.12) brightness(0.95)'}} />
      <AbsoluteFill style={{background: `linear-gradient(${right ? 270 : 90}deg, ${alpha(bg, 0.94)} 0%, ${alpha(bg, 0.82)} 36%, ${alpha(bg, 0.1)} 66%, transparent 100%)`}} />
      <AbsoluteFill style={{boxShadow: `inset 0 0 160px ${alpha('#000000', 0.55)}`}} />
      {v.inset ? (
        <div style={{position: 'absolute', [right ? 'left' : 'right']: 60, top: 70, transform: `rotate(${right ? -4 : 4}deg)`}}>
          <div style={{width: 400, height: 250, borderRadius: 18, overflow: 'hidden', border: '8px solid #ffffff', boxShadow: `0 30px 80px ${alpha('#000000', 0.6)}`}}>
            <Img src={staticFile(v.inset)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%'}} />
          </div>
        </div>
      ) : null}
      <Headline text={v.headline} left={right ? 640 : 56} top={110} width={600} size={124} ink="#ffffff" />
      {v.sub ? <Sub text={v.sub} left={right ? 640 : 56} top={500} /> : null}
      <Mark kind={v.accent ?? 'circle'} arrowAt={{left: right ? 470 : 560, top: 360, flip: right}} circle={{left: right ? 60 : 700, top: 360, width: 460, height: 230}} />
    </>
  );
};

// Two images split by a slanted seam with a VS badge on it.
const VersusLayout: React.FC<{v: ThumbVariant}> = ({v}) => {
  const {accent, accent2} = config.brand.colors;
  const a = v.image ?? 'site/hero.png';
  const b = v.image2 ?? 'site/hero.png';
  const half = (src: string, clip: string, tint: string) => (
    <div style={{position: 'absolute', inset: 0, clipPath: clip}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.2) contrast(1.1)'}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${alpha('#000000', 0.85)} 0%, ${alpha('#000000', 0.35)} 45%, ${alpha(tint, 0.3)} 100%)`}} />
    </div>
  );
  return (
    <>
      {half(a, 'polygon(0 0, 58% 0, 42% 100%, 0 100%)', accent2)}
      {half(b, 'polygon(58% 0, 100% 0, 100% 100%, 42% 100%)', accent)}
      <svg style={{position: 'absolute', inset: 0}} width={1280} height={720}>
        <line x1={1280 * 0.58} y1={0} x2={1280 * 0.42} y2={720} stroke="#ffffff" strokeWidth={14} />
      </svg>
      <div style={{position: 'absolute', left: 640 - 85, top: 360 - 85, width: 170, height: 170, borderRadius: 170, background: accentFill(), display: 'flex', alignItems: 'center', justifyContent: 'center', border: '8px solid #ffffff', boxShadow: `0 20px 60px ${alpha('#000000', 0.6)}`, fontFamily: displayFamily, fontWeight: displayMaxWeight, fontSize: 76, color: '#ffffff', transform: 'rotate(-8deg)'}}>
        VS
      </div>
      <Headline text={v.headline} left={56} top={40} width={1168} size={96} center ink="#ffffff" />
      {v.labels
        ? v.labels.map((l, i) => (
            <div key={i} style={{position: 'absolute', [i ? 'right' : 'left']: i ? 230 : 70, bottom: 150, fontFamily: labelFamily, fontWeight: 700, fontSize: 40, color: '#ffffff', background: alpha('#000000', 0.72), padding: '10px 22px', borderRadius: 10, border: `3px solid ${i ? accent : accent2}`}}>
              {l}
            </div>
          ))
        : null}
    </>
  );
};

// The hook layout. What makes people click a tech thumbnail: one huge object
// with a story in it (a lock bursting open), a face reacting to it, a claim
// with a curiosity gap in 3 words, and a hot accent colour on near-black.
const ReactLayout: React.FC<{v: ThumbVariant}> = ({v}) => {
  const {accent} = config.brand.colors;
  const hot = '#FF2D2D';
  const obj = v.object ?? 'lock-open';
  const isLock = obj === 'lock' || obj === 'lock-open';
  return (
    <>
      {v.image ? (
        <Img src={staticFile(v.image)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.2) brightness(0.55)'}} />
      ) : null}
      {/* alarm glow behind the object, near-black at the edges */}
      <AbsoluteFill style={{background: `radial-gradient(circle at 58% 52%, ${alpha(hot, 0.75)} 0%, ${alpha('#5a0000', 0.75)} 32%, ${alpha('#050505', 0.94)} 70%)`}} />
      {/* light rays */}
      <AbsoluteFill style={{background: `repeating-conic-gradient(from 0deg at 58% 52%, ${alpha('#ffffff', 0.07)} 0deg 6deg, transparent 6deg 18deg)`}} />
      {/* the object */}
      <div style={{position: 'absolute', left: 560, top: isLock ? 170 : 150, transform: 'rotate(-8deg)'}}>
        {isLock ? (
          <Padlock width={330} open={obj === 'lock-open' ? 1 : 0} id="thumb" shadow={`drop-shadow(0 0 40px ${alpha(hot, 0.9)}) drop-shadow(0 30px 40px rgba(0,0,0,0.6))`} />
        ) : (
          <div style={{width: 420, height: 320, border: '12px solid #ffffff', borderRadius: 18, overflow: 'hidden', boxShadow: `0 0 60px ${alpha(hot, 0.8)}, 0 30px 60px rgba(0,0,0,0.6)`}}>
            <Img src={staticFile(obj)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        )}
        {/* shards flying off */}
        {isLock && obj === 'lock-open'
          ? [[-60, 40, 30, -20], [300, 20, 22, 35], [320, 200, 18, -10], [-40, 230, 16, 50], [140, -60, 20, 15]].map(([x, y, s, r], i) => (
              <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s * 1.6, background: i % 2 ? '#FFE27A' : '#ffffff', clipPath: 'polygon(50% 0, 100% 100%, 0 70%)', transform: `rotate(${r}deg)`, boxShadow: `0 0 20px ${hot}`}} />
            ))
          : null}
      </div>
      {/* Rado reacting, right edge, clear of the bottom-right duration badge */}
      {episode.series.mascot === false ? null : (
        <div style={{position: 'absolute', right: -30, top: 120, width: 300, height: 465, transform: 'rotate(8deg)', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6))'}}>
          <Mascot gesture={v.mascot ?? 'shock'} talk={0} look={-1} t={0.4} />
        </div>
      )}
      {v.sticker ? (
        <div style={{position: 'absolute', left: 470, top: 90, transform: 'rotate(-12deg)', background: accent, color: '#0D0C12', fontFamily: displayFamily, fontWeight: displayMaxWeight, fontSize: 52, padding: '12px 26px', borderRadius: 14, border: '6px solid #0D0C12', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'}}>
          {v.sticker}
        </div>
      ) : null}
      <Headline text={v.headline} left={50} top={200} width={560} size={118} ink="#ffffff" hotBox={hot} />
    </>
  );
};

const Headline: React.FC<{text: string; left: number; top: number; width: number; size?: number; center?: boolean; ink?: string; hotBox?: string}> = ({text, left, top, width, size: max = 112, center, ink, hotBox}) => {
  const {fg, accent} = config.brand.colors;
  const color = ink ?? fg;
  // the outline and shadow are the opposite of the type: dark under white type
  const bg = ink ? '#000000' : config.brand.colors.bg;
  // Shrink so the longest word fits the column (uppercase display faces run ~0.72em per character).
  const longest = Math.max(...text.replace(/\*/g, '').split(/\s+/).map((w) => w.length));
  const size = Math.min(max, Math.floor(width / (longest * 0.72)));
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        textAlign: center ? 'center' : 'left',
        fontFamily: displayFamily,
        fontWeight: displayMaxWeight,
        fontSize: size,
        // a hot box needs room above it, or it clips the line before
        lineHeight: hotBox ? 1.16 : 0.98,
        letterSpacing: -3,
        color,
        textTransform: style.name === 'terminal' ? 'none' : 'uppercase',
        // a soft shadow, no outline: strokes draw stray lines inside serif display faces
        textShadow: `0 6px 30px ${alpha(bg, 0.85)}, 0 2px 0 ${alpha('#000000', 0.5)}`,
      }}
    >
      {tokenize(text).map((t, i) => (
        <span key={i}>
          {t.em ? (
            <span
              style={
                hotBox
                  ? {background: hotBox, color: '#ffffff', padding: '0 14px', borderRadius: 8, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', textShadow: 'none'}
                  : ink
                  ? {color: accent} // on a photo: the accent itself reads best
                  : style.name === 'vox'
                    ? // marker: a highlighter band on the lower half, so it never covers the line above
                      {backgroundImage: `linear-gradient(${alpha(accent, 0.9)}, ${alpha(accent, 0.9)})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 48%', backgroundPosition: '0 88%'}
                    : {background: accentFill(100), WebkitBackgroundClip: 'text', color: 'transparent', textShadow: 'none'}
              }
            >
              {t.word}
            </span>
          ) : (
            t.word
          )}{' '}
        </span>
      ))}
    </div>
  );
};

const Sub: React.FC<{text: string; left: number; top: number}> = ({text, left, top}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      padding: '12px 26px',
      borderRadius: style.name === 'vox' || style.name === 'terminal' ? 6 : 999,
      background: accentFill(),
      color: style.name === 'vox' ? config.brand.colors.fg : '#ffffff',
      fontFamily: labelFamily,
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: 1,
    }}
  >
    {text}
  </div>
);

const Mark: React.FC<{kind: 'arrow' | 'circle' | 'none'; arrowAt: {left: number; top: number; flip?: boolean}; circle: {left: number; top: number; width: number; height: number}}> = ({kind, arrowAt, circle}) => {
  const {accent, accent2} = config.brand.colors;
  const ink = style.name === 'vox' ? config.brand.colors.fg : accent;
  if (kind === 'arrow')
    return (
      <svg style={{position: 'absolute', left: arrowAt.left, top: arrowAt.top, transform: arrowAt.flip ? 'scaleX(-1)' : undefined}} width={240} height={160} viewBox="0 0 240 160">
        <path d="M10 140 C 70 40, 150 20, 215 60" fill="none" stroke={ink} strokeWidth={16} strokeLinecap="round" />
        <path d="M175 30 L 222 62 L 172 92" fill="none" stroke={ink} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === 'circle') return <div style={{position: 'absolute', ...circle, borderRadius: '50%', border: `12px solid ${accent2}`, transform: 'rotate(-8deg)', boxShadow: `0 0 40px ${alpha(accent2, 0.6)}`}} />;
  return null;
};

// Series tag, bottom-left (bottom-right is the duration badge).
const SeriesTag: React.FC<{color: string}> = ({color}) => (
  <div style={{position: 'absolute', left: 56, bottom: 44, display: 'flex', alignItems: 'center', gap: 14}}>
    <Img src={staticFile('brand/mark.svg')} style={{width: 54, height: 54, borderRadius: '50%'}} />
    <span style={{fontFamily: seriesFamily, fontWeight: 700, fontSize: 28, letterSpacing: 1.5, color, textShadow: `0 2px 10px ${alpha('#000000', 0.8)}`}}>{episode.series.name.toUpperCase()}</span>
  </div>
);
