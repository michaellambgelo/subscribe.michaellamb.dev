import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { chatbotRespond, resetChatbotState } from './chatbot';

type FetchMock = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

function mockFetch(lines: string[], status = 200, sessionId?: string): FetchMock {
  return vi.fn(async () =>
    new Response(JSON.stringify(sessionId ? { lines, sessionId } : { lines }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const SESSION_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const SESSION_B = '9c858901-8a57-4791-81fe-4c455b099bc9';

function bodyOf(spy: FetchMock, callIndex: number): Record<string, unknown> {
  const call = spy.mock.calls[callIndex];
  if (!call) throw new Error(`No call at index ${callIndex}`);
  const [, init] = call;
  return JSON.parse(String(init?.body));
}

describe('chatbotRespond', () => {
  beforeEach(() => {
    resetChatbotState();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty output for empty input', async () => {
    expect(await chatbotRespond('')).toEqual([]);
    expect(await chatbotRespond('   ')).toEqual([]);
  });

  it('captures user name deterministically without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await chatbotRespond('my name is Michael');
    expect(out.join('\n')).toContain('Nice to meet you, Michael');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('captures name from "call me X"', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const out = await chatbotRespond('call me Sarah');
    expect(out.join('\n')).toContain('Sarah');
  });

  it('ignores obviously-not-a-name captures', async () => {
    const fetchSpy = mockFetch(['', '  (model response)', '']);
    vi.stubGlobal('fetch', fetchSpy);
    const sorry = await chatbotRespond("i'm sorry");
    expect(sorry.join('\n')).not.toContain('Nice to meet you, Sorry');
    const fine = await chatbotRespond("i'm fine");
    expect(fine.join('\n')).not.toContain('Nice to meet you, Fine');
    // These should all have fallen through to the worker
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('forwards freeform input to the chat endpoint and returns its lines', async () => {
    const fetchSpy = mockFetch(['', '  Cool. Cool cool cool.', '']);
    vi.stubGlobal('fetch', fetchSpy);
    const out = await chatbotRespond('hello there');
    expect(out).toEqual(['', '  Cool. Cool cool cool.', '']);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = bodyOf(fetchSpy, 0);
    expect(body.input).toBe('hello there');
    // The transcript lives on the worker now — the client never sends one.
    expect(body.history).toBeUndefined();
    expect(body.sessionId).toBeUndefined();
  });

  it('sends the captured name on subsequent requests', async () => {
    const fetchSpy = mockFetch(['', '  noted', '']);
    vi.stubGlobal('fetch', fetchSpy);
    await chatbotRespond('my name is Sam');
    await chatbotRespond('how are you');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = bodyOf(fetchSpy, 0);
    expect(body.name).toBe('Sam');
  });

  it('round-trips the server-issued session id on later turns', async () => {
    const fetchSpy = mockFetch(['', '  response', ''], 200, SESSION_A);
    vi.stubGlobal('fetch', fetchSpy);
    await chatbotRespond('first message');
    await chatbotRespond('second message');
    expect(bodyOf(fetchSpy, 0).sessionId).toBeUndefined();
    expect(bodyOf(fetchSpy, 1).sessionId).toBe(SESSION_A);
    // No transcript is ever sent, on any turn.
    expect(bodyOf(fetchSpy, 1).history).toBeUndefined();
  });

  it('adopts a re-issued session id when the worker mints a new one', async () => {
    const fetchSpy = mockFetch(['', '  response', ''], 200, SESSION_A);
    vi.stubGlobal('fetch', fetchSpy);
    await chatbotRespond('first message');
    fetchSpy.mockImplementation(async () =>
      new Response(JSON.stringify({ lines: ['', '  fresh', ''], sessionId: SESSION_B }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await chatbotRespond('second message');
    await chatbotRespond('third message');
    expect(bodyOf(fetchSpy, 2).sessionId).toBe(SESSION_B);
  });

  it('keeps its session id when a response carries none', async () => {
    const fetchSpy = mockFetch(['', '  response', ''], 200, SESSION_A);
    vi.stubGlobal('fetch', fetchSpy);
    await chatbotRespond('first message');
    fetchSpy.mockImplementation(async () =>
      new Response(JSON.stringify({ lines: ['', '  hourly limit', ''] }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await chatbotRespond('second message');
    await chatbotRespond('third message');
    expect(bodyOf(fetchSpy, 2).sessionId).toBe(SESSION_A);
  });

  it('surfaces a rate-limit response as lines', async () => {
    const fetchSpy = mockFetch(['', '  hourly limit', ''], 429);
    vi.stubGlobal('fetch', fetchSpy);
    const out = await chatbotRespond('hello');
    expect(out).toEqual(['', '  hourly limit', '']);
  });

  it('falls back to a canned response on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const out = await chatbotRespond('anything');
    expect(out.length).toBeGreaterThan(0);
    expect(out.join('\n').toLowerCase()).toMatch(/lost the thread|didn'?t answer|understand nothing/);
  });

  it('falls back when server returns malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('not-json', { status: 200 }),
    ));
    const out = await chatbotRespond('anything');
    expect(out.length).toBeGreaterThan(0);
  });

  it('resetChatbotState clears name, session, and fallback rotation', async () => {
    const fetchSpy = mockFetch(['', '  ok', ''], 200, SESSION_A);
    vi.stubGlobal('fetch', fetchSpy);
    await chatbotRespond('my name is Testuser');
    await chatbotRespond('hello');
    resetChatbotState();
    await chatbotRespond('again');
    const lastBody = bodyOf(fetchSpy, fetchSpy.mock.calls.length - 1);
    expect(lastBody.name).toBeUndefined();
    expect(lastBody.sessionId).toBeUndefined();
    expect(lastBody.history).toBeUndefined();
  });
});
