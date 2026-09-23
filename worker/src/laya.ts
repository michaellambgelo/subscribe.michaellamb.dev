/**
 * Which sitcom, if any, a visitor's message is about -- decided by Laya.
 *
 * Laya is a small decision model on node0 (github.com/michaellambgelo/laya),
 * served at ai.michaellamb.dev behind a Cloudflare Access service-token policy
 * and a bearer token. The `show-detect` checkpoint is fine-tuned for exactly
 * this question over the five shows in the quote bank; zero-shot, the base
 * model answered "none" to 43 of 44 test messages.
 *
 * The answer only adds one line to the system prompt. Everything fails open:
 * no secrets, a timeout, node0 asleep, or any error means no line and the
 * turn proceeds exactly as it did before Laya existed.
 */

export const SHOWS = {
  arrested_development: 'Arrested Development',
  community: 'Community',
  parks_and_rec: 'Parks and Recreation',
  the_good_place: 'The Good Place',
  the_office: 'The Office',
} as const;

export type ShowKey = keyof typeof SHOWS;

export interface LayaEnv {
  LAYA_URL?: string;
  LAYA_TOKEN?: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

const DEFAULT_URL = 'https://ai.michaellamb.dev/decide';
/** node0 is a desktop on home internet; a reply slower than this is not worth waiting for. */
export const LAYA_TIMEOUT_MS = 800;

export async function detectShow(
  env: LayaEnv,
  input: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = LAYA_TIMEOUT_MS,
): Promise<ShowKey | null> {
  if (!env.LAYA_TOKEN) return null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.LAYA_TOKEN}`,
  };
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
    headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
  }
  try {
    const res = await fetchImpl(env.LAYA_URL || DEFAULT_URL, {
      method: 'POST',
      headers,
      // The server fills in the question the checkpoint was trained on, and
      // refuses any other wording, so none is sent here.
      body: JSON.stringify({
        state: input,
        caller: 'subscribe',
        model: 'show-detect',
        questions: { show: {} },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answers?: { show?: { choice?: string } } };
    const choice = data.answers?.show?.choice;
    return choice && choice in SHOWS ? (choice as ShowKey) : null;
  } catch {
    return null;
  }
}
