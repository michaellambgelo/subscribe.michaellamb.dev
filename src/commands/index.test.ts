import { describe, it, expect } from 'vitest';
import { runCommand } from './index';

describe('runCommand', () => {
  it('returns help text for `help`', async () => {
    const { lines } = await runCommand('help');
    expect(lines.join('\n')).toContain('Available commands');
    expect(lines.join('\n')).toContain('subscribe');
    expect(lines.join('\n')).toContain('chatbot');
  });

  it('enters chatbot mode on `chatbot`', async () => {
    const result = await runCommand('chatbot');
    expect(result.enterChatbot).toBe(true);
    expect(result.exitChatbot).toBeFalsy();
    expect(result.lines.join('\n')).toContain('Chatbot mode enabled');
  });

  it('exits chatbot mode on `exit`', async () => {
    const result = await runCommand('exit');
    expect(result.exitChatbot).toBe(true);
    expect(result.enterChatbot).toBeFalsy();
  });

  it('is case-insensitive', async () => {
    const upper = await runCommand('CHATBOT');
    const mixed = await runCommand('ChAtBoT');
    expect(upper.enterChatbot).toBe(true);
    expect(mixed.enterChatbot).toBe(true);
  });

  it('trims whitespace around commands', async () => {
    const result = await runCommand('   chatbot   ');
    expect(result.enterChatbot).toBe(true);
  });

  it('returns empty output for empty input', async () => {
    const { lines } = await runCommand('');
    expect(lines).toEqual([]);
  });

  it('returns "command not found" for unknown input', async () => {
    const { lines } = await runCommand('nope');
    expect(lines.join('\n')).toContain('command not found');
    expect(lines.join('\n')).toContain('nope');
  });

  it('preserves original-case in "not found" message', async () => {
    const { lines } = await runCommand('FooBar');
    expect(lines.join('\n')).toContain('FooBar');
  });

  it('returns about/blog/links output', async () => {
    const about = await runCommand('about');
    const blog = await runCommand('blog');
    const links = await runCommand('links');
    expect(about.lines.length).toBeGreaterThan(0);
    expect(blog.lines.length).toBeGreaterThan(0);
    expect(links.lines.length).toBeGreaterThan(0);
  });

  it('lists open source apps for `apps`', async () => {
    const { lines } = await runCommand('apps');
    const text = lines.join('\n');
    expect(text).toContain('Boxd Card');
    expect(text).toContain('boxd-card.michaellamb.dev');
    expect(text).toContain('Letterboxd Stats');
    expect(text).toContain('letterboxd.michaellamb.dev');
    expect(text).toContain('Discord Embed Builder');
    expect(text).toContain('embed-builder.michaellamb.dev');
  });

  it('advertises `apps` in help output', async () => {
    const { lines } = await runCommand('help');
    expect(lines.join('\n')).toContain('apps');
  });
});
