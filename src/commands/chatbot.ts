// ─────────────────────────────────────────────────────────────────────────────
// Chatbot responder.
//
// Name capture stays deterministic in-browser (so the "Nice to meet you, X"
// greeting is instant and no token is spent on it). Everything else is
// delegated to the Cloudflare Workers AI proxy at `/api/chat`, which is
// seeded with a curated few-shot drawn from the original regex library so
// the LLM replies in-voice.
//
// The conversation transcript is NOT held here. The worker owns it, keyed by
// an opaque session id it mints and we echo back — a browser that could hand
// the worker its own transcript could forge the assistant's turns and talk
// the model out of its system prompt.
// ─────────────────────────────────────────────────────────────────────────────

// In dev, Vite proxies /api/* to the local `wrangler dev` worker.
// In prod, set VITE_CHAT_ENDPOINT in .env.production to the deployed worker URL
// (e.g. https://subscribe-chatbot.<account>.workers.dev/chat).
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT ?? '/api/chat';

let userName: string | null = null;
let sessionId: string | null = null;

const FALLBACK_RESPONSES: string[][] = [
  [
    '',
    '  I lost the thread. Network hiccup, probably.',
    '  "I\'ve made a huge mistake." — GOB Bluth.',
    '  Try again in a sec.',
    '',
  ],
  [
    '',
    '  The worker didn\'t answer. Cool. Cool cool cool.',
    '  (Not cool.) Give it another try.',
    '',
  ],
  [
    '',
    '  "I understand nothing." — Michael Bluth',
    '  Specifically, I understand nothing because the chat endpoint',
    '  didn\'t respond. Try again?',
    '',
  ],
];
let fallbackIndex = 0;

const NAME_CAPTURE = /\b(?:my name is|i am called|call me|i'?m|i am|this is)\s+([a-z][a-z\-']{1,20})\b/i;
const NAME_BLOCKLIST = new Set([
  'a', 'an', 'the', 'not', 'here', 'bored', 'tired', 'fine', 'good', 'bad',
  'sorry', 'confused', 'lost', 'back', 'done', 'hungry', 'sure', 'trying',
  'looking', 'asking', 'wondering', 'working', 'learning', 'just', 'really',
  'very', 'kinda', 'sort', 'maybe', 'probably',
]);

function tryCaptureName(input: string): string | null {
  const m = input.match(NAME_CAPTURE);
  if (!m) return null;
  const raw = m[1].trim();
  if (NAME_BLOCKLIST.has(raw.toLowerCase())) return null;
  const cleaned = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  userName = cleaned;
  return cleaned;
}

function fallback(): string[] {
  const response = FALLBACK_RESPONSES[fallbackIndex % FALLBACK_RESPONSES.length];
  fallbackIndex++;
  return response;
}

/** Exposed for tests — wipes any state the responder holds between turns. */
export function resetChatbotState(): void {
  userName = null;
  sessionId = null;
  fallbackIndex = 0;
}

/**
 * Produce a reply for a user message in chatbot mode. Name capture resolves
 * synchronously; everything else hits the Worker AI proxy.
 */
export async function chatbotRespond(input: string): Promise<string[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const captured = tryCaptureName(trimmed);
  if (captured) {
    const lines = [
      '',
      `  Nice to meet you, ${captured}.`,
      '  I\'ll try to remember that. (Memory resets on page reload — sorry.)',
      '  "People are friends, not food." — Bruce the Shark, Finding Nemo.',
      '',
    ];
    return lines;
  }

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: trimmed,
        // Sent every turn rather than once: the worker stores it on the
        // session, so repeats are idempotent, and a turn lost to a rate limit
        // or a network blip can't strand the name outside the session.
        name: userName ?? undefined,
        sessionId: sessionId ?? undefined,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | { lines?: string[]; sessionId?: string }
      | null;
    if (!data || !Array.isArray(data.lines)) {
      return fallback();
    }

    // Both 200 and 429 return { lines } shaped bodies — render either.
    // A sessionId only rides along when the worker actually stored the turn.
    if (typeof data.sessionId === 'string') {
      sessionId = data.sessionId;
    }
    return data.lines;
  } catch {
    return fallback();
  }
}
