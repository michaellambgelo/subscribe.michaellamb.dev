"""Fix verification (match against parsed speaker lines, not raw text) and
assign retrieval tags to every entry."""
import json, re

def norm(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

parsed = json.load(open('parsed.json'))
index = []
for p in parsed:
    index.append((norm(p['q']), p['who'], p))

def verify(q, who):
    n = norm(q)
    if len(n) < 6: return None
    exact = [p for (pn, pw, p) in index if pn == n and pw == who]
    if exact: return exact[0]
    # substring, but only when long enough that a match is meaningful
    if len(n) >= 20:
        sub = [p for (pn, pw, p) in index if n in pn and pw == who]
        if sub: return sub[0]
    return None

# ---- tag vocabulary: theme regex -> mood tags a user's message might hit
MOODS = [
 (r'\b(cry|crying|cried|tears|sad|weep)\b', ['sad','crying','emotion']),
 (r'\b(die|died|dying|death|dead|kill)\b', ['death','mortality','dark']),
 (r'\b(love|loved|like you|adore)\b', ['love','affection','romance']),
 (r'\b(friend|friendship|buddy)\b', ['friendship','loyalty']),
 (r'\b(work|job|boss|manager|office|career|employee)\b', ['work','job','career']),
 (r'\b(money|budget|bankrupt|rich|capital|pay|paid|cost|dollar)\b', ['money','finance']),
 (r'\b(food|eat|eating|bacon|egg|breakfast|burger|hamburger|meat|meal|candy|sandwich)\b', ['food','hunger','eating']),
 (r'\b(drink|alcohol|wine|beer|drunk|whisky)\b', ['drinking','alcohol']),
 (r'\b(mistake|wrong|error|fail|failure|worst|screwed)\b', ['mistake','failure','regret']),
 (r'\b(smart|stupid|idiot|dumb|genius|intelligen)\b', ['intelligence','insult']),
 (r'\b(sick|ill|flu|pain|hurt|doctor|nurse|hospital|cancer)\b', ['illness','pain','health']),
 (r'\b(sleep|tired|exhaust|nap)\b', ['tired','sleep']),
 (r'\b(lie|lying|lied|liar|secret|truth|honest)\b', ['honesty','lying','secrets']),
 (r'\b(luck|lucky|chance|dice|risk)\b', ['luck','risk','chance']),
 (r'\b(time|forever|never|always|year|day|morning)\b', ['time']),
 (r'\b(tv|television|movie|film|show|watch)\b', ['television','film','media']),
 (r'\b(computer|internet|wikipedia|phone|second life|virtual|game)\b', ['technology','internet']),
 (r'\b(compliment|beautiful|proud|amazing|best)\b', ['praise','compliment']),
 (r'\b(hate|hated|contempt|resent|enrag|angry|mad)\b', ['anger','contempt']),
 (r'\b(help|helped|advice|support)\b', ['help','advice']),
 (r'\b(government|politic|campaign|elect|vote|council)\b', ['politics','government']),
 (r'\b(god|saint|heaven|hell|moral|ethic|philosoph|kant)\b', ['philosophy','morality']),
 (r'\b(scared|afraid|fear|frightening|terrif)\b', ['fear']),
 (r'\b(alone|lonely|nobody|no one)\b', ['loneliness']),
 (r'\b(prison|jail|cop|police|crime|law|fbi)\b', ['crime','law']),
 (r'\b(library|book|read|reading|writing|wrote)\b', ['books','reading']),
 (r'\b(fish|fishing|hunt|outdoors|camp)\b', ['outdoors','hobbies']),
 (r'\b(party|celebrat|birthday|holiday|christmas|thanksgiving)\b', ['celebration','holiday']),
 (r'\b(confus|understand|know|thought|realiz)\b', ['confusion','understanding']),
 (r'\b(bee|crow|dog|cat|horse|animal|pony|bear|zombie)\b', ['animals']),
]
STOP = set('''a an the and or but if then than that this these those there here is are was were
be been being am i i'm i've you your you're he she it we they them him her his hers its our
of to in on at for with from by as not no yes so do does did done have has had will would
can could should may might must just very really too also only own same all any both each
few more most other some such about into over under again once what which who whom whose when
where why how me my mine us ours yours their theirs get got go going gone say said says know
knew like want got one two three now new old first last well okay ok oh uh um dont don't im
i'll it's thats that's youre we're they're gonna wanna cause because'''.split())

def keywords(q, k=6):
    ws = re.findall(r"[a-z']{4,}", q.lower())
    seen, out = set(), []
    for w in ws:
        w = w.strip("'")
        if w in STOP or w in seen: continue
        seen.add(w); out.append(w)
        if len(out) >= k: break
    return out

def moods(q):
    t = []
    for rx, tags in MOODS:
        if re.search(rx, q, re.I):
            for g in tags:
                if g not in t: t.append(g)
    return t

rows = json.load(open('candidates.json'))
fixed = 0
for r in rows:
    if r['provenance'] == 'michael-ruled':
        v = verify(r['q'], r.get('who',''))
        if v:
            r['provenance'] = 'wikiquote-verified'
            r['source'] = v['source']
            if v.get('episode'): r['episode'] = v['episode']
            if v.get('episodeName'): r['episodeName'] = v['episodeName']
            fixed += 1
    base = r.get('tags') or []
    text = r['q'] + ' ' + r.get('definition','')
    merged = list(dict.fromkeys(base + moods(text) + keywords(text)))
    r['tags'] = merged[:10]
json.dump(rows, open('candidates.json','w'), indent=1)
from collections import Counter
print(f"verification fixed by matching parsed lines: +{fixed}")
print("untagged remaining:", sum(1 for r in rows if not r['tags']))
print("avg tags/entry:", round(sum(len(r['tags']) for r in rows)/len(rows),1))
for k,v in sorted(Counter(r['provenance'] for r in rows).items()): print(f"  {k:22} {v:>3}")
