import { describe, it, expect } from 'vitest';
import { checkTrigger, TRIGGER_COUNT } from '../src/triggers';

const hits = (s: string) => checkTrigger(s)?.join(' ') ?? null;

describe('trigger normalization', () => {
  // The site's copy invites visitors to type these lines. Before this was
  // fixed, typing one the way it is actually said -- capitalised, punctuated,
  // on a phone -- fell through to the model at temperature 0.85, which the
  // worker's own comment says honours them about half the time.

  it('matches the punctuated form the show actually uses', () => {
    // These were the dead keys: written to catch the punctuated form, and
    // unreachable because keys were indexed before normalization.
    expect(hits('Bears. Beets. Battlestar Galactica.')).toContain('Battlestar');
    expect(hits('Cool. Cool cool cool.')).toContain('Cool cool cool');
    expect(hits('her?')).toContain('Egg?');
  });

  it('ignores internal punctuation, not just trailing', () => {
    expect(hits('bears, beets, battlestar galactica')).toContain('Battlestar');
    expect(hits('Treat yo self!!!')).toContain('Treat yo self');
    expect(hits('treat yo self :)')).toContain('Treat yo self');
  });

  it('accepts the curly apostrophe an Apple keyboard produces', () => {
    // iOS/macOS autocorrect ' to U+2019. Three eggs were unreachable from any
    // iPhone until this fold existed.
    expect(hits('That’s what she said')).toContain('what she said');
    expect(hits('Li’l Sebastian')).toContain('5,000 candles');
    expect(hits('I just blue myself')).toContain('blue myself');
  });

  it('still tolerates case and surrounding whitespace', () => {
    expect(checkTrigger('  STEVE HOLT!  ')).not.toBeNull();
    expect(checkTrigger('POP POP')).not.toBeNull();
  });

  it('does NOT hijack ordinary sentences containing a trigger word', () => {
    // The property the exactness exists to protect. Loosening normalization
    // must never loosen this.
    expect(checkTrigger('what do you think of her hair')).toBeNull();
    expect(checkTrigger('I ate a banana for breakfast')).toBeNull();
    expect(checkTrigger('come on in, the water is fine')).toBeNull();
    expect(checkTrigger('that is what she said to me yesterday')).toBeNull();
    expect(checkTrigger('bears and beets are both good')).toBeNull();
  });

  it('does not match empty or punctuation-only input', () => {
    expect(checkTrigger('')).toBeNull();
    expect(checkTrigger('   ')).toBeNull();
    expect(checkTrigger('...')).toBeNull();
    expect(checkTrigger('?!')).toBeNull();
  });

  it('indexes every egg', () => {
    expect(TRIGGER_COUNT).toBeGreaterThan(15);
  });
});
