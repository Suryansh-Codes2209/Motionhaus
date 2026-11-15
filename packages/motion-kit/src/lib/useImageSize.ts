import {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

const cache = new Map<string, {w: number; h: number}>();

// Natural size of an image in public/, holding the render until it's known
// (needed to place marks on a screenshot at a 0..1 focus point).
export const useImageSize = (src: string) => {
  const [size, setSize] = useState(() => cache.get(src) ?? null);
  const [handle] = useState(() => (cache.has(src) ? null : delayRender(`image size ${src}`)));
  useEffect(() => {
    if (!handle) return;
    const img = new Image();
    img.onload = () => {
      const s = {w: img.naturalWidth, h: img.naturalHeight};
      cache.set(src, s);
      setSize(s);
      continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`could not load ${src}`));
    img.src = staticFile(src);
  }, [src, handle]);
  return size;
};
