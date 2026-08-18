import { QUOTE_TEXTS } from './quotes';

const MAX_OUTPUT_LINES = 8;

/** Same normalisation used to build QUOTE_TEXTS. */
function normalizeQuote(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * True when the quoted text corresponds to a real bank entry.
 *
 * Containment either way counts as a match: the model legitimately shortens a
 * long line, and a bank entry can be the tail of a longer spoken sentence.
 * Very short fragments are rejected outright — "No." is a substring of half the
 * bank and proves nothing.
 */
function isBankedQuote(text: string): boolean {
  const n = normalizeQuote(text);
  if (n.length < 8) return false;
  if (QUOTE_TEXTS.has(n)) return true;
  for (const known of QUOTE_TEXTS) {
    if (known.includes(n) || n.includes(known)) return true;
  }
  return false;
}

/**
 * Strip attributions the bank cannot vouch for.
 *
 * The prompt tells the model never to invent a quote. This makes that a
 * guarantee rather than a request: any `"…" — Name` whose text is not in the
 * bank loses the ` — Name`, keeping the sentence but removing the false claim
 * about who said it. A wrong attribution is the one failure this whole feature
 * exists to prevent, so it is enforced on the way out, not just asked for.
 */
export function stripInventedAttributions(line: string): string {
  const pattern = /(["“][^"”]{4,}["”])\s*[—–-]+\s*([A-Z][\w.'’]*(?:\s+[A-Z][\w.'’]*){0,3})/g;
  return line.replace(pattern, (whole: string, quoted: string) => {
    const inner = quoted.slice(1, -1);
    return isBankedQuote(inner) ? whole : quoted;
  });
}

/**
 * Normalize raw model output into the `{ lines: string[] }` shape the terminal
 * expects. Re-indents non-empty lines with two spaces and frames the block
 * with a leading and trailing empty line, matching the convention used
 * throughout `src/commands/*`.
 */
export function formatLines(raw: string): string[] {
  const stripped = raw.trim();
  if (!stripped) return ['', '  ...', ''];

  const lines = stripped.split('\n').map((l) => l.replace(/\r$/, '').trim());
  const formatted: string[] = [''];
  for (const line of lines) {
    if (!line) continue;
    formatted.push(`  ${stripInventedAttributions(line)}`);
    if (formatted.length >= MAX_OUTPUT_LINES + 1) break;
  }
  formatted.push('');
  return formatted;
}
