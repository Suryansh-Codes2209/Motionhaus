// Mirrors buildProps() in apps/reels/src/props.mjs. All times are frames on
// the edited timeline except Segment.srcStart (seconds in the source).

export type Theme = {font: string; accent: string; accent2: string; ink: string; paper: string};
export type Segment = {srcStart: number; from: number; dur: number};
export type Zoom = {frame: number; scale: number};
export type CaptionWord = {text: string; from: number; emphasis: boolean};
export type CaptionPage = {from: number; to: number; words: CaptionWord[]};
export type Span = {from: number; to: number};

export type HookOverlay = Span & {type: 'hook'; lines: string[]; strikeAt?: number; strikeLine?: number};
export type StickerOverlay = Span & {type: 'sticker'; emoji: string; label: string; tag?: string; slot: number};
export type SlamOverlay = Span & {type: 'slam'; text: string; sub?: string};
export type WarningOverlay = Span & {type: 'warning'; text: string};
export type InsertEngine = 'art' | 'explainer' | 'gsap-title' | 'anime-grid' | 'title3d' | 'motion-canvas' | 'rive';
export type InsertOverlay = Span & {type: 'insert'; engine: InsertEngine; mode?: 'full' | 'pip'; label?: string; props?: Record<string, unknown>};
export type BehindOverlay = Span & {type: 'behind'; text: string; y?: number};
export type LyricWord = {
  t: string;
  at: number; // frame offset from the block start
  style?: 'serif' | 'fat' | 'neon' | 'script' | 'bold' | 'outline';
  color?: string;
  size?: number;
  br?: boolean; // start a new row
  in?: 'rise' | 'drop' | 'type';
  dx?: number;
  dy?: number;
  rot?: number;
};
export type LyricOverlay = Span & {type: 'lyric'; x: number; y: number; align?: 'left' | 'center' | 'right'; rot?: number; gap?: number; behind?: boolean; words: LyricWord[]};
export type SparkleOverlay = Span & {type: 'sparkle'; x: number; y: number; w: number; h: number; count?: number; color?: string; id: number};
export type EmojiOverlay = Span & {type: 'emoji'; emoji: string; x: number; y: number; size?: number; rot?: number};
export type FlashOverlay = Span & {type: 'flash'};
export type Overlay = (HookOverlay | StickerOverlay | SlamOverlay | WarningOverlay | InsertOverlay | BehindOverlay | LyricOverlay | SparkleOverlay | EmojiOverlay | FlashOverlay) & {id: number};

export type ReelProps = {
  fps: number;
  durationInFrames: number;
  video: string;
  handle: string;
  theme: Theme;
  focus: {x: number; y: number};
  segments: Segment[];
  zooms: Zoom[];
  captions: CaptionPage[];
  captionY?: number;
  captionStyle?: 'pop' | 'lines';
  // speaker cutout (reels mask) for text-behind and the sticker outline
  person?: {src: string; outline: Span[]; pulses: number[]};
  hideCaptions: Span[];
  overlays: Overlay[];
  outro: {from: number; dur: number; title: string; cta: string} | null;
  music: {src: string; volume: number} | null;
  sfx: {name: string; frame: number; volume: number}[];
};
