# Quote bank review

**129 entries** across five shows, in `candidates.json` (machine-readable) and
per-show markdown files (for reading).

## Files

| File | Purpose |
|---|---|
| `candidates.json` | the bank; becomes `worker/src/quotes.ts` |
| `<show>.md` | numbered, readable, for your rulings |
| `sources.json` | which Wikiquote pages were fetched, with URLs |
| `raw/` | fetched page text, so nothing needs re-fetching |
| `fetch.py` `parse.py` `rescore.py` `select.py` `merge.py` `report.py` | the pipeline, re-runnable |

## How entries got here

| Provenance | Count | Means |
|---|---|---|
| `wikiquote` | 84 | pulled from Wikiquote this session |
| `wikiquote-verified` | 24 | you ruled on it AND Wikiquote corroborates |
| `michael-ruled` | 21 | you gave it to me, Wikiquote does not corroborate |

## Needs your eye first

These 21 are the only entries with no independent source. Most are catchphrases
and running gags that a transcript would not capture as a standalone line, so absence
is expected — but they are the ones where a wrong attribution would survive.

- *Arrested Development* — "Her?" — **Michael Bluth**
- *Arrested Development* — "I don't know what I expected." — **Michael Bluth**
- *Arrested Development* — "I'm a monster!" — **Buster Bluth**
- *Arrested Development* — "I've made a huge mistake." — **GOB Bluth**
- *Community* — "Britta'd" — **the study group**
- *Community* — "Cool. Cool cool cool." — **Abed Nadir**
- *Community* — "I must've missed that." — **Abed Nadir**
- *Community* — "Pop pop!" — **Magnitude**
- *Community* — "Sounds like a Thanksgiving at my house." — **Troy Barnes**
- *Community* — "The question isn't where, constable, but when." — **The Inspector**  ⚠ Michael-vouched; Inspector Spacetime, the show-within-the-show
- *Community* — "Troy and Abed in the morning!" — **Troy Barnes and Abed Nadir**
- *Community* — "Will it get me through this movie?" — **Shirley Bennett**
- *Parks and Recreation* — "I love you and I like you." — **Leslie Knope and Ben Wyatt**
- *Parks and Recreation* — "I'd wish you the best of luck, but I believe luck is a concept created by the weak to explain their failures." — **Ron Swanson**
- *Parks and Recreation* — "Literally." — **Chris Traeger**
- *Parks and Recreation* — "You're 5,000 candles in the wind." — **Mouse Rat**
- *The Good Place* — "Bortles!" — **Jason Mendoza**
- *The Good Place* — "The wave was just a different way for the water to be, for a little while." — **Chidi Anagonye**
- *The Good Place* — "Ya basic." — **Eleanor Shellstrop**
- *The Office* — "I am Beyoncé, always." — **Michael Scott**
- *The Office* — "The worst thing about prison was the Dementors." — **Michael Scott (as Prison Mike)**

## Funnel

| Stage | Count |
|---|---|
| Wikiquote pages fetched | 24 |
| Speaker-attributed lines parsed | 6,348 |
| Passed scoring + tone screen | 221 |
| Selected editorially | 84 |
| Your prior rulings merged | 45 |
| **Bank total** | **129** |

Roughly a 1.3% selection rate off raw dialogue. Wikiquote holds transcripts, not
curated quotes, so most lines are conversational glue.

## Licence

Wikiquote text is CC BY-SA. Attribution belongs in the repo and, if quotes are
ever displayed in bulk, on the page. IMDB was deliberately not scraped — its terms
forbid it, whereas Wikiquote's licence permits reuse.
