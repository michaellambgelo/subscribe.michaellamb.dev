const RSS_URL =
  'https://raw.githubusercontent.com/michaellambgelo/letterboxd-viewer/main/data/cleaned_rss.xml';

interface FilmEntry {
  title: string;
  year: string;
  rating: number | null;
  watchedDate: string;
  review: string;
  link: string;
}

// Module-level cache — persists across command invocations without re-fetching
let cachedFilms: FilmEntry[] | null = null;

function starsFromRating(rating: number | null): string {
  if (rating === null) return '(unrated)';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return '\u2605'.repeat(full) + (half ? '\u00bd' : '');
}

const LETTERBOXD_NS = 'https://letterboxd.com';

function getText(item: Element, tagName: string): string {
  // The XML uses inline namespace declarations (xmlns:ns0="https://letterboxd.com"),
  // so getElementsByTagNameNS with the URI is the only reliable lookup.
  const el = item.getElementsByTagNameNS(LETTERBOXD_NS, tagName)[0];
  return el?.textContent?.trim() ?? '';
}

function stripHtml(raw: string): string {
  const div = document.createElement('div');
  div.innerHTML = raw;
  return div.textContent?.trim() ?? '';
}

async function loadFilms(): Promise<FilmEntry[]> {
  if (cachedFilms) return cachedFilms;

  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const items = Array.from(doc.getElementsByTagName('item'));

  cachedFilms = items
    .map((item): FilmEntry | null => {
      const filmTitle = getText(item, 'filmTitle');
      if (!filmTitle) return null;
      const ratingRaw = getText(item, 'memberRating');
      const descRaw = getText(item, 'description') || (item.getElementsByTagName('description')[0]?.textContent ?? '');
      return {
        title: filmTitle,
        year: getText(item, 'filmYear'),
        rating: ratingRaw ? parseFloat(ratingRaw) : null,
        watchedDate: getText(item, 'watchedDate'),
        review: stripHtml(descRaw ?? '').slice(0, 120),
        link: item.getElementsByTagName('link')[0]?.textContent?.trim() ?? '',
      };
    })
    .filter((f): f is FilmEntry => f !== null);

  return cachedFilms;
}

export async function filmCommand(): Promise<string[]> {
  let films: FilmEntry[];
  try {
    films = await loadFilms();
  } catch {
    return ['', '  Could not fetch film data. Check your connection.', ''];
  }

  if (films.length === 0) {
    return ['', '  No films found in the diary.', ''];
  }

  const film = films[Math.floor(Math.random() * films.length)];
  const stars = starsFromRating(film.rating);
  const lines = [
    '',
    `  ${film.title}${film.year ? ` (${film.year})` : ''}`,
    `  Watched: ${film.watchedDate}  \u00b7  Rating: ${stars}`,
  ];
  if (film.review) {
    lines.push(`  "${film.review}"`);
  }
  if (film.link) {
    lines.push(`  \u2192 ${film.link}`);
  }
  lines.push('');
  return lines;
}
