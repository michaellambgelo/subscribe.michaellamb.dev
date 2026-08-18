import { buildSystemPrompt, FEW_SHOT } from './system-prompt';
import { checkTrigger } from './triggers';
import { formatForPrompt, retrieve } from './retrieve';
import { checkRateLimit } from './rate-limit';
import { formatLines } from './parse';
import {
  appendTurns,
  isValidSessionId,
  loadSession,
  newSessionId,
  sanitizeName,
  saveSession,
  type Session,
} from './session';

interface Env {
  AI: Ai;
  RATE_LIMIT: KVNamespace;
  ALLOWED_ORIGINS: string;
}

interface ChatRequest {
  input: string;
  name?: string;
  sessionId?: string;
  // NOTE: older clients also send `history`. It is deliberately absent from
  // this interface and never read — the transcript is server-side only.
}

const MAX_INPUT_LEN = 500;
const RATE_LIMIT_PER_HOUR = 50;
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allowedOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function handleChat(
  req: Request,
  env: Env,
  ip: string,
  cors: Record<string, string>,
): Promise<Response> {
  let body: ChatRequest;
  try {
    body = await req.json<ChatRequest>();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, cors);
  }

  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (!input) return jsonResponse({ error: 'Empty input' }, 400, cors);
  if (input.length > MAX_INPUT_LEN) {
    return jsonResponse({ error: 'Input too long' }, 413, cors);
  }

  const rl = await checkRateLimit(env.RATE_LIMIT, ip, RATE_LIMIT_PER_HOUR);
  if (!rl.ok) {
    const minutes = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
    return jsonResponse(
      {
        lines: [
          '',
          '  Whoa. You\'ve hit the hourly message limit.',
          '  "I have had a long day." — everyone, always.',
          `  Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          '',
        ],
      },
      429,
      { ...cors, 'Retry-After': String(rl.retryAfterSeconds) },
    );
  }

  // Deterministic easter eggs answer before the model is consulted. The site's
  // copy invites visitors to type these lines, so they must fire every time
  // rather than depending on the model following a few-shot at temperature.
  const trigger = checkTrigger(input);
  if (trigger) {
    return jsonResponse({ lines: trigger }, 200, cors);
  }

  // Resolve the session. A malformed id is treated as absent; a well-formed
  // but unknown or expired one gets a fresh id rather than being adopted, so
  // a caller can't choose their own KV key. Either way the turn proceeds.
  const requestedId = isValidSessionId(body.sessionId) ? body.sessionId : null;
  const existing = requestedId ? await loadSession(env.RATE_LIMIT, requestedId) : null;
  const sessionId = existing && requestedId ? requestedId : newSessionId();
  const session: Session = existing ?? { turns: [] };

  // The name is captured in-browser and echoed to us; it lives in the session
  // from here on, so later turns don't have to be trusted for it.
  const suppliedName = sanitizeName(body.name);
  if (suppliedName) session.name = suppliedName;

  // Ground the turn in real, sourced quotes rather than letting the model
  // improvise one — improvised quotes come back misattributed.
  const quoteBlock = formatForPrompt(retrieve(input));

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: buildSystemPrompt(session.name, quoteBlock) },
    ...FEW_SHOT,
    ...session.turns,
    { role: 'user', content: input },
  ];

  let text: string;
  try {
    const result = await env.AI.run(MODEL, {
      messages,
      max_tokens: 256,
      temperature: 0.85,
    });
    if (result && typeof result === 'object' && 'response' in result) {
      text = String((result as { response: unknown }).response ?? '');
    } else {
      text = String(result ?? '');
    }
  } catch (err) {
    console.error('Workers AI error:', err);
    return jsonResponse(
      {
        lines: [
          '',
          '  The model is napping.',
          '  "I\'m not superstitious, but I am a little stitious." — Michael Scott.',
          '  Try again in a moment.',
          '',
        ],
      },
      502,
      cors,
    );
  }

  const lines = formatLines(text);

  // Only the worker ever writes an assistant turn.
  const updated = appendTurns(
    session,
    { role: 'user', content: input },
    { role: 'assistant', content: lines.map((l) => l.trim()).filter(Boolean).join(' ') },
  );
  await saveSession(env.RATE_LIMIT, sessionId, updated);

  return jsonResponse({ lines, sessionId }, 200, cors);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get('Origin');
    const cors = corsHeaders(origin, allowed);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/chat') {
      const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
      return handleChat(req, env, ip, cors);
    }

    if (req.method === 'GET') {
      return Response.redirect('https://subscribe.michaellamb.dev', 302);
    }

    return jsonResponse({ error: 'Not found' }, 404, cors);
  },
} satisfies ExportedHandler<Env>;
