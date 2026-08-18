"""Fetch Wikiquote season pages as plain text via the MediaWiki API.

Wikimedia requires a descriptive User-Agent; the default urllib one gets a 403.
Content is CC BY-SA, so reuse is licensed with attribution.
"""
import json, time, urllib.parse, urllib.request

UA = 'subscribe.michaellamb.dev quote-bank/1.0 (https://michaellamb.dev; michael@michaellamb.dev)'

def api(**kw):
    kw.setdefault('format', 'json')
    kw.setdefault('action', 'query')
    url = 'https://en.wikiquote.org/w/api.php?' + urllib.parse.urlencode(kw)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def search(term, limit=15):
    r = api(list='search', srsearch=term, srlimit=limit, srnamespace=0)
    return [h['title'] for h in r['query']['search']]

def extract(title):
    r = api(prop='extracts', explaintext=1, titles=title, redirects=1)
    page = list(r['query']['pages'].values())[0]
    return page.get('title'), page.get('extract', '')

def url_for(title):
    return 'https://en.wikiquote.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))
