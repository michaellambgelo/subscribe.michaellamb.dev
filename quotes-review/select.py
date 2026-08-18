"""Editorial selection. Indices refer to the shortlist ordering emitted by the
review dump (score2>=11, not sensitive, sorted by who then -score2)."""
import json

KEEP = {
 'Parks and Recreation': [0,1,3,4,5,6,12,13,14,17,23,27,28,29,42,57,59,60,62,65,66,68,71,73,74,75],
 'The Office': [1,5,6,7,8,10,11,12,18,24,25,27,32,35,36,41,45,46],
 'Community': [0,1,2,7,13,14,18,20,21,22,23,30,32,33,35,37],
 'Arrested Development': [0,1,4,5,6,7,9,11],
 'The Good Place': [3,5,7,8,9,12,19,20,21,23,26,29,32,35,36,37],
}
# Trims where the source line carries conversational lead-in.
TRIM = {
 "Here's mine. It's a hamburger, made out of meat, on a bun, with nothing. Add ketchup if you want, I couldn't care less.":
   "It's a hamburger, made out of meat, on a bun, with nothing. Add ketchup if you want, I couldn't care less.",
 "Now if you'll excuse me, there's a hot, spinning cone of meat in that Greek restaurant next door. I don't know what it is, but I'd like to eat the whole thing.":
   "There's a hot, spinning cone of meat in that Greek restaurant next door. I don't know what it is, but I'd like to eat the whole thing.",
 "How much clearer can I say it: \"THERE IS ALWAYS MONEY IN THE BANANA STAND!\"":
   "There's always money in the banana stand.",
}

rows = json.load(open('parsed.json'))
out = []
for show, idxs in KEEP.items():
    rs = [r for r in rows if r['show'] == show and not r['sensitive'] and r['score2'] >= 11]
    rs.sort(key=lambda r: (r['who'], -r['score2']))
    for i in idxs:
        r = dict(rs[i])
        r['q'] = TRIM.get(r['q'], r['q'])
        r['provenance'] = 'wikiquote'
        for k in ('score','score2','tone','sensitive','speaker','sourceTitle'):
            r.pop(k, None)
        out.append(r)
json.dump(out, open('selected.json','w'), indent=1)
from collections import Counter
c = Counter(r['show'] for r in out)
for k,v in c.items(): print(f"{k:24} {v:>3}")
print(f"{'TOTAL NEW':24} {len(out):>3}")
