import {loadFont as anton} from '@remotion/google-fonts/Anton';
import {loadFont as dmSans} from '@remotion/google-fonts/DMSans';
import {loadFont as geist} from '@remotion/google-fonts/Geist';
import {loadFont as courierPrime} from '@remotion/google-fonts/CourierPrime';
import {loadFont as ibmPlexMono} from '@remotion/google-fonts/IBMPlexMono';
import {loadFont as instrumentSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as inter} from '@remotion/google-fonts/Inter';
import {loadFont as jetbrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as manrope} from '@remotion/google-fonts/Manrope';
import {loadFont as outfit} from '@remotion/google-fonts/Outfit';
import {loadFont as playfair} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as plusJakarta} from '@remotion/google-fonts/PlusJakartaSans';
import {loadFont as poppins} from '@remotion/google-fonts/Poppins';
import {loadFont as sora} from '@remotion/google-fonts/Sora';
import {loadFont as spaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as unbounded} from '@remotion/google-fonts/Unbounded';
import {style} from './styles';
import type {FontName} from './types';
import {config} from './video.config';

const latin = {subsets: ['latin' as const]};

const loaders: Record<FontName, () => {fontFamily: string}> = {
  Inter: () => inter('normal', {...latin, weights: ['400', '500', '700', '800']}),
  SpaceGrotesk: () => spaceGrotesk('normal', {...latin, weights: ['400', '500', '700']}),
  Manrope: () => manrope('normal', {...latin, weights: ['400', '600', '800']}),
  Sora: () => sora('normal', {...latin, weights: ['400', '600', '800']}),
  PlusJakartaSans: () => plusJakarta('normal', {...latin, weights: ['400', '600', '800']}),
  DMSans: () => dmSans('normal', {...latin, weights: ['400', '500', '700']}),
  Poppins: () => poppins('normal', {...latin, weights: ['400', '600', '800']}),
  Outfit: () => outfit('normal', {...latin, weights: ['400', '600', '800']}),
  Geist: () => geist('normal', {...latin, weights: ['400', '600', '800']}),
  InstrumentSerif: () => instrumentSerif('normal', {...latin, weights: ['400']}),
  PlayfairDisplay: () => playfair('normal', {...latin, weights: ['400', '700', '900']}),
  CourierPrime: () => courierPrime('normal', {...latin, weights: ['400', '700']}),
  Unbounded: () => unbounded('normal', {...latin, weights: ['400', '600', '800']}),
  IBMPlexMono: () => ibmPlexMono('normal', {...latin, weights: ['400', '500', '700']}),
};

// A style with its own type (vox, neon, terminal…) replaces the brand fonts.
const body: FontName = style.fonts?.body ?? config.brand.font;
const display: FontName = style.fonts?.display ?? config.brand.displayFont ?? body;

export const bodyFamily = loaders[body]().fontFamily;
export const displayFamily = loaders[display]().fontFamily;

// Italic serif for the toy-box emphasis ("Looks *pro.*"); always loaded so
// any style can call for it.
export const serifItalicFamily = instrumentSerif('italic', {...latin, weights: ['400']}).fontFamily;

// Condensed poster face for giant keywords (hook variants, echo stacks,
// slam captions); always loaded. Its glyphs set ~0.72× as wide as the sans.
export const impactFamily = anton('normal', {...latin, weights: ['400']}).fontFamily;
export const IMPACT_WIDTH = 0.72;

// Code and terminal scenes.
export const monoFamily = jetbrainsMono('normal', {...latin, weights: ['400', '700']}).fontFamily;

// Chips, captions and typewriter labels, per style.
export const labelFamily =
  style.label === 'JetBrainsMono' ? monoFamily : loaders[style.label]().fontFamily;

// Fonts that ship a single weight must not be faux-bolded.
const SINGLE_WEIGHT: FontName[] = ['InstrumentSerif'];
const MAX_WEIGHT: Partial<Record<FontName, number>> = {IBMPlexMono: 700, CourierPrime: 700};
export const displayMaxWeight = SINGLE_WEIGHT.includes(display) ? 400 : (MAX_WEIGHT[display] ?? 900);

// How much wider the display font sets than the kit's default sans, for
// one-line fitting. Wide faces (Unbounded, mono) need far more room.
const WIDTH_SCALE: Partial<Record<FontName, number>> = {Unbounded: 1.45, IBMPlexMono: 1.13, CourierPrime: 1.13, PlayfairDisplay: 0.95};
export const displayWidthScale = WIDTH_SCALE[display] ?? 1;
