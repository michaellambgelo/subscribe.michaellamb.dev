import { describe, it, expect, beforeEach } from 'vitest';
import { chatbotRespond, resetChatbotState } from './chatbot';

describe('chatbotRespond', () => {
  beforeEach(() => {
    resetChatbotState();
  });

  it('returns empty output for empty input', () => {
    expect(chatbotRespond('')).toEqual([]);
    expect(chatbotRespond('   ')).toEqual([]);
  });

  it('captures user name and greets them back', () => {
    const out = chatbotRespond('my name is Michael');
    expect(out.join('\n')).toContain('Nice to meet you, Michael');
  });

  it('captures name from "call me X"', () => {
    const out = chatbotRespond('call me Sarah');
    expect(out.join('\n')).toContain('Sarah');
  });

  it('ignores obviously-not-a-name captures', () => {
    // "i'm sorry" / "i'm fine" shouldn't be treated as a name
    const sorry = chatbotRespond("i'm sorry");
    expect(sorry.join('\n')).not.toContain('Nice to meet you, Sorry');
    const fine = chatbotRespond("i'm fine");
    expect(fine.join('\n')).not.toContain('Nice to meet you, Fine');
  });

  it('matches canned patterns (greetings)', () => {
    const out = chatbotRespond('hello');
    expect(out.length).toBeGreaterThan(0);
    expect(out.join('\n').toLowerCase()).toMatch(/hello|hey|howdy|greetings|oh/);
  });

  it('applies ELIZA reflection for "I feel X"', () => {
    const out = chatbotRespond('i feel tired today');
    expect(out.join('\n')).toMatch(/do you often feel/i);
    expect(out.join('\n')).toContain('tired today');
  });

  it('applies ELIZA reflection for "I want X"', () => {
    const out = chatbotRespond('i want to learn more');
    expect(out.join('\n')).toMatch(/what would it mean for you to learn more/i);
  });

  it('reflects pronouns in ELIZA replies', () => {
    // "i feel like my life is good" → reflection should flip "my" to "your"
    const out = chatbotRespond('i feel like my life is good');
    const joined = out.join(' ');
    expect(joined).toContain('your life');
    expect(joined).not.toContain('my life');
  });

  it('responds to "you are X" with a reflective question', () => {
    const out = chatbotRespond("you're weird");
    expect(out.join('\n')).toMatch(/what makes you think i am weird/i);
  });

  it('has a fallback for plain questions ending with ?', () => {
    const out = chatbotRespond('what even is this?');
    expect(out.length).toBeGreaterThan(0);
    expect(out.join('\n').length).toBeGreaterThan(10);
  });

  it('falls back to canned responses only when no rule matches', () => {
    const out = chatbotRespond('asdf qwer zxcv');
    expect(out.length).toBeGreaterThan(0);
  });

  it('resetChatbotState clears name memory', () => {
    chatbotRespond('my name is Testuser');
    resetChatbotState();
    // After reset, next freeform input shouldn't leak the name
    const out = chatbotRespond('i feel great');
    expect(out.join('\n')).not.toContain('Testuser');
  });
});
