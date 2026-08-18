import json, re
from collections import defaultdict
rows = json.load(open('candidates.json'))
SLUG = {'Parks and Recreation':'parks-and-recreation','The Office':'the-office',
 'Community':'community','Arrested Development':'arrested-development',
 'The Good Place':'the-good-place'}
BADGE = {'wikiquote':'sourced','wikiquote-verified':'sourced + you ruled it','michael-ruled':'YOUR RULING — unconfirmed at source'}

for show, slug in SLUG.items():
    rs=[r for r in rows if r['show']==show]
    rs.sort(key=lambda r:(r.get('who',''), r['q']))
    L=[f"# {show}",'',
       f"{len(rs)} entries. Reply with the numbers you want changed or cut; silence = confirmed.",'',
       "`sourced` = pulled from Wikiquote this session. `YOUR RULING — unconfirmed at source`",
       "= you gave it to me and Wikiquote does not corroborate it, so it needs your eye.",'',
       "Source: Wikiquote (CC BY-SA). Episode codes are season.episode.",'','---','']
    for i,r in enumerate(rs,1):
        L.append(f"**{i}.** {r['q']}" if r.get('kind')!='definition'
                 else f"**{i}.** **{r['q']}** *(n.)* — {r['definition']}")
        bits=[f"— **{r.get('who','?')}**"]
        if r.get('episode'): bits.append(f"[{r['episode']}]")
        if r.get('episodeName'): bits.append(f"*{r['episodeName']}*")
        L.append('  '+' '.join(bits))
        L.append(f"  `{BADGE[r['provenance']]}`  ·  tags: {', '.join(r.get('tags',[])) or '—'}")
        if r.get('setup'): L.append(f"  setup: {r['setup']}")
        if r.get('note'): L.append(f"  ⚠ {r['note']}")
        L.append('')
    open(f"{slug}.md",'w').write('\n'.join(L))
    print(f"  wrote {slug}.md  ({len(rs)} entries)")

unconf=[r for r in rows if r['provenance']=='michael-ruled']
L=['# Quote bank review','',
 f"**{len(rows)} entries** across five shows, in `candidates.json` (machine-readable) and",
 "per-show markdown files (for reading).",'',
 '## Files','',
 '| File | Purpose |','|---|---|',
 '| `candidates.json` | the bank; becomes `worker/src/quotes.ts` |',
 '| `<show>.md` | numbered, readable, for your rulings |',
 '| `sources.json` | which Wikiquote pages were fetched, with URLs |',
 '| `raw/` | fetched page text, so nothing needs re-fetching |',
 '| `fetch.py` `parse.py` `rescore.py` `select.py` `merge.py` `report.py` | the pipeline, re-runnable |',
 '',
 '## How entries got here','',
 '| Provenance | Count | Means |','|---|---|---|',
 f"| `wikiquote` | {sum(1 for r in rows if r['provenance']=='wikiquote')} | pulled from Wikiquote this session |",
 f"| `wikiquote-verified` | {sum(1 for r in rows if r['provenance']=='wikiquote-verified')} | you ruled on it AND Wikiquote corroborates |",
 f"| `michael-ruled` | {len(unconf)} | you gave it to me, Wikiquote does not corroborate |",
 '',
 '## Needs your eye first','',
 f"These {len(unconf)} are the only entries with no independent source. Most are catchphrases",
 "and running gags that a transcript would not capture as a standalone line, so absence",
 "is expected — but they are the ones where a wrong attribution would survive.",'']
for r in sorted(unconf,key=lambda r:(r['show'],r['q'])):
    L.append(f"- *{r['show']}* — \"{r['q']}\" — **{r.get('who','?')}**"
             + (f"  ⚠ {r['note']}" if r.get('note') else ''))
L += ['','## Funnel','',
 '| Stage | Count |','|---|---|','| Wikiquote pages fetched | 24 |',
 '| Speaker-attributed lines parsed | 6,348 |','| Passed scoring + tone screen | 221 |',
 '| Selected editorially | 84 |','| Your prior rulings merged | 45 |',
 f"| **Bank total** | **{len(rows)}** |",'',
 'Roughly a 1.3% selection rate off raw dialogue. Wikiquote holds transcripts, not',
 'curated quotes, so most lines are conversational glue.','',
 '## Licence','',
 'Wikiquote text is CC BY-SA. Attribution belongs in the repo and, if quotes are',
 'ever displayed in bulk, on the page. IMDB was deliberately not scraped — its terms',
 'forbid it, whereas Wikiquote\'s licence permits reuse.','']
open('README.md','w').write('\n'.join(L))
print(f"  wrote README.md")
print(f"\nunconfirmed (need your eye): {len(unconf)}")
