import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

const LINES = ['> first line', '> second line'];

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

describe('useTypewriter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reveals lines one character at a time by default', async () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useTypewriter(LINES, true));

    // Mid-flight the output is a strict prefix of the target, not the whole thing.
    await waitFor(() => expect(result.current.displayedLines.length).toBeGreaterThan(0));
    expect(result.current.done).toBe(false);

    await waitFor(() => expect(result.current.done).toBe(true), { timeout: 5000 });
    expect(result.current.displayedLines).toEqual(LINES);
  });

  it('renders instantly when the user has asked for reduced motion', async () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useTypewriter(LINES, true));

    // No waiting, no partial lines: the whole thing lands on the first pass,
    // and `done` still flips so the submit-on-complete effect fires as usual.
    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.displayedLines).toEqual(LINES);
  });

  it('stays dormant until activated', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useTypewriter(LINES, false));
    expect(result.current.displayedLines).toEqual([]);
    expect(result.current.done).toBe(false);
  });

  it('survives an environment with no matchMedia at all', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useTypewriter(LINES, false));
    expect(result.current.done).toBe(false);
  });
});
