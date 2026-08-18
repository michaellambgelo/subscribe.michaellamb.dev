/**
 * Deterministic easter eggs.
 *
 * These fire before the model is consulted: exact input, exact reply, no tokens
 * spent and no temperature involved. That matters because the site's own copy
 * invites visitors to type these lines — a few-shot example at temperature 0.85
 * answers them maybe half the time, which makes the invitation a lie.
 */
const TRIGGERS: Array<{ match: string[]; lines: string[] }> = [
  { match: ['her', 'her?'], lines: ['Egg?'] },
  { match: ['steve holt'], lines: ['STEVE HOLT! \\o/'] },
  {
    match: ["li'l sebastian", 'lil sebastian', 'little sebastian'],
    lines: ["You're 5,000 candles in the wind. 🕯️", 'We will never forget you.'],
  },
  {
    match: ['banana', 'banana stand', 'money in the banana stand'],
    lines: ['"There\'s always money in the banana stand." — George Bluth Sr.'],
  },
  { match: ['cool cool cool', 'cool. cool cool cool.'], lines: ['Cool. Cool cool cool.'] },
  { match: ['come on'], lines: ['COME ON!'] },
  {
    match: ['bears beets', 'bears beets battlestar galactica', 'bears. beets. battlestar galactica.'],
    lines: ['Bears. Beets. Battlestar Galactica.', '— Jim Halpert, being Dwight Schrute.'],
  },
  { match: ['treat yo self', 'treat yourself'], lines: ['Treat yo self.', '— Tom Haverford and Donna Meagle.'] },
  { match: ['pop pop'], lines: ['Pop pop!'] },
  { match: ['six seasons and a movie'], lines: ['SIX SEASONS AND A MOVIE.'] },
  { match: ['streets ahead'], lines: ['Streets ahead.', "If you have to ask, you're streets behind."] },
  { match: ['ya basic', 'ya burnt'], lines: ['Ya basic.'] },
  { match: ['bortles'], lines: ['BORTLES!'] },
  { match: ["that's what she said", 'thats what she said'], lines: ["That's what she said.", '— Michael Scott, obviously.'] },
  { match: ['holy forking shirtballs', 'forking shirtballs'], lines: ['Holy forking shirtballs.'] },
  { match: ['i just blue myself', 'blue myself'], lines: ['"I just blue myself." — Tobias Fünke.', 'There it is.'] },
];

const INDEX: Map<string, string[]> = new Map();
for (const t of TRIGGERS) {
  for (const m of t.match) INDEX.set(m, t.lines);
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!,?]+$/g, '')
    .trim();
}

/**
 * Exact-match lookup. Returns terminal-shaped lines, or null to fall through to
 * the model. Deliberately exact: a fuzzy match here would hijack ordinary
 * sentences that merely contain a trigger word.
 */
export function checkTrigger(input: string): string[] | null {
  const hit = INDEX.get(normalize(input));
  if (!hit) return null;
  return ['', ...hit.map((l) => `  ${l}`), ''];
}

export const TRIGGER_COUNT = INDEX.size;
