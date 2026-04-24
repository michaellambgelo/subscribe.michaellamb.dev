import { describe, it, expect } from 'vitest';
import { formatLines } from '../src/parse';

describe('formatLines', () => {
  it('returns a placeholder when input is empty', () => {
    expect(formatLines('')).toEqual(['', '  ...', '']);
    expect(formatLines('   \n\n  ')).toEqual(['', '  ...', '']);
  });

  it('wraps output with leading and trailing blank lines', () => {
    const result = formatLines('hello');
    expect(result[0]).toBe('');
    expect(result[result.length - 1]).toBe('');
  });

  it('indents each non-empty line with two spaces', () => {
    const result = formatLines('first line\nsecond line');
    expect(result).toContain('  first line');
    expect(result).toContain('  second line');
  });

  it('drops blank lines from the middle of the output', () => {
    const result = formatLines('first\n\n\nsecond');
    const middle = result.slice(1, -1);
    expect(middle).toEqual(['  first', '  second']);
  });

  it('caps output at 8 content lines', () => {
    const many = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const result = formatLines(many);
    const middle = result.slice(1, -1);
    expect(middle.length).toBeLessThanOrEqual(8);
  });

  it('strips carriage returns', () => {
    const result = formatLines('hello\r\nworld');
    expect(result).toContain('  hello');
    expect(result).toContain('  world');
  });

  it('trims whitespace around each line', () => {
    const result = formatLines('   indented content   ');
    expect(result).toContain('  indented content');
  });
});
