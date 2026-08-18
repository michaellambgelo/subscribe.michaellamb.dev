import { describe, it, expect } from 'vitest';
import { QUOTES, QUOTE_TEXTS } from '../src/quotes';
import { retrieve, formatForPrompt } from '../src/retrieve';
import { checkTrigger } from '../src/triggers';
import { stripInventedAttributions, formatLines } from '../src/parse';

describe('the bank', () => {
  it('has entries for every show the persona claims to know', () => {
    const shows = new Set(QUOTES.map((q) => q.show));
    for (const s of ['Community', 'Arrested Development', 'The Office',
                     'Parks and Recreation', 'The Good Place']) {
      expect(shows.has(s), `missing ${s}`).toBe(true);
    }
  });

  it('gives every entry an attribution and at least one tag', () => {
    for (const q of QUOTES) {
      expect(q.who.length, q.q).toBeGreaterThan(0);
      expect(q.tags.length, q.q).toBeGreaterThan(0);
    }
  });

  it('records provenance for every entry', () => {
    for (const q of QUOTES) {
      expect(['wikiquote', 'wikiquote-verified', 'owner-confirmed']).toContain(q.provenance);
    }
  });

  it('keeps the corrected attributions this review established', () => {
    const find = (frag: string) => QUOTES.find((q) => q.q.includes(frag));
    expect(find('huge mistake')?.who).toBe('GOB Bluth');
    expect(find('POOPING')?.who).toBe('Chris Traeger');
    expect(find('I see your value now')?.who).toBe('Jeff Winger');
    expect(find('Take it sleazy')?.who).toBe('Michael');
    expect(find('I love you and I like you')?.who).toBe('Leslie Knope and Ben Wyatt');
  });

  it('has no duplicate quote texts', () => {
    expect(QUOTE_TEXTS.size).toBe(QUOTES.length);
  });
});

describe('retrieve', () => {
  it('returns nothing for input with no usable tokens', () => {
    expect(retrieve('a the of')).toEqual([]);
  });

  it('finds topically relevant quotes', () => {
    const got = retrieve('I am so hungry, I want breakfast');
    expect(got.length).toBeGreaterThan(0);
    expect(got.some((q) => /bacon|hamburger|meat|food/i.test(q.q))).toBe(true);
  });

  it('matches on stemmed tags so "crying" hits "cry"', () => {
    const got = retrieve('I keep crying about it');
    expect(got.some((q) => /cried|crying|Crying/.test(q.q))).toBe(true);
  });

  it('is deterministic for the same input', () => {
    expect(retrieve('money and work')).toEqual(retrieve('money and work'));
  });

  it('caps how many quotes come from one speaker', () => {
    const got = retrieve('work job money boss office career budget');
    const counts = new Map<string, number>();
    for (const q of got) counts.set(q.who, (counts.get(q.who) ?? 0) + 1);
    for (const [, n] of counts) expect(n).toBeLessThanOrEqual(2);
  });

  it('renders retrieved quotes with their attribution', () => {
    const block = formatForPrompt(retrieve('bacon'));
    expect(block).toMatch(/—/);
    expect(block.split('\n').length).toBeGreaterThan(0);
  });
});

describe('triggers', () => {
  it('answers the easter eggs the site copy promises', () => {
    expect(checkTrigger('her?')?.join(' ')).toContain('Egg?');
    expect(checkTrigger('steve holt')?.join(' ')).toContain('STEVE HOLT');
    expect(checkTrigger("li'l sebastian")?.join(' ')).toContain('5,000 candles');
  });

  it('is case- and punctuation-insensitive', () => {
    expect(checkTrigger('  Steve Holt!  ')).not.toBeNull();
    expect(checkTrigger('POP POP')).not.toBeNull();
  });

  it('does not hijack ordinary sentences containing a trigger word', () => {
    expect(checkTrigger('what do you think of her hair')).toBeNull();
    expect(checkTrigger('I ate a banana for breakfast')).toBeNull();
  });
});

describe('stripInventedAttributions', () => {
  it('keeps an attribution that matches the bank', () => {
    const line = '"Never half-ass two things. Whole-ass one thing." — Ron Swanson';
    expect(stripInventedAttributions(line)).toBe(line);
  });

  it('strips an attribution the bank cannot vouch for', () => {
    const line = '"The only true wisdom is knowing you know nothing." — Leslie Knope';
    const out = stripInventedAttributions(line);
    expect(out).toContain('The only true wisdom');
    expect(out).not.toContain('Leslie Knope');
  });

  it('leaves prose without quoted attributions untouched', () => {
    const line = 'Type `help` to see every command.';
    expect(stripInventedAttributions(line)).toBe(line);
  });

  it('runs as part of formatLines', () => {
    const out = formatLines('"I invented this line entirely." — Ron Swanson').join('\n');
    expect(out).not.toContain('Ron Swanson');
  });
});
