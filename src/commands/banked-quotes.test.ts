import { describe, it, expect } from 'vitest';
import { FALLBACK_QUOTES, GREETING_QUOTES } from './banked-quotes';
import { QUOTES } from '../../worker/src/quotes';

// `?raw` rather than node:fs — the app tsconfig has no node types, and the
// production build typechecks everything under src/.
import chatbotSrc from './chatbot.ts?raw';
import aboutSrc from './about.ts?raw';
import blogSrc from './blog.ts?raw';
import linksSrc from './links.ts?raw';
import appsSrc from './apps.ts?raw';
import helpSrc from './help.ts?raw';
import indexSrc from './index.ts?raw';

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const BANK = new Map(QUOTES.map((q) => [norm(q.q), q]));

describe('client-side quotes are banked', () => {
  it('every generated client quote exists in the bank, with the same attribution', () => {
    for (const x of [...FALLBACK_QUOTES, ...GREETING_QUOTES]) {
      const hit = BANK.get(norm(x.q));
      expect(hit, `not in bank: "${x.q}"`).toBeDefined();
      expect(hit!.who, `wrong attribution for "${x.q}"`).toBe(x.who);
      expect(hit!.show).toBe(x.show);
    }
  });

  /**
   * The Worker strips invented attributions from model output, but nothing
   * guards hand-written ones in client source — that is how "I've made a huge
   * mistake" ended up credited to Michael Bluth here while the Worker credited
   * GOB. This scans the shipped client for any `"…" — Name` and requires it to
   * be in the bank.
   */
  it('no hand-written attributed quote survives anywhere in src/commands', () => {
    const files: Array<[string, string]> = [
      ['chatbot.ts', chatbotSrc], ['about.ts', aboutSrc], ['blog.ts', blogSrc],
      ['links.ts', linksSrc], ['apps.ts', appsSrc], ['help.ts', helpSrc],
      ['index.ts', indexSrc],
    ];
    const offenders: string[] = [];
    for (const [f, src] of files) {
      const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of body.matchAll(/["'\\]*\\?"([^"\\]{10,})\\?"\s*[—–-]+\s*([A-Z][\w.'’]*(?:\s+[A-Z][\w.'’]*){0,3})/g)) {
        const [, quoted] = m;
        if (!BANK.has(norm(quoted))) offenders.push(`${f}: "${quoted}"`);
      }
    }
    expect(offenders, `unbanked attributions:\n${offenders.join('\n')}`).toEqual([]);
  });
});
