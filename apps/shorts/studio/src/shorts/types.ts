import type {LaunchConfig} from '../types';

// One spoken word; times are ms from the start of its scene's VO clip.
// emphasis: marked *like this* in the script. br: a phrase ends after it.
export type Word = {text: string; startMs: number; endMs: number; emphasis?: boolean; br?: boolean};

export type Voice = {
  src: string; // path inside public/
  durationSec: number;
  words: Word[];
  // headshot with a recorded take: where this clip starts in the face footage
  face?: {startSec: number};
};

// A long-form chapter: starts at scene `scene` (index into config.scenes).
export type Chapter = {title: string; scene: number; backdrop?: string; plate?: string}; // backdrop: a longform/Backdrop set name; plate: the episode's own photo or clip (inside public/) as the chapter's background

// One thumbnail variant (long-form). headline: 3–4 words, *emphasis* marks
// the accent word. layout picks the composition, and the variants of one
// episode should each use a different one:
//   product: headline left, the product (screenshot / logo) tilted on the right
//   photo:   a real photo fills the frame, headline over its dark side, the
//            product as a small tilted card (inset) when given
//   versus:  two images split by a slanted seam with a VS badge (old vs new,
//            rival vs rival); labels names the two halves
//   react:   the hook layout: one huge object (open padlock, a cutout) in a
//            red alarm glow, Rado reacting, a 3-word claim and a sticker
export type ThumbVariant = {
  headline: string;
  sub?: string;
  layout?: 'product' | 'photo' | 'versus' | 'react'; // default product
  focus?: 'screenshot' | 'logo'; // product layout
  image?: string; // path inside public/, default site/hero.png
  image2?: string; // versus: the right half
  inset?: string; // photo: a product capture shown as a card
  labels?: [string, string]; // versus: the two names
  side?: 'left' | 'right'; // photo: where the headline sits (the photo's empty side), default left
  object?: string; // react: 'lock' | 'lock-open' or a public path (shown as a white-bordered cutout)
  sticker?: string; // react: a short number/word on a tilted sticker ("256 KEYS")
  mascot?: 'shock' | 'think' | 'point' | 'cheer'; // react: Rado's reaction, default shock
  accent?: 'arrow' | 'circle' | 'none';
};

// Input props for the "Short" (9:16) and "Long" (16:9) compositions. Built by shorts/src/props.mjs;
// scene beats are already fitted to the voiceover.
export type ShortProps = {
  episode: number;
  sourceLabel: string; // "Show HN", "GitHub"
  kicker?: string | null; // dateline chip over the hook
  series: {
    name: string;
    handle: string;
    colors: {bg: string; fg: string; muted: string; accent: string; accent2: string};
    badge?: string; // the series line under the name, e.g. "#042 · via GitHub" (channel.json → publish.badge); absent in older props
    mascot?: boolean; // false: this channel has no mascot art (no host, no mascot thumbnail, no mascot headshot)
  };
  config: LaunchConfig;
  voice: (Voice | null)[]; // same index as config.scenes
  music: {src: string; volume: number; duck: number} | null;
  outro: {text: string; voice: Voice | null; sub?: string | null};
  // instagram: the Instagram cut (no "#nnn · via" line on the badge, the
  // series handle is the Instagram one, the end card is a share prompt)
  platform?: 'youtube' | 'instagram';
  cover?: boolean; // a still for the Instagram cover: no burned-in captions
  captions: {wordsPerPage: number; preset?: 'style' | 'slam' | 'bigKey' | 'pill' | 'sweep' | 'underline'} | null; // null: long-form ships an .srt instead
  // headshot: the speaker's recorded take (path inside public/); its audio is
  // the VO. focusY: where the face sits, 0..1 from the top. Absent: Rado hosts.
  face?: {src: string; focusY?: number} | null;
  chapters?: Chapter[]; // long-form only
  thumbnail?: {variants: ThumbVariant[]}; // long-form only
};
