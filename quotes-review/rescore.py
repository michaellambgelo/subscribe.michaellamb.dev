"""Second-pass scoring. The first pass over-rewarded '...' which surfaced
trailing-off mid-conversation dialogue rather than self-contained quotes."""
import json, re

# Broader than profanity: material that reads badly stripped of episode context.
SENSITIVE = re.compile(r'\b(fuck|shit|bitch|slut|penis|vagina|boob|dick|whore|sex|sexual|'
  r'chlamydia|venereal|nipple|porn|masturbat|orgasm|erection|condom|testicl|scrotum|'
  r'anal|rape|nigg|fag|retard|gay|lesbian|transgender|tranny|queer|racist|racism|'
  r'suicide|kill myself|molest|pedophil|abortion|nazi|hitler|jew|muslim|islam|'
  r'illegal alien|deport|fat|obese|midget|dwarf|crippl|spastic|autis)', re.I)

OPENER = re.compile(r'^(yeah|yes|no|nope|well|okay|ok|oh|uh+|um+|hey|hi|hello|sure|right|'
  r'what|wait|so|and|but|because|thanks|thank you|i mean|actually|look|listen)\b[,.! ]', re.I)
# Aphorism / declaration shapes that survive out of context.
APHORISM = re.compile(r'\b(never|always|the key to|there are two|nothing|everyone|everybody|'
  r'anyone|anybody|the only thing|is not|are not|I don\'t|I do not|I am|I\'m a|'
  r'you should|you have to|people|life|the best|the worst|means|scientifically|'
  r'literally|acceptable|proven|rule|fact)\b', re.I)
OUTWARD = re.compile(r'^(this|that|these|those|it|he|she|they|there)\b', re.I)

def score(r):
    q = r['q']; n = len(q)
    if n < 35 or n > 210: return -1
    if q.endswith(('?', ',', ':', ';')): return -1
    if not q[0].isupper(): return -1
    if q.count('...') >= 2: return -1          # fragmented delivery
    if re.match(r'^[A-Z][a-z]+[,!]', q): return -1   # "Leslie, ..." direct address
    s = 0
    if 45 <= n <= 165: s += 3
    elif n < 45: s += 1
    if not OPENER.match(q): s += 3
    if not OUTWARD.match(q): s += 2
    if APHORISM.search(q): s += 3
    if q.endswith(('.', '!')): s += 1
    if re.search(r"\b(I|my|me|I'm|I've)\b", q): s += 1
    # penalise dependence on other named characters
    names = len(re.findall(r'\b[A-Z][a-z]{2,}\b', q[1:]))
    s -= min(names, 3)
    return s

rows = json.load(open('parsed.json'))
for r in rows:
    r['score2'] = score(r)
    r['sensitive'] = bool(SENSITIVE.search(r['q']))
json.dump(rows, open('parsed.json','w'), indent=1)
shows = ['Parks and Recreation','The Office','Community','Arrested Development','The Good Place']
print(f"{'show':24} {'lines':>6} {'>=11':>6} {'>=9':>6} {'flagged':>8}")
for sh in shows:
    rs=[r for r in rows if r['show']==sh]
    ok=[r for r in rs if not r['sensitive']]
    print(f"{sh:24} {len(rs):>6} {sum(1 for r in ok if r['score2']>=11):>6} "
          f"{sum(1 for r in ok if r['score2']>=9):>6} {sum(1 for r in rs if r['sensitive']):>8}")
