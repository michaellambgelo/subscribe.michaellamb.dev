// ─────────────────────────────────────────────────────────────────────────────
// Server-side chat sessions.
//
// The transcript lives in KV, never in the request body. Assistant turns are
// written by the worker and only by the worker, so a caller can't forge the
// model's side of the conversation to talk its way past the system prompt.
//
// Stored in the existing RATE_LIMIT namespace under a `sess:` prefix — the
// rate limiter owns `rl:`, so the two never collide.
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  /** Display name the user volunteered, if any. Captured in-browser. */
  name?: string;
  /** Rolling transcript, oldest first, capped at MAX_SESSION_TURNS entries. */
  turns: SessionTurn[];
}

const KEY_PREFIX = 'sess:';

/** Sessions evaporate an hour after their last write. */
export const SESSION_TTL_SECONDS = 3600;

/** Transcript entries retained, matching the old client-side history cap. */
export const MAX_SESSION_TURNS = 6;

/** Per-turn content cap, mirroring the input cap in the request handler. */
const MAX_TURN_LEN = 500;

/** Display names are short by policy and single-line by necessity. */
const MAX_NAME_LEN = 40;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True only for a canonical v1–v5 UUID. Anything client-supplied is checked
 * with this *before* it is concatenated into a KV key — an unvalidated id is
 * its own injection problem, independent of the transcript.
 */
export function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

/** Mint a fresh session id. */
export function newSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Normalize a client-supplied display name: strip control characters and
 * newlines (the name is spliced into the system prompt, so a smuggled newline
 * is a second-order injection), collapse whitespace, cap length. Returns
 * undefined for anything that doesn't survive.
 */
export function sanitizeName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  // eslint-disable-next-line no-control-regex
  const flattened = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return flattened.slice(0, MAX_NAME_LEN).trim() || undefined;
}

/**
 * Read a stored session. Returns null when the id is unknown, expired, or the
 * stored blob no longer parses into the expected shape — callers treat all
 * three the same way and mint a fresh session.
 */
export async function loadSession(kv: KVNamespace, id: string): Promise<Session | null> {
  if (!isValidSessionId(id)) return null;

  let parsed: unknown;
  try {
    parsed = await kv.get(`${KEY_PREFIX}${id}`, 'json');
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const { name, turns } = parsed as Partial<Session>;
  const clean: SessionTurn[] = [];
  if (Array.isArray(turns)) {
    for (const turn of turns) {
      if (typeof turn !== 'object' || turn === null) continue;
      const { role, content } = turn as Partial<SessionTurn>;
      if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
        clean.push({ role, content: content.slice(0, MAX_TURN_LEN) });
      }
    }
  }
  return { name: sanitizeName(name), turns: clean.slice(-MAX_SESSION_TURNS) };
}

/** Persist a session, refreshing its one-hour TTL. */
export async function saveSession(kv: KVNamespace, id: string, session: Session): Promise<void> {
  if (!isValidSessionId(id)) return;
  const trimmed: Session = {
    name: session.name,
    turns: session.turns.slice(-MAX_SESSION_TURNS),
  };
  await kv.put(`${KEY_PREFIX}${id}`, JSON.stringify(trimmed), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

/**
 * Append turns to a session, returning a new record capped at
 * MAX_SESSION_TURNS. The original is left alone.
 */
export function appendTurns(session: Session, ...turns: SessionTurn[]): Session {
  const next = [...session.turns];
  for (const turn of turns) {
    next.push({ role: turn.role, content: turn.content.slice(0, MAX_TURN_LEN) });
  }
  return { name: session.name, turns: next.slice(-MAX_SESSION_TURNS) };
}
