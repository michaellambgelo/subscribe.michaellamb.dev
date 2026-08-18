"""Parse Wikiquote plaintext extracts into candidate quote entries."""
import json, re, os

CAST = {
 'parks-and-recreation': {'Leslie':'Leslie Knope','Ron':'Ron Swanson','Tom':'Tom Haverford',
   'Ann':'Ann Perkins','April':'April Ludgate','Andy':'Andy Dwyer','Ben':'Ben Wyatt',
   'Chris':'Chris Traeger','Donna':'Donna Meagle','Jerry':'Jerry Gergich',
   'Jean-Ralphio':'Jean-Ralphio Saperstein','Tammy':'Tammy Swanson','Perd':'Perd Hapley'},
 'the-office': {'Michael':'Michael Scott','Dwight':'Dwight Schrute','Jim':'Jim Halpert',
   'Pam':'Pam Beesly','Andy':'Andy Bernard','Kevin':'Kevin Malone','Angela':'Angela Martin',
   'Oscar':'Oscar Martinez','Stanley':'Stanley Hudson','Kelly':'Kelly Kapoor',
   'Ryan':'Ryan Howard','Creed':'Creed Bratton','Toby':'Toby Flenderson',
   'Meredith':'Meredith Palmer','Phyllis':'Phyllis Vance','Darryl':'Darryl Philbin',
   'Erin':'Erin Hannon','Holly':'Holly Flax','Jan':'Jan Levinson','Robert':'Robert California'},
 'community': {'Jeff':'Jeff Winger','Abed':'Abed Nadir','Troy':'Troy Barnes',
   'Britta':'Britta Perry','Annie':'Annie Edison','Shirley':'Shirley Bennett',
   'Pierce':'Pierce Hawthorne','Chang':'Ben Chang','Dean':'Dean Pelton',
   'Magnitude':'Magnitude','Duncan':'Ian Duncan','Hickey':'Buzz Hickey'},
 'arrested-development': {'Michael':'Michael Bluth','Gob':'GOB Bluth','George Sr.':'George Bluth Sr.',
   'Lucille':'Lucille Bluth','Buster':'Buster Bluth','Lindsay':'Lindsay Bluth Fünke',
   'Tobias':'Tobias Fünke','Maeby':'Maeby Fünke','George Michael':'George Michael Bluth',
   'Narrator':'the Narrator','Barry':'Barry Zuckerkorn','Steve Holt':'Steve Holt','Ann':'Ann Veal'},
 'the-good-place': {'Eleanor':'Eleanor Shellstrop','Michael':'Michael','Chidi':'Chidi Anagonye',
   'Tahani':'Tahani Al-Jamil','Jason':'Jason Mendoza','Janet':'Janet','Shawn':'Shawn',
   'Mindy':'Mindy St. Claire','Doug':'Doug Forcett'},
}
SHOW_TITLE = {'parks-and-recreation':'Parks and Recreation','the-office':'The Office',
 'community':'Community','arrested-development':'Arrested Development',
 'the-good-place':'The Good Place'}

TONE = re.compile(r'\b(fuck|shit|bitch|slut|penis|vagina|boob|dick|whore|sex|sexual|'
                  r'chlamydia|venereal|nipple|porn|masturbat|orgasm|erection|condom|'
                  r'testicl|scrotum|butthole|anal|rape|nigg|fag|retard)', re.I)
OPENER = re.compile(r'^(yeah|yes|no|nope|well|okay|ok|oh|uh+|um+|hey|hi|hello|sure|'
                    r'right|what|wait|so|and|but|because|thanks|thank you)\b[,.! ]', re.I)

def parse_file(show, path, url, title):
    txt = open(path, encoding='utf-8').read()
    cast = CAST[show]
    season = None; ep = None; epname = None
    rows = []
    for raw in txt.split('\n'):
        line = raw.strip()
        if not line: continue
        m = re.match(r'^==\s*Season (\d+)\s*==$', line)
        if m: season = m.group(1); continue
        m = re.match(r'^===\s*(.+?)\s*\[([0-9]+\.[0-9&\s.]+)\]\s*===$', line)
        if m: epname, ep = m.group(1), m.group(2).strip(); continue
        m = re.match(r'^==+\s*(.+?)\s*==+$', line)
        if m: epname, ep = m.group(1), None; continue
        if line.startswith('['): continue
        m = re.match(r'^([A-Z][A-Za-z\-\'\. ]{1,18}):\s*(.+)$', line)
        if not m: continue
        sp, body = m.group(1).strip(), m.group(2)
        who = cast.get(sp)
        if not who: continue
        q = re.sub(r'\[[^\]]*\]', ' ', body)
        q = re.sub(r'\s+', ' ', q).strip()
        rows.append({'q': q, 'who': who, 'speaker': sp, 'show': SHOW_TITLE[show],
                     'season': season, 'episode': ep, 'episodeName': epname,
                     'source': url, 'sourceTitle': title})
    return rows

def score(r):
    q = r['q']; n = len(q)
    if n < 35 or n > 230: return -1
    if q.endswith('?'): return -1
    if not q[0].isupper(): return -1
    s = 0
    if 60 <= n <= 180: s += 3
    elif 45 <= n < 60: s += 1
    if not OPENER.match(q): s += 3
    if q.count('.') + q.count('!') >= 1: s += 1
    if re.search(r'\b(I|my|me)\b', q): s += 1          # first-person declarations travel well
    if q.endswith(('.', '!', '"')): s += 1
    if '...' in q: s += 1                               # comic pause
    return s

if __name__ == '__main__':
    src = json.load(open('sources.json'))
    allrows = []
    for show, pages in src.items():
        for p in pages:
            allrows += parse_file(show, p['file'], p['url'], p['title'])
    for r in allrows:
        r['score'] = score(r)
        r['tone'] = bool(TONE.search(r['q']))
    json.dump(allrows, open('parsed.json', 'w'), indent=1)
    from collections import Counter
    c = Counter(r['show'] for r in allrows)
    print(f"{'show':26} {'lines':>6} {'scored>=7':>10} {'tone-flag':>10}")
    for show in SHOW_TITLE.values():
        rs = [r for r in allrows if r['show'] == show]
        print(f"{show:26} {len(rs):>6} {sum(1 for r in rs if r['score']>=7):>10} {sum(1 for r in rs if r['tone']):>10}")
    print(f"{'TOTAL':26} {len(allrows):>6} {sum(1 for r in allrows if r['score']>=7):>10} {sum(1 for r in allrows if r['tone']):>10}")
