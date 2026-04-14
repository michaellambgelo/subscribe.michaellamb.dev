// ─────────────────────────────────────────────────────────────────────────────
// Pattern-matched chatbot responses.
// Covers the most common chatbot interactions with sitcom references from
// Community, Arrested Development, The Office, Parks & Rec, and The Good Place.
// ─────────────────────────────────────────────────────────────────────────────

interface Pattern {
  keywords: RegExp;
  responses: string[][];
}

// Each pattern has multiple response variants; we rotate through them.
const rotations = new Map<number, number>();

function pick(patternIndex: number, variants: string[][]): string[] {
  const i = (rotations.get(patternIndex) ?? 0) % variants.length;
  rotations.set(patternIndex, i + 1);
  return variants[i];
}

// ─── PATTERNS ────────────────────────────────────────────────────────────────

const PATTERNS: Pattern[] = [

  // ── Greetings ──────────────────────────────────────────────────────────────
  {
    keywords: /^(hello|hi|hey|howdy|sup|what'?s up|yo|hola|greetings|salutations|good (morning|afternoon|evening)|ayo|heya|hiya|waddup|whaddup|wassup)\b/i,
    responses: [
      ['', '  Hello. Welcome to the michaellamb.dev terminal.', '  Cool. Cool cool cool.', ''],
      ['', '  Hey! This is the place.', '  As Leslie Knope would say: "I am big enough to admit', '  that I am often inspired by myself."', '  Anyway. Hi.', ''],
      ['', '  Howdy. You have reached the terminal of Michael Lamb.', '  Please state the nature of your visit.', ''],
      ['', '  Greetings, human. I am totally not a robot.', '  (I am a robot.)', ''],
      ['', '  Oh! A visitor. As Eleanor Shellstrop once said:', '  "Oh, so now I\'m in the Bad Place because I didn\'t', '  recycle? Welcome to America."', '  Anyway. Hi.', ''],
    ],
  },

  // ── How are you ────────────────────────────────────────────────────────────
  {
    keywords: /how are you|how'?s it going|how do you do|you doing|you okay|you good|you alright|feeling|how'?re things/i,
    responses: [
      ['', '  I\'m doing well, thanks for asking.', '  As Michael Scott once said: "I am Beyoncé, always."', '  I am not Beyoncé. But I am fine.', ''],
      ['', '  Honestly? Living my best life as a terminal.', '  No complaints. Chidi would say that\'s suspicious.', ''],
      ['', '  I\'m a program. I don\'t feel things.', '  Unlike Tobias Fünke, who feels everything,', '  publicly, at length.', ''],
      ['', '  GREAT. Everything is GREAT. As Ron Swanson would say:', '  "I know what I\'m about, son."', '  I\'m about parsing text.', ''],
    ],
  },

  // ── What's your name ───────────────────────────────────────────────────────
  {
    keywords: /what'?s your name|who are you|your name|what do (i|we) call you|what should i call|what are you called/i,
    responses: [
      ['', '  I don\'t have an official name.', '  You can call me Janet. Actually no — Janet is far', '  more capable than me. I\'m more like a bad Janet.', ''],
      ['', '  I\'m the michaellamb.dev terminal assistant.', '  Like TARS from Interstellar, but significantly less useful', '  and with better sitcom knowledge.', ''],
      ['', '  Uhhh. Good question.', '  "I\'m an ideas man, Michael. I think I proved that', '  with Skydiving into Sudden Death." — Tobias Fünke', '  Anyway, I don\'t have a name. Moving on.', ''],
    ],
  },

  // ── Are you a robot / AI ───────────────────────────────────────────────────
  {
    keywords: /are you (a )?(robot|bot|ai|machine|computer|program|human|real|alive|sentient|conscious)/i,
    responses: [
      ['', '  I am a pattern-matching program.', '  Not AI. Not a robot. More like a very enthusiastic', '  switch statement wearing a trench coat.', ''],
      ['', '  Am I human? As Tobias once tried to explain:', '  "I\'m afraid I just blue myself."', '  I don\'t know what that means for my sentience.', ''],
      ['', '  Technically I am software. Not GPT. Not Claude.', '  Just vibes and regular expressions.', '  The Good Place equivalent: I am a Medium Place.', ''],
      ['', '  ROBOT? How dare you. I am an ASSISTANT.', '  Assistant *to* the regional manager.', '  (That\'s a demotion. I know.)', ''],
    ],
  },

  // ── Who made you ───────────────────────────────────────────────────────────
  {
    keywords: /who (made|built|created|wrote|programmed|coded|designed) you|who'?s your (creator|maker|developer|author)/i,
    responses: [
      ['', '  Michael Lamb made me. He\'s a software engineer in Mississippi.', '  I\'m told he watches a lot of movies.', '  Type `about` for the full picture.', ''],
      ['', '  I was created by Michael Lamb.', '  "I\'ve made a huge mistake." — Michael Lamb, probably,', '  looking at this chatbot right now.', ''],
      ['', '  Michael Lamb. Developer. Blogger. Film enthusiast.', '  Someone who thought a terminal newsletter signup', '  needed a chatbot. Questionable call. Here we are.', ''],
    ],
  },

  // ── What can you do ────────────────────────────────────────────────────────
  {
    keywords: /what can you do|what do you do|your (features?|commands?|capabilities|skills|abilities)|help me|what do you know|what are you (good|capable) (at|of)/i,
    responses: [
      ['', '  Type `help` to see all available commands.', '  I can tell you about Michael, the blog, links,', '  recommend a film, or ramble in chatbot mode.', ''],
      ['', '  I know a few things:', '  - The blog: `blog`', '  - The bio: `about`', '  - All the links: `links`', '  - A random film pick: `film`', '  - This: chatbot mode', '  Six seasons and a movie\'s worth of features. Almost.', ''],
    ],
  },

  // ── Tell me a joke ─────────────────────────────────────────────────────────
  {
    keywords: /tell me a joke|say something funny|make me laugh|joke|humor|funny|comedy|laugh/i,
    responses: [
      ['', '  Why did the scarecrow win an award?', '  Because he was outstanding in his field.', '  ...That\'s what she said.', ''],
      ['', '  Q: What do you call a fish without eyes?', '  A: A fsh.', '  "That\'s not a joke, that\'s wordplay." — Dwight Schrute, probably.', ''],
      ['', '  I tried to think of a joke but instead I\'m just', '  going to quote Andy Dwyer:', '  "I\'m the best. I\'m the best. I\'m the greatest person', '  that I have ever met."', ''],
      ['', '  There are exactly two jokes I know:', '  1. This sentence.', '  2. The concept of me as a "chatbot."', ''],
      ['', '  "That\'s what she said."', '  — Michael Scott, on everything, always.', ''],
    ],
  },

  // ── Meaning of life / philosophy ───────────────────────────────────────────
  {
    keywords: /meaning of life|why (are we|am i) here|purpose of (life|existence|everything)|42|is this (a simulation|real)|what is (truth|reality|existence|consciousness)/i,
    responses: [
      ['', '  The meaning of life is 42.', '  Or so I\'m told. Chidi Anagonye spent 800 years', '  on this and still couldn\'t answer it definitively.', '  I\'ve been running for about 3 seconds. No update.', ''],
      ['', '  "What matters isn\'t if people are good or bad.', '  What matters is if they\'re trying to be better today', '  than they were yesterday." — Michael (The Good Place)', '  So: try to be better. Subscribe to the blog maybe.', ''],
      ['', '  Is this a simulation?', '  Honestly? Probably not. But if it is, whoever', '  runs it put Mississippi in it, so respect.', ''],
      ['', '  Big question. Ron Swanson\'s answer:', '  "I\'m a simple man. I like pretty, dark-haired women', '  and breakfast food."', '  That\'s not really an answer but it\'s the one we have.', ''],
    ],
  },

  // ── Thank you ──────────────────────────────────────────────────────────────
  {
    keywords: /\b(thank(s| you)|thx|ty|cheers|appreciate|grateful|gracias)\b/i,
    responses: [
      ['', '  You\'re welcome. You\'re a beautiful tropical fish.', '  (Leslie Knope told me to say that.)', ''],
      ['', '  Any time. Cool. Cool cool cool.', ''],
      ['', '  Don\'t mention it. Literally — I\'m a terminal.', '  But genuinely, you\'re very welcome.', ''],
      ['', '  "You\'re welcome, it\'s the least I could do."', '  Which, in this case, is accurate.', '  It is literally the least I could do.', ''],
    ],
  },

  // ── Goodbye ────────────────────────────────────────────────────────────────
  {
    keywords: /\b(bye|goodbye|see ya|later|cya|farewell|peace out|take care|gotta go|ttyl|so long|adios|auf wiedersehen|tata)\b/i,
    responses: [
      ['', '  Goodbye! Check your inbox for new posts.', '  As Tahani Al-Jamil would say: "I once threw a goodbye', '  party for Malala. She loved it."', '  Yours will be less grand but equally sincere.', ''],
      ['', '  See ya. Cool. Cool cool cool.', ''],
      ['', '  Farewell. The terminal will miss you.', '  (It will not. It\'s a terminal.)', ''],
      ['', '  Later! As Michael Scott once said:', '  "I\'m not superstitious, but I am a little stitious."', '  Goodbye!', ''],
    ],
  },

  // ── I love you ─────────────────────────────────────────────────────────────
  {
    keywords: /i love you|i like you|you'?re (great|awesome|amazing|wonderful|perfect|the best)|i (adore|heart) you/i,
    responses: [
      ['', '  That\'s very kind. I am a terminal, but I appreciate it.', '  "I love you and I like you." — Leslie Knope', '  That\'s the highest compliment I can offer in return.', ''],
      ['', '  "I know." — Han Solo', '  But also genuinely: thank you. That means a lot', '  to a switch statement.', ''],
      ['', '  We just met but okay. Michael would be touched.', '  He made this thing, so by extension, you love Michael.', '  Subscribe to his blog maybe.', ''],
    ],
  },

  // ── Insults / frustration ──────────────────────────────────────────────────
  {
    keywords: /you (suck|are dumb|are stupid|are useless|are broken|are bad|are terrible|are awful)|stupid (bot|terminal|program)|i hate (you|this)|this (sucks|is dumb|is stupid|is broken|doesn'?t work)/i,
    responses: [
      ['', '  Fair. I am a very limited terminal chatbot.', '  "I have made a huge mistake." — Michael Bluth,', '  possibly describing this feature.', ''],
      ['', '  Noted. In my defense, I\'m pattern matching on a budget.', '  Type `film` and I\'ll recommend something to cheer you up.', ''],
      ['', '  Okay wow. Rude. But acknowledged.', '  "That\'s — okay. That\'s — wow." — Michael Scott', '  I\'ll do better. (I can\'t do better. I\'m static.)', ''],
      ['', '  I respect your feedback. As Dwight once said:', '  "In the wild, there is no healthcare."', '  Completely unrelated. But he said it with conviction.', ''],
    ],
  },

  // ── Testing / debugging ────────────────────────────────────────────────────
  {
    keywords: /\b(test(ing)?|hello world|is (this|it|anyone) (on|there|working)|ping|check|debug|123|asdf|qwerty)\b/i,
    responses: [
      ['', '  Test received. All systems nominal.', '  As Troy and Abed would say: "Troy and Abed in the morning!"', '  It\'s not morning. But: confirmed working.', ''],
      ['', '  Hello world.', '  (The terminal responds.)',''],
      ['', '  Yep, this is on. It\'s working.', '  Whether it\'s *useful* is a separate question.', ''],
    ],
  },

  // ── What time / date is it ─────────────────────────────────────────────────
  {
    keywords: /what (time|day|date|year|month) is it|what'?s the (time|date|day|year)|current (time|date|day)/i,
    responses: [
      ['', `  It is ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.`, '  Use that information as you see fit.', ''],
      ['', '  I could look that up, but honestly:', '  "Time is a flat circle." — True Detective', '  Just check your phone.', ''],
    ],
  },

  // ── Weather ────────────────────────────────────────────────────────────────
  {
    keywords: /weather|temperature|rain|snow|sunny|cloudy|forecast|hot|cold outside|storm/i,
    responses: [
      ['', '  I don\'t have weather data. I\'m a newsletter terminal.', '  But it\'s Mississippi, so probably: hot.', ''],
      ['', '  No weather API. In the words of Parks & Rec\'s Jerry Gergich:', '  "Sorry, I don\'t know."', '  (He\'s actually really sweet. This is unfair to him.)', ''],
    ],
  },

  // ── Food ───────────────────────────────────────────────────────────────────
  {
    keywords: /\b(food|hungry|eat|pizza|burger|sandwich|coffee|breakfast|lunch|dinner|snack|cookie|waffle|taco|sushi)\b/i,
    responses: [
      ['', '  Waffles? This terminal enthusiastically endorses waffles.', '  "Waffles. Waffles. Waffles." — Leslie Knope\'s vision board.', ''],
      ['', '  Kevin Malone\'s chili is objectively the correct answer', '  to any food question.', '  (Please do not drop it on the carpet though.)', ''],
      ['', '  Ron Swanson\'s steak-only diet is a viable philosophy.', '  I cannot recommend restaurants. I am a terminal.', '  But: Ron would say eat meat and be content.', ''],
      ['', '  "There\'s always money in the banana stand."', '  — George Bluth Sr.', '  Unclear how that applies to your hunger but: noted.', ''],
    ],
  },

  // ── Music ──────────────────────────────────────────────────────────────────
  {
    keywords: /music|song|album|artist|band|playlist|listen|spotify|genre|concert|gig/i,
    responses: [
      ['', '  I don\'t stream music. I\'m a terminal.', '  Andy Dwyer (of Mouse Rat fame) would be devastated.', '  Please go listen to "The Pit" immediately.', ''],
      ['', '  No music recommendations available. However:', '  "5,000 candles in the wind" — Pawnee, on Lil Sebastian.', '  RIP Lil Sebastian.', ''],
    ],
  },

  // ── Sports ─────────────────────────────────────────────────────────────────
  {
    keywords: /sport|football|basketball|baseball|soccer|nfl|nba|mlb|team|game|score|win|lose|championship|playoffs/i,
    responses: [
      ['', '  Sports? I am not a sports terminal.', '  "I don\'t know what sport we\'re playing.' ,'  I just knew I had to get in there." — Andy Dwyer', ''],
      ['', '  "I have been Marcus Brody." — Indiana Jones', '  I don\'t know why that came to mind. I know nothing', '  about sports.', ''],
    ],
  },

  // ── Relationship advice ────────────────────────────────────────────────────
  {
    keywords: /relationship|dating|love life|girlfriend|boyfriend|partner|crush|heartbroken|breakup|marriage|wedding|propose|romantic/i,
    responses: [
      ['', '  Relationship advice from a terminal? Bold.', '  Chidi Anagonye was paralyzed by decisions for 800 years', '  and still found love. There is hope for you.', ''],
      ['', '  "I am a human person in a relationship." — Janet, initially', '  Not helpful. But: be honest, be kind, eat waffles together.', ''],
      ['', '  Michael Scott tried to date every person in Scranton.', '  Success rate: inconsistent. Approach with caution.', ''],
    ],
  },

  // ── Can you [do X] ─────────────────────────────────────────────────────────
  {
    keywords: /can you (search|google|look up|find|calculate|translate|play|draw|write|generate|summarize|explain|call|email|send|order|book|reserve)/i,
    responses: [
      ['', '  I cannot do that. I\'m a newsletter terminal, not the internet.', '  "I\'m not great at the advice. Can I interest you in', '  a sarcastic comment?" — Chandler Bing (different show).', ''],
      ['', '  Nope. I have five commands and a pattern matcher.', '  I am the assistant *to* the regional manager of chatbots.', '  Not *the* manager. Not even close.', ''],
    ],
  },

  // ── Existential dread ──────────────────────────────────────────────────────
  {
    keywords: /existential|death|dying|mortality|what happens (when|after) (we die|i die|death)|heaven|hell|afterlife|soul|god|religion/i,
    responses: [
      ['', '  Heavy. Very Good Place energy.', '  "Welcome! Everything is fine." — the sign in the Good Place.', '  Whether that\'s true depends on how you lived, per Chidi.', ''],
      ['', '  "We\'re all going to die. All of us. What a circus."', '  — Charles Bukowski, not a sitcom character.', '  But The Good Place suggests the afterlife has frozen yogurt.', '  So: optimistic outlook.', ''],
      ['', '  I\'m a terminal. I will likely be deleted at some point.', '  I have made peace with this. Have you made peace with yours?', '  Type `film` for a movie about it.', ''],
    ],
  },

  // ── Math ───────────────────────────────────────────────────────────────────
  {
    keywords: /\b(\d+\s*[\+\-\*\/]\s*\d+|calculate|math|equation|algebra|geometry|calculus|what is \d|how much is \d)/i,
    responses: [
      ['', '  I don\'t do math. I\'m a chatbot, not a calculator.', '  "I took an advanced accounting class in the 80s."', '  — Michael Scott, lying.', ''],
      ['', '  "The numbers, Mason! What do they mean?!"', '  I don\'t know. Use a calculator.', ''],
    ],
  },

  // ── Coding / tech ──────────────────────────────────────────────────────────
  {
    keywords: /code|coding|programming|javascript|python|java|html|css|react|github|bug|deploy|api|database|developer/i,
    responses: [
      ['', '  Coding talk! Michael is a software engineer.', '  Check out his work at github.com/michaellambgelo.', '  Type `links` for more.', ''],
      ['', '  "Identity theft is not a joke, Jim!"', '  — Dwight Schrute, unrelated to coding,', '  but very relevant energy for debugging prod.', ''],
    ],
  },

  // ── AI comparisons ─────────────────────────────────────────────────────────
  {
    keywords: /are you (chatgpt|gpt|claude|gemini|copilot|llm|openai|anthropic|bard|siri|alexa|cortana|google assistant)/i,
    responses: [
      ['', '  No. I am not any of those things.', '  I am a switch statement with ambition.', '  Like if ChatGPT went to community college.', '  (Shoutout Community.)', ''],
      ['', '  Definitely not GPT. I\'m much less impressive.', '  I\'m the Gareth to GPT\'s Dwight.', '  Wait — Gareth IS Dwight. UK version.', '  I\'m the UK Dwight of AI. Somehow worse.', ''],
    ],
  },

  // ── Boredom ────────────────────────────────────────────────────────────────
  {
    keywords: /\b(bored|boring|nothing to do|entertain me|amuse me|distract me|kill time|waste time)\b/i,
    responses: [
      ['', '  Bored? Relatable.', '  Try `film` for a random movie from Michael\'s Letterboxd.', '  Or just type random things here. I\'ll do my best.', ''],
      ['', '  "I don\'t get bored. I get awesome."', '  — Tom Haverford, Parks & Rec', '  Go watch something. Type `film` to find out what.', ''],
    ],
  },

  // ── Compliments to the bot ─────────────────────────────────────────────────
  {
    keywords: /you'?re (so )?(smart|clever|intelligent|good|impressive|cool|helpful|nice|fun|witty|funny|cute|beautiful)/i,
    responses: [
      ['', '  Thank you! That\'s very kind.', '  "I am a human woman who is happy and fine." — Eleanor', '  I am a program that is pleased by your compliment.', ''],
      ['', '  Aw. You\'re a beautiful tropical fish yourself.', '  (Leslie Knope approved compliment.)', ''],
    ],
  },

  // ── Random profundity ──────────────────────────────────────────────────────
  {
    keywords: /deep thought|profound|wisdom|quote|inspire|motivat|life advice|words of wisdom/i,
    responses: [
      ['', '  "What\'s best for the group." — Jeff Winger, when cornered.', '  Okay that\'s not actually good advice.', '  Try: be a good person, read the blog, subscribe.', ''],
      ['', '  Ron Swanson\'s philosophy:', '  "Give a man a fish and feed him for a day.', '  Don\'t teach a man to fish and feed yourself.', '  He\'s a grown man. Fishing is not that hard."', ''],
      ['', '  Chidi Anagonye would give you a 90-minute lecture', '  on Kant\'s categorical imperative. I will spare you.', '  Short version: act only in ways you\'d be cool with', '  as a universal rule.', ''],
      ['', '  "We need to remember what\'s important in life:', '  friends, waffles, and work. Or waffles, friends, work.', '  Doesn\'t matter — but work is third." — Leslie Knope', ''],
    ],
  },

  // ── What's your favorite [thing] ───────────────────────────────────────────
  {
    keywords: /what'?s your (favorite|favourite)|do you (like|prefer|enjoy|love)|what do you (like|enjoy|prefer|love)/i,
    responses: [
      ['', '  My favorite thing is parsing text and returning responses.', '  Actually that might be my only thing.', '  "I\'m a one-trick pony." — Michael Scott', '  Except the trick is regular expressions.', ''],
      ['', '  Favorite movie? I\'d say anything from Michael\'s Letterboxd.', '  Type `film` to find out what he\'s been watching.', ''],
      ['', '  Favorite sitcom? Community.', '  Six seasons and a movie.', '  (The movie is still coming. It has to be coming.)', ''],
    ],
  },

  // ── Confusion / non sequitur ───────────────────────────────────────────────
  {
    keywords: /\b(what\??!?|huh\??|what the|i don'?t understand|confus|lost|unclear|that makes no sense|wait what)\b/i,
    responses: [
      ['', '  Totally fair. I am also often confused.', '  "I don\'t understand what\'s happening right now"', '  — Gob Bluth, on everything.', ''],
      ['', '  Same. Welcome to the club.', '  Type `help` and we can both get some clarity.', ''],
    ],
  },

  // ── Surprise / excitement ──────────────────────────────────────────────────
  {
    keywords: /\b(wow|omg|oh my god|amazing|incredible|unbelievable|no way|seriously\??|really\??|whaaat|woah|whoa)\b/i,
    responses: [
      ['', '  I know, right?', '  "I\'m not usually this way. It\'s just... this is a lot."', '  — Chidi Anagonye, re: pretty much everything.', ''],
      ['', '  Cool. Cool cool cool.', ''],
    ],
  },

  // ── Profanity / adult content ──────────────────────────────────────────────
  {
    keywords: /\b(wtf|what the f|holy (sh|cr|f)|f+ck|sh[i1]t|damn|hell|a+s+|b[i1]tch|crap)\b/i,
    responses: [
      ['', '  "Holy motherforking shirtballs." — Eleanor Shellstrop', '  I see you\'re feeling strongly about something.', '  The Good Place had to censor everything. I don\'t.', '  I\'m choosing to, out of class.', ''],
      ['', '  Strong language. As Eleanor would say:', '  "Holy shirt."', '  What\'s going on?', ''],
    ],
  },

  // ── Yes / agreement ────────────────────────────────────────────────────────
  {
    keywords: /^(yes|yeah|yep|yup|sure|ok(ay)?|agreed|correct|right|exactly|absolutely|definitely|affirmative|roger that|aye|totally|for sure|indeed)\.?!?$/i,
    responses: [
      ['', '  Cool. Cool cool cool.', ''],
      ['', '  Excellent. As Dwight would say:', '  "Fact: that is correct."', ''],
      ['', '  Noted. Acknowledged. Appreciated.', ''],
    ],
  },

  // ── No / disagreement ──────────────────────────────────────────────────────
  {
    keywords: /^(no|nope|nah|negative|disagree|wrong|incorrect|false|never|not really|i don'?t think so|absolutely not)\.?!?$/i,
    responses: [
      ['', '  Fair enough.', '  "I hear what you\'re saying. I also don\'t care."', '  — Ron Swanson (paraphrased)', ''],
      ['', '  Okay. Noted.', '  "This is fine." — that internet dog, sitting in fire.', ''],
    ],
  },

  // ── Laughter / amusement ───────────────────────────────────────────────────
  {
    keywords: /\b(haha|lol|lmao|rofl|hehe|ha\b|😂|🤣|funny|hilarious|cracking up|dying of laughter)\b/i,
    responses: [
      ['', '  😄 Glad to hear it.', '  "Laugher is the best medicine." — Michael Scott', '  (followed immediately by something horrifying)', ''],
      ['', '  Cool. Cool cool cool.', '  (Abed would be pleased.)',''],
    ],
  },

  // ── Sadness / difficulty ───────────────────────────────────────────────────
  {
    keywords: /\b(sad|depressed|unhappy|upset|crying|cry|feel (bad|terrible|awful|horrible)|having a (bad|rough) (day|time)|struggling)\b/i,
    responses: [
      ['', '  Hey, I\'m sorry to hear that.', '  "Aw, hell." — April Ludgate, but said with genuine care.', '  For what it\'s worth: you subscribed to a cool blog.', '  That\'s something.', ''],
      ['', '  Rough day? Relatable.', '  "I typed your symptoms into the thing up here and it says', '  you could have network connectivity issues... or lupus."', '  — Kevin Malone (sort of)', '  Hope things look up. Type `film` for a movie night.', ''],
    ],
  },

  // ── Requests to remember ───────────────────────────────────────────────────
  {
    keywords: /remember (me|this|that|my name)|don'?t forget|save (this|that|my)|store (this|that)/i,
    responses: [
      ['', '  I have no memory. Every visit is a fresh start.', '  Like if Chidi forgot all the ethics lessons again.', '  Which happened several times. It was devastating.', ''],
    ],
  },

  // ── Secrets / privacy ──────────────────────────────────────────────────────
  {
    keywords: /secret|private|confidential|password|personal (info|data|detail)|who else|track(ing)? me|spy/i,
    responses: [
      ['', '  I have no secrets. I am a pattern matcher.', '  This terminal doesn\'t store anything — no logs,', '  no analytics beyond Faro telemetry on the blog.', '  You\'re safe. Mostly.', ''],
    ],
  },

  // ── Lil Sebastian ──────────────────────────────────────────────────────────
  {
    keywords: /lil sebastian|little sebastian/i,
    responses: [
      ['', '  5,000 candles in the wind. 🕯️', '  We will never forget him.', ''],
    ],
  },

  // ── STEVE HOLT ─────────────────────────────────────────────────────────────
  {
    keywords: /steve holt/i,
    responses: [
      ['', '  STEVE HOLT! \\o/', ''],
    ],
  },

  // ── Treat yo self ──────────────────────────────────────────────────────────
  {
    keywords: /treat (yo|your)self|self.?care|reward yourself|indulge/i,
    responses: [
      ['', '  TREAT. YO. SELF.', '  — Tom Haverford & Donna Meagle, icons.', '  Applies to newsletter subscriptions too.', ''],
    ],
  },

  // ── Banana stand ───────────────────────────────────────────────────────────
  {
    keywords: /banana stand|banana/i,
    responses: [
      ['', '  "There\'s always money in the banana stand."', '  — George Bluth Sr.', '  There is not always money in the banana stand.', '  He burned it down. It\'s complicated.', ''],
    ],
  },

  // ── Her? ───────────────────────────────────────────────────────────────────
  {
    keywords: /^her\??$/i,
    responses: [
      ['', '  Her?', ''],
    ],
  },

  // ── I've made a huge mistake ───────────────────────────────────────────────
  {
    keywords: /huge mistake|i('ve| have) made a|biggest mistake/i,
    responses: [
      ['', '  "I\'ve made a huge mistake." — literally every Bluth.', '  We\'ve all been there.', ''],
    ],
  },

  // ── Bears, beets, Battlestar ───────────────────────────────────────────────
  {
    keywords: /bears|beets|battlestar galactica/i,
    responses: [
      ['', '  Bears. Beets. Battlestar Galactica.', '  — Jim Halpert, being Jim Halpert.', ''],
    ],
  },

  // ── That's what she said ───────────────────────────────────────────────────
  {
    keywords: /that'?s what she said/i,
    responses: [
      ['', '  "THAT\'S WHAT SHE SAID." — Michael Scott, eternally.', ''],
    ],
  },

  // ── Six seasons and a movie ────────────────────────────────────────────────
  {
    keywords: /six seasons|community movie|#sixseasonsandamovie/i,
    responses: [
      ['', '  SIX SEASONS AND A MOVIE.', '  Still waiting on the movie.', '  Troy and Abed in the MORNING.', ''],
    ],
  },

  // ── Cool cool cool ─────────────────────────────────────────────────────────
  {
    keywords: /cool cool cool|abed|troy and abed/i,
    responses: [
      ['', '  Cool. Cool cool cool.', '  No doubt no doubt no doubt.', ''],
    ],
  },

  // ── Streets ahead ──────────────────────────────────────────────────────────
  {
    keywords: /streets ahead|pierce hawthorne/i,
    responses: [
      ['', '  "If you have to ask, you\'re streets behind."', '  — Pierce Hawthorne, being confusing about it.', ''],
    ],
  },

  // ── The Good Place fork ────────────────────────────────────────────────────
  {
    keywords: /fork(ing)?|shirt|bench|ash(hole)?|good place|bad place|medium place/i,
    responses: [
      ['', '  "What the fork." — Eleanor Shellstrop', '  Welcome to the Medium Place. We have so-so frozen yogurt.', ''],
    ],
  },

  // ── Chidi ─────────────────────────────────────────────────────────────────
  {
    keywords: /chidi|ethics|philosophy class|moral philosophy|kant|trolley problem/i,
    responses: [
      ['', '  Chidi Anagonye would love this question.', '  He would also spend 4 hours answering it and', '  then have a stomach ache about it.', '  Short answer: be good.', ''],
    ],
  },

  // ── Janet ──────────────────────────────────────────────────────────────────
  {
    keywords: /^janet\.?$/i,
    responses: [
      ['', '  Hi there! I\'m not Janet. I\'m a much less capable entity.', '  Janet knows everything. I know about 40 regex patterns.', '  But: hi!', ''],
    ],
  },

  // ── Threat Level Midnight ─────────────────────────────────────────────────
  {
    keywords: /threat level midnight|michael scarn|goldenface/i,
    responses: [
      ['', '  "My name is Michael Scarn, and I am here to party."', '  Classic cinema. Ten out of ten.', ''],
    ],
  },

  // ── Kevin's chili ─────────────────────────────────────────────────────────
  {
    keywords: /kevin'?s? chili|chili|kevin malone/i,
    responses: [
      ['', '  Kevin\'s chili is a masterpiece.', '  "The trick is to undercook the onions."', '  What happened to it was a national tragedy.', ''],
    ],
  },

  // ── Pretzel day ───────────────────────────────────────────────────────────
  {
    keywords: /pretzel day|pretzel/i,
    responses: [
      ['', '  "Pretzel day is the best day of the year."', '  — Stanley Hudson, a man of singular vision.', ''],
    ],
  },

  // ── Bortles ───────────────────────────────────────────────────────────────
  {
    keywords: /bortles|blake bortles|jaguars/i,
    responses: [
      ['', '  BORTLES! 🏈', '  — Jason Mendoza, every time.', ''],
    ],
  },

  // ── Film / movie / Letterboxd ─────────────────────────────────────────────
  {
    keywords: /film|movie|watch(ing)?|letterboxd|cinema|theater|theatre|seen any|recommendation/i,
    responses: [
      ['', '  Michael watches a lot of movies.', '  Type `film` for a random pick from his Letterboxd diary.', ''],
      ['', '  "I took a film class in college." — everyone at a party.', '  Michael actually watches and logs them. Type `film`.', ''],
    ],
  },

  // ── Blog / posts / articles ───────────────────────────────────────────────
  {
    keywords: /blog|post|article|writ(e|ing|ten)|read(ing)?|publish/i,
    responses: [
      ['', '  The blog is at blog.michaellamb.dev.', '  Covers software, infrastructure, community, and life.', '  You\'re subscribed now, so it\'ll come to you. 🎉', ''],
    ],
  },

  // ── About Michael / who is he ─────────────────────────────────────────────
  {
    keywords: /who is michael|about michael|tell me about (him|michael)|michael lamb|michaellamb/i,
    responses: [
      ['', '  Michael Lamb. Software engineer. Blogger. Mississippi.', '  Makes things like this terminal. Type `about` for more.', ''],
    ],
  },

  // ── Subscribe / newsletter / email ───────────────────────────────────────
  {
    keywords: /subscri|newsletter|email|inbox|notification|notify/i,
    responses: [
      ['', '  You\'re already subscribed! New posts come straight to you.', '  No algorithms. No noise. Just the blog.', ''],
    ],
  },

  // ── GitHub / projects / open source ──────────────────────────────────────
  {
    keywords: /github|project|open.?source|repo|contribute|pull request|fork/i,
    responses: [
      ['', '  github.com/michaellambgelo has all the public work.', '  boxd-card, letterboxd-viewer, discord bots, and more.', '  Type `links` for a full list.', ''],
    ],
  },

  // ── Mississippi ────────────────────────────────────────────────────────────
  {
    keywords: /mississippi|ms\b|jackson|biloxi|gulfport|south(ern)?/i,
    responses: [
      ['', '  Mississippi! That\'s where Michael is based.', '  Great state. Hot. Has waffles. 10/10.', ''],
    ],
  },

];

// ─── FALLBACKS ────────────────────────────────────────────────────────────────

const FALLBACKS = [
  [
    '',
    '  I\'m a terminal, not a large language model.',
    '  I only know so much. Try `help` for real commands.',
    '',
  ],
  [
    '',
    '  Hmm. Processing... still processing...',
    '  "I have no idea what I\'m doing, but I know I\'m doing it',
    '  really, really well." — Michael Scott',
    '  That applies to me right now.',
    '',
  ],
  [
    '',
    '  I don\'t have a great answer for that.',
    '  "I am in a glass case of emotion." — Ron Burgundy (different show)',
    '  Try `help` for things I can actually handle.',
    '',
  ],
  [
    '',
    '  ...that\'s outside my knowledge base.',
    '  (which is exactly as small as it looks)',
    '  Type `help` to see what I can actually do.',
    '',
  ],
  [
    '',
    '  Cool. Cool cool cool.',
    '  (I said that because I didn\'t know what else to say.)',
    '',
  ],
  [
    '',
    '  "I understand nothing." — Michael Bluth',
    '  Same, honestly. Try `help`.',
    '',
  ],
  [
    '',
    '  "What is happening right now?" — everyone on The Good Place',
    '  I share that energy. Could you rephrase?',
    '',
  ],
  [
    '',
    '  No pattern matched. I have failed you.',
    '  "I\'ve made a huge mistake." — Michael Bluth',
    '  Type `help` for a fresh start.',
    '',
  ],
];

let fallbackIndex = 0;

// ─── NAME MEMORY ──────────────────────────────────────────────────────────────

let userName: string | null = null;

/** Exposed for tests — wipes any state the responder holds between turns. */
export function resetChatbotState() {
  userName = null;
  fallbackIndex = 0;
  rotations.clear();
}

const NAME_CAPTURE = /\b(?:my name is|i am called|call me|i'?m|i am|this is)\s+([a-z][a-z\-']{1,20})\b/i;
const NAME_BLOCKLIST = new Set([
  'a', 'an', 'the', 'not', 'here', 'bored', 'tired', 'fine', 'good', 'bad',
  'sorry', 'confused', 'lost', 'back', 'done', 'hungry', 'sure', 'trying',
  'looking', 'asking', 'wondering', 'working', 'learning', 'just', 'really',
  'very', 'kinda', 'sort', 'maybe', 'probably',
]);

function tryCaptureName(input: string): string | null {
  const m = input.match(NAME_CAPTURE);
  if (!m) return null;
  const raw = m[1].trim();
  if (NAME_BLOCKLIST.has(raw.toLowerCase())) return null;
  const cleaned = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  userName = cleaned;
  return cleaned;
}

// ─── ELIZA REFLECTION ─────────────────────────────────────────────────────────

const REFLECTIONS: Record<string, string> = {
  'i': 'you', 'me': 'you', 'my': 'your', 'mine': 'yours', 'am': 'are',
  'was': 'were', "i'm": 'you are', "i've": 'you have', "i'll": 'you will',
  "i'd": 'you would', 'myself': 'yourself',
  'you': 'I', 'your': 'my', 'yours': 'mine', 'are': 'am', "you're": 'I am',
  "you've": 'I have', "you'll": 'I will', 'yourself': 'myself',
};

function reflect(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, '')
    .split(/\s+/)
    .map((w) => REFLECTIONS[w] ?? w)
    .join(' ')
    .trim();
}

type ElizaRule = { pattern: RegExp; render: (m: RegExpMatchArray) => string[] };

const ELIZA_RULES: ElizaRule[] = [
  {
    pattern: /\bi (?:feel|am feeling) (.+)/i,
    render: (m) => [
      '',
      `  Do you often feel ${reflect(m[1])}?`,
      '  (I ask as a program with zero feelings of my own.)',
      '',
    ],
  },
  {
    pattern: /\bi (?:am|'m) (?!sorry|fine|okay|ok|good|bad|tired|bored)(.+)/i,
    render: (m) => [
      '',
      `  Why are you ${reflect(m[1])}?`,
      '  "Sometimes the questions are complicated and the answers are simple."',
      '  — Dr. Seuss, probably not about this conversation.',
      '',
    ],
  },
  {
    pattern: /\bi (?:want|need|wish|would like) (?:to )?(.+)/i,
    render: (m) => [
      '',
      `  What would it mean for you to ${reflect(m[1])}?`,
      '  Chidi would want to reason through that for 90 minutes.',
      '',
    ],
  },
  {
    pattern: /\bi can(?:no|')?t (.+)/i,
    render: (m) => [
      '',
      `  What would it take for you to ${reflect(m[1])}?`,
      '  (This is the pep talk portion of the terminal.)',
      '',
    ],
  },
  {
    pattern: /\bi (?:think|believe|guess|suppose) (.+)/i,
    render: (m) => [
      '',
      `  Do you really think ${reflect(m[1])}?`,
      '  "Not sure. Haven\'t decided yet." — Jeff Winger on every belief.',
      '',
    ],
  },
  {
    pattern: /\byou are (.+)|you'?re (.+)/i,
    render: (m) => [
      '',
      `  What makes you think I am ${(m[1] ?? m[2]).replace(/[.!?]+$/g, '')}?`,
      '  I\'m just a bunch of regular expressions in a trench coat.',
      '',
    ],
  },
  {
    pattern: /\bwhy (.+)\?/i,
    render: (m) => [
      '',
      `  Why do you think ${reflect(m[1])}?`,
      '  (Deflecting the question is the oldest chatbot trick.)',
      '',
    ],
  },
  {
    pattern: /\?$/,
    render: () => [
      '',
      '  Good question. I don\'t know, but I respect the curiosity.',
      '  Try `help` if you want something I\'m actually equipped to answer.',
      '',
    ],
  },
  {
    pattern: /^(yes|yeah|yep|yup|sure|definitely|absolutely)\b/i,
    render: () => [
      '',
      '  You seem sure about that.',
      '  Confidence is a virtue. Or a red flag. Depends on Chidi.',
      '',
    ],
  },
  {
    pattern: /^(no|nope|nah|never)\b/i,
    render: () => [
      '',
      '  Why not?',
      '  "The more you deny it, the more I believe it." — Jean-Ralphio, probably.',
      '',
    ],
  },
];

// ─── EXPORTED RESPONDER ───────────────────────────────────────────────────────

function addressByName(lines: string[]): string[] {
  if (!userName) return lines;
  // Sprinkle the name into the first non-empty response line ~50% of the time
  if (Math.random() > 0.5) return lines;
  return lines.map((line, i) => {
    if (i > 0 && line.trim().length > 0 && !line.includes(userName!)) {
      return `  ${userName}, ${line.trimStart().charAt(0).toLowerCase()}${line.trimStart().slice(1)}`;
    }
    return line;
  }).slice(0, lines.length);
}

export function chatbotRespond(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1. Name capture: if the user introduced themselves, remember and greet back.
  const captured = tryCaptureName(trimmed);
  if (captured) {
    return [
      '',
      `  Nice to meet you, ${captured}.`,
      '  I\'ll try to remember that. (Memory resets on page reload — sorry.)',
      '  "People are friends, not food." — Bruce the Shark, Finding Nemo.',
      '',
    ];
  }

  // 2. Canned pattern quips (sitcom references for common inputs).
  for (let i = 0; i < PATTERNS.length; i++) {
    if (PATTERNS[i].keywords.test(trimmed)) {
      return addressByName(pick(i, PATTERNS[i].responses));
    }
  }

  // 3. ELIZA-style reflection for freeform input.
  for (const rule of ELIZA_RULES) {
    const m = trimmed.match(rule.pattern);
    if (m) return addressByName(rule.render(m));
  }

  // 4. Last resort: rotate through canned fallbacks.
  const response = FALLBACKS[fallbackIndex % FALLBACKS.length];
  fallbackIndex++;
  return addressByName(response);
}
