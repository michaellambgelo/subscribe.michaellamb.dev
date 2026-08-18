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

import { FALLBACK_QUOTES, GREETING_QUOTES, type BankedQuote } from './banked-quotes';

// In dev, Vite proxies /api/* to the local `wrangler dev` worker.
// In prod, set VITE_CHAT_ENDPOINT in .env.production to the deployed worker URL
// (e.g. https://subscribe-chatbot.<account>.workers.dev/chat).
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT ?? '/api/chat';

let userName: string | null = null;
let sessionId: string | null = null;

/**
 * Offline fallbacks. Every quote here comes from the bank via
 * `banked-quotes.ts` — these run when the Worker is unreachable, so the
 * server-side attribution validator never sees them and cannot correct a
 * wrong one. Previously these were hand-written and drifted: one credited
 * GOB's line to Michael Bluth, and one quoted Finding Nemo, which is not a
 * show this bot claims to know.
 */
function quoteLine(x: BankedQuote): string {
  return `  "${x.q}" — ${x.who}, ${x.show}`;
}

const FALLBACK_INTROS: string[] = [
  '  I lost the thread. Network hiccup, probably.',
  "  The worker didn't answer. Cool. Cool cool cool.",
  '  No response from the chat endpoint.',
  '  Something on my end fell over.',
];

let fallbackIndex = 0;

// Only unambiguous introductions. A bare "i'm X" / "i am X" was also matched
// once, which meant "i'm anxious" greeted the user as Anxious — the mis-fire
// landed hardest exactly when someone was saying something vulnerable. A
// blocklist could never cover every adjective, so those two patterns are gone;
// failing to catch a name is a far cheaper mistake than inventing one.
const NAME_CAPTURE = /\b(?:my name is|i am called|call me|this is)\s+([a-z][a-z\-']{1,20})\b/i;
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
  const i = fallbackIndex++;
  return [
    '',
    FALLBACK_INTROS[i % FALLBACK_INTROS.length],
    quoteLine(FALLBACK_QUOTES[i % FALLBACK_QUOTES.length]),
    '  Try again in a sec.',
    '',
  ];
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
      quoteLine(GREETING_QUOTES[0]),
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
