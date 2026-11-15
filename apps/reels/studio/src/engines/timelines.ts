import {createTimeline, type Timeline} from 'animejs';
import gsap from 'gsap';
import {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

// GSAP and Anime.js normally run on their own requestAnimationFrame clock,
// which Remotion can't render (it captures frames out of order, in parallel
// tabs). Both hooks build the timeline PAUSED once, then seek it to exactly
// frame / fps on every frame, so any frame can be rendered on its own.

/**
 * GSAP: `build(tl, root)` adds tweens to a paused timeline. Selector strings
 * are scoped to `root` (gsap.context), so `.title` only matches inside it.
 * Returns the ref to put on the root element.
 */
export function useGsapTimeline<T extends HTMLElement = HTMLDivElement>(build: (tl: gsap.core.Timeline, root: T) => void) {
  const root = useRef<T>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({paused: true});
      build(tl.current, root.current as T);
    }, root);
    return () => ctx.revert();
    // build once; the timeline is a pure function of time from here on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    tl.current?.seek(frame / fps, false);
  }, [frame, fps]);
  return root;
}

/**
 * Anime.js v4: `build(tl, root)` adds animations to a timeline created with
 * autoplay off; it is seeked in milliseconds every frame.
 */
export function useAnimeTimeline<T extends HTMLElement = HTMLDivElement>(build: (tl: Timeline, root: T) => void) {
  const root = useRef<T>(null);
  const tl = useRef<Timeline | null>(null);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  useLayoutEffect(() => {
    tl.current = createTimeline({autoplay: false});
    build(tl.current, root.current as T);
    return () => {
      tl.current?.revert();
      tl.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    tl.current?.seek((frame / fps) * 1000, true);
  }, [frame, fps]);
  return root;
}
