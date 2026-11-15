import {loadFont as anton} from '@remotion/google-fonts/Anton';
import {loadFont as inter} from '@remotion/google-fonts/Inter';
import {loadFont as montserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as playfair} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as fredoka} from '@remotion/google-fonts/Fredoka';
import {loadFont as dancing} from '@remotion/google-fonts/DancingScript';
import {loadFont as poppins} from '@remotion/google-fonts/Poppins';

const FAMILIES: Record<string, string> = {
  Montserrat: montserrat('normal', {subsets: ['latin'], weights: ['700', '800', '900']}).fontFamily,
  Inter: inter('normal', {subsets: ['latin'], weights: ['600', '800']}).fontFamily,
  Anton: anton('normal', {subsets: ['latin'], weights: ['400']}).fontFamily,
  // kinetic lyric typography
  Playfair: playfair('normal', {subsets: ['latin'], weights: ['400', '700']}).fontFamily,
  Fredoka: fredoka('normal', {subsets: ['latin'], weights: ['600', '700']}).fontFamily,
  Dancing: dancing('normal', {subsets: ['latin'], weights: ['700']}).fontFamily,
  Poppins: poppins('normal', {subsets: ['latin'], weights: ['800', '900']}).fontFamily,
};

// Emoji fall through to the system emoji font.
export const family = (name: string) => `${FAMILIES[name] ?? FAMILIES.Montserrat}, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
export const displayFamily = () => family('Anton');
