import { useState, useEffect, useRef } from 'react';

const CHAR_DELAY_MS = 18;
const LINE_DELAY_MS = 60;

export function useTypewriter(lines: string[], active: boolean) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    cancelRef.current = false;
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
  }, [lines, active]);

  return { displayedLines, done };
}
