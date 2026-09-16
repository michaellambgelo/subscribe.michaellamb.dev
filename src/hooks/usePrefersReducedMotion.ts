import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Read the OS "reduce motion" setting once, without subscribing.
 *
 * Guarded because jsdom (and any non-browser environment) may not implement
 * `matchMedia` at all — the CRT animations are the default, so failing to
 * detect the preference degrades to today's behaviour rather than breaking.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/** Reactive variant: re-renders if the preference changes mid-session. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    // Safari < 14 only has the deprecated addListener/removeListener pair.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}
