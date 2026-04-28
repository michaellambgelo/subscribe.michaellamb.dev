import { buildSystemPrompt, FEW_SHOT } from './system-prompt';
import { checkRateLimit } from './rate-limit';
import { formatLines } from './parse';

interface Env {
  AI: Ai;
  RATE_LIMIT: KVNamespace;
  ALLOWED_ORIGINS: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  input: string;
  name?: string;
  history?: ChatMessage[];
}

const MAX_INPUT_LEN = 500;
const MAX_HISTORY_TURNS = 6;
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

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  const clean: ChatMessage[] = [];
  for (const m of history) {
    if (typeof m !== 'object' || m === null) continue;
    const { role, content } = m as Partial<ChatMessage>;
    if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
      clean.push({ role, content: content.slice(0, MAX_INPUT_LEN) });
    }
  }
  return clean.slice(-MAX_HISTORY_TURNS);
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

  const name = typeof body.name === 'string' ? body.name.slice(0, 40).trim() || undefined : undefined;
  const history = sanitizeHistory(body.history);

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

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: buildSystemPrompt(name) },
    ...FEW_SHOT,
    ...history,
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

  return jsonResponse({ lines: formatLines(text) }, 200, cors);
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
