import { useState, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const CHAR_DELAY_MS = 18;
const LINE_DELAY_MS = 60;

export function useTypewriter(lines: string[], active: boolean) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;

    cancelRef.current = false;

    // Reduced motion: land on the finished state immediately. `done` still
    // flips, so the submit-on-complete effect downstream fires as usual.
    if (reducedMotion) {
      setDisplayedLines(lines);
      setDone(true);
      return;
    }

    setDisplayedLines([]);
    setDone(false);

    let lineIndex = 0;
    let charIndex = 0;

    const tick = () => {
      if (cancelRef.current) return;

      const currentLine = lines[lineIndex];

      if (charIndex <= currentLine.length) {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[lineIndex] = currentLine.slice(0, charIndex);
          return next;
        });
        charIndex++;
        setTimeout(tick, CHAR_DELAY_MS);
      } else {
        // Line finished
        lineIndex++;
        charIndex = 0;
        if (lineIndex < lines.length) {
          setTimeout(tick, LINE_DELAY_MS);
        } else {
          setDone(true);
        }
      }
    };

    setTimeout(tick, LINE_DELAY_MS);

    return () => {
      cancelRef.current = true;
    };
  }, [lines, active, reducedMotion]);

  return { displayedLines, done };
}
