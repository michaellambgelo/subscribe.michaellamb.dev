import { QUOTES, type Quote } from './quotes';

/**
 * Words too common to carry retrieval signal. Deliberately short — the scoring
 * already weights tag hits far above body hits, so a stray common word costs
 * little, whereas an over-aggressive stoplist silently drops real matches.
 */
const STOP = new Set([
  'the', 'and', 'but', 'for', 'you', 'your', 'are', 'was', 'were', 'not', 'with',
  'that', 'this', 'have', 'has', 'had', 'from', 'they', 'them', 'their', 'what',
  'when', 'where', 'why', 'how', 'who', 'its', 'it', 'about', 'just', 'like',
  'can', 'will', 'would', 'should', 'could', 'get', 'got', 'all', 'any', 'some',
  'more', 'most', 'very', 'really', 'there', 'here', 'been', 'does', 'did',
  // Particles and fillers that ride along on phrasal verbs ("goof off", "piss
  // off") and matched unrelated quotes in testing.
  'off', 'out', 'now', 'one', 'two', 'own', 'way', 'thing', 'things', 'says',
  'say', 'said', 'going', 'gonna', 'want', 'know', 'think', 'make', 'made',
]);

/**
 * Maps how people actually write to the mood tags the bank carries. Pure token
 * matching misses the common case — someone types "awful", the bank says "sad",
 * and nothing fires. Expansion is one-way (input -> tags) so the bank stays the
 * single source of truth for what a quote is about.
 */
const SYNONYMS: Record<string, string[]> = {
  awful: ['sad', 'bad'], terrible: ['sad', 'bad'], horrible: ['sad', 'bad'],
  miserable: ['sad'], depressed: ['sad'], down: ['sad'], upset: ['sad'],
  bummed: ['sad'], heartbroken: ['sad', 'love'], grief: ['sad', 'death'],
  fired: ['work', 'job', 'failure'], laid: ['work', 'job', 'failure'],
  unemployed: ['work', 'job'], quit: ['work', 'job'], boss: ['work'],
  broke: ['money'], poor: ['money'], salary: ['money'], rent: ['money'],
  hungry: ['food', 'hunger'], starving: ['food', 'hunger'], dinner: ['food'],
  lunch: ['food'], breakfast: ['food'], snack: ['food'],
  exhausted: ['tired'], sleepy: ['tired'], burnout: ['tired', 'work'],
  anxious: ['fear'], scared: ['fear'], nervous: ['fear'], worried: ['fear'],
  angry: ['anger'], furious: ['anger'], annoyed: ['anger'], mad: ['anger'],
  lonely: ['loneliness'], alone: ['loneliness'],
  dating: ['love', 'romance'], girlfriend: ['love'], boyfriend: ['love'],
  married: ['love'], divorce: ['love'], crush: ['love'],
  dumb: ['intelligence'], smart: ['intelligence'], clever: ['intelligence'],
  screwed: ['mistake', 'failure'], messed: ['mistake'], ruined: ['mistake'],
  sorry: ['mistake', 'regret'], oops: ['mistake'],
  bored: ['boredom'], boring: ['boredom'],
  advice: ['advice', 'help'], stuck: ['help', 'confusion'],
  sick: ['illness'], flu: ['illness'], covid: ['illness'], hurts: ['pain'],
  film: ['film', 'media'], movie: ['film', 'media'], watching: ['television'],
  code: ['work', 'technology'], coding: ['work', 'technology'],
  computer: ['technology'], deploy: ['work', 'technology'],
};

const TAG_WEIGHT = 4;
const BODY_WEIGHT = 1;
/** No more than this many quotes from any one speaker in a single result set. */
const MAX_PER_SPEAKER = 2;

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/'s$/, '').replace(/^'|'$/g, ''))
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/** Loose stem so "crying" matches "cry" and "movies" matches "movie". */
function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/, '');
}

function scoreQuote(q: Quote, want: Set<string>): number {
  let score = 0;
  for (const tag of q.tags) {
    const t = stem(tag.toLowerCase());
    if (want.has(t)) score += TAG_WEIGHT;
  }
  for (const w of tokens(q.q)) {
    if (want.has(stem(w))) score += BODY_WEIGHT;
  }
  return score;
}

/**
 * Pick the quotes most relevant to a user's message.
 *
 * Returns an empty array when nothing scores — the caller should then tell the
 * model it has no quotes for this turn rather than inviting it to improvise one.
 * Ordering is deterministic (score, then bank order) so the same input yields
 * the same prompt, which keeps responses reproducible for tests.
 */
export function retrieve(input: string, limit = 6): Quote[] {
  const raw = tokens(input);
  const want = new Set(raw.map(stem));
  for (const w of raw) {
    for (const syn of SYNONYMS[w] ?? []) want.add(stem(syn));
  }
  if (want.size === 0) return [];

  const scored = QUOTES
    .map((q, i) => ({ q, i, s: scoreQuote(q, want) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => (b.s - a.s) || (a.i - b.i));

  const perSpeaker = new Map<string, number>();
  const out: Quote[] = [];
  for (const { q } of scored) {
    const n = perSpeaker.get(q.who) ?? 0;
    if (n >= MAX_PER_SPEAKER) continue;
    perSpeaker.set(q.who, n + 1);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

/** Render retrieved quotes for the system prompt. */
export function formatForPrompt(quotes: Quote[]): string {
  if (quotes.length === 0) return '';
  return quotes
    .map((q) => {
      if (q.kind === 'definition') {
        return `- "${q.q}" (${q.show}) means: ${q.definition}`;
      }
      const setup = q.setup ? ` [context: ${q.setup}]` : '';
      // Show-level credits already name the show; don't print it twice.
      const credit = q.who === q.show ? q.who : `${q.who}, ${q.show}`;
      return `- "${q.q}" — ${credit}${setup}`;
    })
    .join('\n');
}
