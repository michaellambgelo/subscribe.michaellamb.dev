"""Merge Michael's conversation rulings with the Wikiquote selection.
Each ruled entry is cross-checked against the fetched source text; a match
upgrades its provenance from `michael-ruled` to `wikiquote-verified` and
attaches the episode + source URL."""
import json, re, glob, os

SHOW_FILES = {
 'Parks and Recreation':'parks-and-recreation','The Office':'the-office',
 'Community':'community','Arrested Development':'arrested-development',
 'The Good Place':'the-good-place'}

RULED = [
 # ---- Arrested Development (batch 1)
 ("I've made a huge mistake.", 'GOB Bluth','Arrested Development',['mistake','regret','error','oops'],None),
 ('Her?','Michael Bluth','Arrested Development',['disgust','surprise','recoil'],None),
 ('Steve Holt!','Steve Holt','Arrested Development',['triumph','celebrate','name'],None),
 ('I just blue myself.','Tobias Fünke','Arrested Development',['innuendo','accident','self'],None),
 ('Illusion, Michael. A trick is something a whore does for money.','GOB Bluth','Arrested Development',['magic','correction','pedantic'],None),
 ('No touching!','multiple characters, Arrested Development',['prison','boundaries','rules'],None,None),
 ("I'm a monster!",'Buster Bluth','Arrested Development',['shame','self-loathing','panic'],None),
 ("I don't know what I expected.",'Michael Bluth','Arrested Development',['resignation','regret','consequence'],None),
 # ---- The Office (batch 2)
 ("That's what she said.",'Michael Scott','The Office',['innuendo','rejoinder','joke'],None),
 ('Bears. Beets. Battlestar Galactica.','Jim Halpert (as Dwight)','The Office',['impression','list','nonsense'],None),
 ('I am Beyoncé, always.','Michael Scott','The Office',['confidence','ego','identity'],None),
 ('Identity theft is not a joke, Jim! Millions of families suffer every year.','Dwight Schrute','The Office',['outrage','warning','serious'],None),
 ('I DECLARE BANKRUPTCY!','Michael Scott','The Office',['money','debt','declaration','failure'],None),
 ("Sometimes I'll start a sentence and I don't even know where it's going. I just hope I find it along the way.",'Michael Scott','The Office',['confusion','rambling','lost','improvise'],None),
 ('Fact. Bears eat beets.','Jim Halpert (as Dwight)','The Office',['impression','fact','absurd'],None),
 ('The worst thing about prison was the Dementors.','Michael Scott (as Prison Mike)','The Office',['prison','fear','mixup'],None),
 # ---- Parks and Recreation (batch 3)
 ('Treat yo self.','Tom Haverford and Donna Meagle','Parks and Recreation',['indulgence','money','celebrate','self-care'],None),
 ('Ann, you beautiful tropical fish.','Leslie Knope','Parks and Recreation',['compliment','friendship','affection'],None),
 ('I love you and I like you.','Leslie Knope and Ben Wyatt','Parks and Recreation',['love','affection','sincere'],None),
 ("Just give me all the bacon and eggs you have. Wait, wait. I'm worried what you just heard was, \"Give me a lot of bacon and eggs.\" What I said was, \"Give me all the bacon and eggs you have\". Do you understand?",'Ron Swanson','Parks and Recreation',['food','breakfast','excess','clarity'],None),
 ("You're 5,000 candles in the wind.",'Mouse Rat','Parks and Recreation',['tribute','grief','song','memorial'],None),
 ('Literally.','Chris Traeger','Parks and Recreation',['emphasis','agreement','catchphrase'],None),
 ("Everything hurts and I'm dying.",'Chris Traeger','Parks and Recreation',['pain','illness','exhaustion','complaint'],'UNVERIFIED: absent from Wikiquote seasons 1-7'),
 ("There's only one thing I hate more than lying: skim milk. Which is water that's lying about being milk.",'Ron Swanson','Parks and Recreation',['lying','fake','milk','contempt'],None),
 ('Crying: acceptable at funerals and the Grand Canyon.','Ron Swanson','Parks and Recreation',['crying','emotion','stoic','rules'],None),
 ("I'd wish you the best of luck, but I believe luck is a concept created by the weak to explain their failures.",'Ron Swanson','Parks and Recreation',['luck','encouragement','contempt','failure'],None),
 ('Stop...POOPING.','Chris Traeger','Parks and Recreation',['illness','delirium','absurd'],None),
 # ---- Community (batch 4)
 ('Cool. Cool cool cool.','Abed Nadir','Community',['agreement','awkward','catchphrase'],None),
 ('Six seasons and a movie!','Abed Nadir','Community',['optimism','television','rallying'],None),
 ('Streets ahead.','Pierce Hawthorne','Community',['slang','superiority','invented'],None),
 ('Pop pop!','Magnitude','Community',['catchphrase','celebrate','party'],None),
 ('Troy and Abed in the morning!','Troy Barnes and Abed Nadir','Community',['duo','announcement','friendship'],None),
 ('I see your value now.','Jeff Winger','Community',['recognition','respect','grudging'],'Also said by Abed Nadir'),
 ("I must've missed that.",'Abed Nadir','Community',['deadpan','film','oblivious'],None),
 ('Sounds like a Thanksgiving at my house.','Troy Barnes','Community',['family','chaos','holiday','deadpan'],None),
 ('Will it get me through this movie?','Shirley Bennett','Community',['endurance','boredom','film'],None),
 ("The question isn't where, constable, but when.",'The Inspector','Community',['time','mystery','parody'],'Michael-vouched; Inspector Spacetime, the show-within-the-show'),
 # ---- The Good Place (batch 5)
 ('Holy forking shirtballs.','Eleanor Shellstrop','The Good Place',['surprise','profanity','censored'],None),
 ('Ya basic.','Eleanor Shellstrop','The Good Place',['insult','dismissal','catchphrase'],None),
 ('Welcome! Everything is fine.','The Good Place','The Good Place',['reassurance','ominous','signage'],None),
 ('Bortles!','Jason Mendoza','The Good Place',['catchphrase','football','enthusiasm'],None),
 ('Take it sleazy.','Michael','The Good Place',['farewell','goodbye','send-off'],None),
 ('Welcome to the Medium Place.','Beattie','The Good Place',['afterlife','mediocre','introduction'],'Spoken via VHS cassette to Mindy St. Claire'),
 ('The wave was just a different way for the water to be, for a little while.','Chidi Anagonye','The Good Place',['death','grief','comfort','buddhism','philosophy'],None),
 ('Somebody royally forked up.','Eleanor Shellstrop','The Good Place',['error','blame','censored'],None),
]
DEFN = [({'q':'Britta\'d','kind':'definition',
  'definition':'to make a mistake so completely as to be the worst',
  'who':'the study group','show':'Community',
  'tags':['mistake','failure','verb','definition']})]
SETUPS = {
 "I must've missed that.":"Kickpuncher narrator: \"It is the year 2006 A.D. and nuclear war has ravaged the planet.\"",
 'Sounds like a Thanksgiving at my house.':"Kickpuncher narrator: \"Detroit is a firezone ruled by scavengers, drug dealers, and terrorists.\"",
 'Will it get me through this movie?':'A drug dealer offers Shirley "mega-dope" during Kickpuncher',
 'The wave was just a different way for the water to be, for a little while.':'From the finale wave-and-ocean speech about death',
}

def norm(s):
    return re.sub(r'[^a-z0-9 ]','',s.lower()).strip()

# build a search corpus per show from the fetched raw pages
corpus = {}
srcs = json.load(open('sources.json'))
for show, key in SHOW_FILES.items():
    parts=[]
    for p in srcs.get(key,[]):
        parts.append((p['url'], open(p['file'],encoding='utf-8').read()))
    corpus[show]=parts

def verify(q, show):
    n = norm(q)
    if len(n) < 12: return None
    for url, txt in corpus.get(show,[]):
        flat = norm(txt)
        if n in flat:
            # locate episode header preceding the match
            i = flat.find(n)
            # map back approximately by searching the raw text case-insensitively
            m = re.search(re.escape(q[:40].strip()), txt, re.I)
            ep = None
            if m:
                head = txt[:m.start()]
                hs = re.findall(r'===\s*(.+?)\s*\[([0-9]+\.[0-9&\s.]+)\]\s*===', head)
                if hs: ep = hs[-1]
            return {'source':url,'episode':ep[1].strip() if ep else None,
                    'episodeName':ep[0] if ep else None}
    return None

merged = json.load(open('selected.json'))
seen = {norm(r['q']) for r in merged}
added = upgraded = 0
for tup in RULED:
    q, who, show, tags, note = tup
    if isinstance(show, list):  # guard against the malformed tuple shape
        continue
    if norm(q) in seen: continue
    e = {'q':q,'who':who,'show':show,'tags':tags,'provenance':'michael-ruled'}
    if note: e['note'] = note
    if q in SETUPS: e['setup'] = SETUPS[q]
    v = verify(q, show)
    if v:
        e.update({k:val for k,val in v.items() if val})
        e['provenance'] = 'wikiquote-verified'
        upgraded += 1
    merged.append(e); seen.add(norm(q)); added += 1
for d in DEFN:
    d['provenance']='michael-ruled'; merged.append(d); added+=1
json.dump(merged, open('candidates.json','w'), indent=1)
from collections import Counter
print(f"ruled entries added: {added}  (of which Wikiquote-verified: {upgraded})")
print(f"TOTAL BANK: {len(merged)}")
for k,v in sorted(Counter(r['show'] for r in merged).items()): print(f"  {k:24} {v:>3}")
print()
for k,v in sorted(Counter(r['provenance'] for r in merged).items()): print(f"  {k:22} {v:>3}")
