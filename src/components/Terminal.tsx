import { useState, useRef, useEffect, useCallback } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { runCommand } from '../commands/index';
import { chatbotRespond } from '../commands/chatbot';

const HAKANAI_ENDPOINT =
  'https://hakanai.io/campaign/33c130d9-115d-4297-9a4f-543ef77b3330/subscribe';

const SUBMITTING_LINES = [
  '> Validating address................... OK',
  '> Connecting to hakanai.io............. OK',
  '> Submitting subscription..............',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribe-flow state. The email form is always on the page now, so there is
 * no longer a stage for "showing the form" — `idle` means it is accepting
 * input, and the rest are the submit lifecycle.
 */
type Stage = 'idle' | 'submitting' | 'success' | 'error';

type HistoryEntry = {
  input: string;
  output: string[];
  /** Snapshot of the prompt at the moment the command was entered. */
  prompt: string;
};

const URL_RE = /https?:\/\/[^\s]+/g;

function renderOutputLine(line: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-terminal-green underline hover:glow transition-all"
      >
        {match[0]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length > 0 ? parts : line;
}

function formatClock(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function Terminal() {
  const [stage, setStage] = useState<Stage>('idle');
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitLines, setSubmitLines] = useState<string[]>([]);
  // Shell REPL state
  const [shellHistory, setShellHistory] = useState<HistoryEntry[]>([]);
  const [shellInput, setShellInput] = useState('');
  const [chatbotMode, setChatbotMode] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Chatbot streaming: while the bot is "thinking" / "typing" a response,
  // the input is pending and the incoming response is rendered below history
  // with a thinking indicator then the typewriter effect.
  const [pendingChat, setPendingChat] = useState<{ input: string; prompt: string; lines: string[] } | null>(null);
  const [chatPhase, setChatPhase] = useState<'idle' | 'thinking' | 'typing'>('idle');
  const [chatLines, setChatLines] = useState<string[]>([]);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const shellInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const subscribeRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The subscribe panel sits at the top of the scroll area while the
  // auto-scroller pins to the bottom, so `subscribe` has to win that fight.
  // Bumping this counter requests a jump; the effect that honours it is
  // declared *after* the auto-scroller, and React runs effects in declaration
  // order, so the jump is always the last word on scroll position.
  const [jumpRequest, setJumpRequest] = useState(0);

  const reducedMotion = usePrefersReducedMotion();
  const { displayedLines: statusLines, done: statusDone } = useTypewriter(SUBMITTING_LINES, stage === 'submitting');

  // Drive the chat typewriter + commit to history when done. Owning both
  // concerns in one effect avoids stale-state races between re-renders.
  useEffect(() => {
    if (chatPhase !== 'typing' || !pendingChat) return;
    const target = pendingChat;

    const commit = () => {
      setShellHistory((prev) => [...prev, {
        input: target.input,
        output: target.lines,
        prompt: target.prompt,
      }]);
      setPendingChat(null);
      setChatPhase('idle');
      setChatLines([]);
    };

    // Reduced motion: skip the per-character reveal entirely. The response
    // still lands in history, which is what the live region announces.
    if (reducedMotion) {
      commit();
      return;
    }

    let canceled = false;
    let lineIdx = 0;
    let charIdx = 0;
    const typed: string[] = [];

    const CHAR_MS = 10;
    const LINE_MS = 45;

    const tick = () => {
      if (canceled) return;
      if (lineIdx >= target.lines.length) {
        commit();
        return;
      }
      const line = target.lines[lineIdx];
      if (charIdx <= line.length) {
        typed[lineIdx] = line.slice(0, charIdx);
        setChatLines([...typed]);
        charIdx++;
        setTimeout(tick, CHAR_MS);
      } else {
        lineIdx++;
        charIdx = 0;
        setTimeout(tick, LINE_MS);
      }
    };

    const start = setTimeout(tick, LINE_MS);
    return () => {
      canceled = true;
      clearTimeout(start);
    };
  }, [chatPhase, pendingChat, reducedMotion]);

  // Live clock for the status bar
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Refocus the shell input whenever the chatbot animation finishes — the live
  // prompt is unmounted while the bot types, so focus gets dropped and
  // keypresses would silently no-op.
  useEffect(() => {
    if (chatPhase === 'idle') shellInputRef.current?.focus();
  }, [chatPhase]);

  // After status lines type out, submit the real form into the hidden iframe
  // (a plain GET navigation, so no CORS restriction applies).
  useEffect(() => {
    if (statusDone && stage === 'submitting') {
      pendingRef.current = true;
      timeoutRef.current = setTimeout(() => {
        if (pendingRef.current) {
          pendingRef.current = false;
          setStage('error');
        }
      }, 10_000);
      formRef.current?.submit();
    }
  }, [statusDone, stage]);

  // Iframe load = Hakanai responded; treat as success
  const handleIframeLoad = useCallback(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSubmitLines(['', '  ██████████████████████████████ 100%', '']);
    setStage('success');
  }, []);

  // Scroll the body to its bottom whenever content changes — scope to the
  // scroll container itself so ancestor scrollables (html/body) aren't affected.
  //
  // The dependency list matters: this used to run on every render, which meant
  // the once-a-second clock tick re-pinned the view to the bottom. Harmless
  // when the only thing down there was the prompt, but it fought `subscribe`
  // for the scroll position and dragged the view off the focused email field a
  // second after jumping to it.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shellHistory, chatLines, chatPhase, pendingChat, stage, statusLines, submitLines, emailError]);

  // Honour a `subscribe` jump. Declared after the auto-scroller on purpose —
  // on the render where both fire, this one runs second and wins.
  useEffect(() => {
    if (jumpRequest === 0) return;
    subscribeRef.current?.scrollIntoView({
      block: 'center',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    emailInputRef.current?.focus();
  }, [jumpRequest, reducedMotion]);

  /** Bring the subscribe panel back into view and put the caret in it. */
  const focusSubscribeForm = useCallback(() => {
    setJumpRequest((n) => n + 1);
  }, []);

  // Email form submit
  const handleEmailSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (stage === 'submitting') return;
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('No address entered. Type your email above, then press Enter.');
      emailInputRef.current?.focus();
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError(`Not a valid email address: ${trimmed}`);
      emailInputRef.current?.focus();
      return;
    }
    setEmailError('');
    setSubmittedEmail(trimmed);
    setStage('submitting');
  }, [email, stage]);

  // Shell command execution
  const handleShellSubmit = useCallback(async () => {
    const raw = shellInput.trim();
    const promptAtEntry = chatbotMode ? 'you ›' : 'subscriber@michaellamb:~$';
    setShellInput('');
    setHistoryIndex(-1);

    if (raw) setInputHistory((prev) => [raw, ...prev]);

    // `subscribe` no longer summons the form — the form is always on the page,
    // so the command just takes you to it.
    if (raw.toLowerCase() === 'subscribe') {
      setShellHistory((prev) => [...prev, {
        input: raw,
        output: ['', '  Jumping to the subscribe form.', ''],
        prompt: promptAtEntry,
      }]);
      focusSubscribeForm();
      return;
    }

    const KNOWN_COMMANDS = ['help', 'about', 'blog', 'links', 'apps', 'film', 'chatbot', 'exit', 'subscribe', ''];
    const isKnownCommand = KNOWN_COMMANDS.includes(raw.toLowerCase());

    // Chatbot responses stream in (thinking → typewriter) rather than
    // appearing instantly — makes the conversation feel less like a lookup.
    // Enforce a minimum "thinking" window so a fast fetch doesn't feel jarring.
    if (chatbotMode && !isKnownCommand) {
      setChatLines([]);
      setPendingChat({ input: raw, prompt: promptAtEntry, lines: [] });
      setChatPhase('thinking');
      const [lines] = await Promise.all([
        chatbotRespond(raw),
        new Promise<void>((resolve) => setTimeout(resolve, 700)),
      ]);
      setPendingChat({ input: raw, prompt: promptAtEntry, lines });
      setChatPhase('typing');
      return;
    }

    const result = await runCommand(raw);
    const output = result.lines;
    if (result.enterChatbot) setChatbotMode(true);
    if (result.exitChatbot) setChatbotMode(false);

    setShellHistory((prev) => [...prev, { input: raw, output, prompt: promptAtEntry }]);
  }, [shellInput, chatbotMode, focusSubscribeForm]);

  const handleShellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+C: cancel any in-flight chatbot response, exit chatbot mode if active,
    // otherwise just clear the current input line (matching a real terminal's SIGINT).
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setShellInput('');
      setHistoryIndex(-1);
      if (pendingChat) {
        setPendingChat(null);
        setChatLines([]);
        setChatPhase('idle');
      }
      if (chatbotMode) {
        setChatbotMode(false);
        setShellHistory((prev) => [...prev, {
          input: '^C',
          output: ['', '  Exiting chatbot mode.', ''],
          prompt: 'you ›',
        }]);
      }
      return;
    }
    // Ignore Enter while the chatbot is still producing a response.
    if (chatPhase !== 'idle' && e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      handleShellSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, inputHistory.length - 1);
      setHistoryIndex(next);
      if (inputHistory[next] !== undefined) setShellInput(inputHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setShellInput(next < 0 ? '' : (inputHistory[next] ?? ''));
    }
  };

  const shellPrompt = chatbotMode ? 'you ›' : 'subscriber@michaellamb:~$';
  const submitting = stage === 'submitting';

  return (
    <div className="terminal-app fixed inset-0 bg-terminal-bg scanlines flex flex-col font-mono overflow-hidden">
      {/* Absorbs the redirect from the form GET so the page itself never navigates. */}
      <iframe
        name="hakanai-frame"
        title="newsletter-submit"
        className="hidden"
        aria-hidden="true"
        onLoad={handleIframeLoad}
      />

      {/* tmux-style top status bar — pure chrome, nothing focusable inside. */}
      <div
        className="flex items-center justify-between px-[0.5em] py-[0.25em] bg-terminal-muted text-[0.6em] shrink-0"
        aria-hidden="true"
      >
        <div className="flex items-center gap-[0.7em] text-terminal-green glow-dim">
          <span>[michaellamb]</span>
          <span className="text-terminal-bar-dim">0:</span>
          <span>shell*</span>
          <span className="text-terminal-bar-dim">1:subscribe-</span>
        </div>
        <div className="flex items-center gap-[0.7em] text-terminal-bar-dim">
          <span className="hidden sm:inline">"subscriber@michaellamb"</span>
          <span className="text-terminal-green glow-dim">{clock}</span>
        </div>
      </div>

      {/* Terminal body — scrolls internally */}
      <main
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-[0.6em] text-[1em] leading-relaxed"
        onClick={(e) => {
          // Clicking empty terminal space focuses the prompt, the way a real
          // terminal does — but never steal focus away from a real control.
          if ((e.target as HTMLElement).closest('a, button, input, label, form')) return;
          shellInputRef.current?.focus();
        }}
      >
        {/* MOTD */}
        <h1 className="text-terminal-green glow font-bold text-[1em]">
          michaellamb.dev newsletter shell — v1.0.0
        </h1>
        <p className="text-terminal-dim">
          Enter your email below to subscribe, or type{' '}
          <span className="text-terminal-green">help</span> for commands.
        </p>

        {/* Subscribe panel — always on the page. This is the whole point of the
            site, so it does not hide behind a command. */}
        <section
          ref={subscribeRef}
          aria-labelledby="subscribe-heading"
          className="my-[0.7em] border border-terminal-dim rounded p-[0.6em]"
        >
          <h2 id="subscribe-heading" className="sr-only">
            Subscribe to the newsletter
          </h2>

          {stage !== 'success' && (
            <form
              ref={formRef}
              action={HAKANAI_ENDPOINT}
              method="get"
              target="hakanai-frame"
              onSubmit={handleEmailSubmit}
              noValidate
            >
              <label
                htmlFor="subscribe-email"
                className="block text-terminal-green glow"
              >
                Enter email address:
              </label>
              <div className="flex items-center gap-[0.6em] mt-[0.3em] flex-wrap">
                <input
                  ref={emailInputRef}
                  id="subscribe-email"
                  name="email"
                  type="email"
                  className="terminal-input flex-1 min-w-[10ch] max-w-[26ch]"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'c' && e.ctrlKey) {
                      e.preventDefault();
                      setEmail('');
                      setEmailError('');
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  readOnly={submitting}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'subscribe-email-error' : undefined}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-terminal-bg bg-terminal-green font-bold px-[0.8em] py-[0.25em] rounded text-[0.7em] hover:bg-terminal-muted hover:text-terminal-green transition-colors duration-150 glow disabled:opacity-60"
                >
                  [ SUBSCRIBE ]
                </button>
              </div>
              {emailError && (
                <p
                  id="subscribe-email-error"
                  role="alert"
                  className="text-terminal-error mt-[0.3em]"
                >
                  {emailError}
                </p>
              )}
            </form>
          )}

          {/* Submit progress theatre — decorative, and it re-renders per
              character, so it stays out of the announcement path entirely.
              Persists through success and error the way it always has, so the
              transcript of what happened stays on screen. */}
          {stage !== 'idle' && (
            <div className="mt-[0.5em]" aria-hidden="true">
              {statusLines.map((line, i) => {
                const isLast = i === statusLines.length - 1;
                const suffix = isLast && statusDone
                  ? stage === 'error' ? ' FAILED' : ' OK'
                  : '';
                return (
                  <div
                    key={i}
                    className={
                      stage === 'error' && isLast && statusDone
                        ? 'text-terminal-error'
                        : 'text-terminal-green glow-dim'
                    }
                  >
                    {line}{suffix}
                  </div>
                );
              })}
            </div>
          )}
          {submitting && (
            <p className="sr-only" role="status">
              Submitting your subscription.
            </p>
          )}

          {stage === 'success' && (
            <div className="mt-[0.5em]" role="status">
              <div aria-hidden="true">
                {submitLines.map((line, i) => (
                  <div key={i} className="text-terminal-green glow">{line || ' '}</div>
                ))}
              </div>
              <p className="text-terminal-green glow font-bold text-[1.15em]">
                ONE MORE STEP — CHECK YOUR EMAIL
              </p>
              <p className="text-terminal-dim mt-[0.3em]">
                We sent a verification link to{' '}
                <span className="text-terminal-green">{submittedEmail}</span>. You are not
                subscribed until you click it, and the link expires — so if it goes stale,
                run <span className="text-terminal-green">subscribe</span> again.
              </p>
            </div>
          )}

          {stage === 'error' && (
            <div className="mt-[0.5em]" role="alert">
              <p className="text-terminal-error font-bold">ERROR: CONNECTION_REFUSED</p>
              <p className="text-terminal-dim mt-[0.3em]">
                Could not reach the server. Check your connection, try again, or email{' '}
                <a
                  href="mailto:michael@michaellamb.dev"
                  className="text-terminal-green underline"
                >
                  michael@michaellamb.dev
                </a>
              </p>
            </div>
          )}
        </section>

        {/* Shell history. This is the announcement surface: entries land here
            already complete, one at a time, so a screen reader reads whole
            command output rather than a per-character stream. */}
        <div role="log" aria-live="polite" aria-label="Terminal output">
          {shellHistory.map((entry, i) => (
            <div key={i}>
              <div className="flex items-center text-terminal-green glow mt-[0.3em]">
                <span className="mr-2 shrink-0">{entry.prompt}</span>
                <span>{entry.input}</span>
              </div>
              {entry.output.map((line, j) => (
                <div key={j} className="text-terminal-dim terminal-line">{line ? renderOutputLine(line) : ' '}</div>
              ))}
            </div>
          ))}
        </div>

        {/* Pending chatbot response — echoes the user input, shows a thinking
            indicator, then types the response. Hidden from assistive tech
            while it animates; the finished answer is announced once it commits
            to history above. */}
        {pendingChat && (
          <div aria-hidden="true">
            <div className="flex items-center text-terminal-green glow mt-[0.3em]">
              <span className="mr-2 shrink-0">{pendingChat.prompt}</span>
              <span>{pendingChat.input}</span>
            </div>
            {chatPhase === 'thinking' && (
              <div className="text-terminal-dim mt-[0.3em]">
                <span className="cursor-blink">thinking…</span>
              </div>
            )}
            {chatPhase === 'typing' && chatLines.map((line, j) => (
              <div key={j} className="text-terminal-dim terminal-line">{line ? renderOutputLine(line) : ' '}</div>
            ))}
          </div>
        )}
        {chatPhase === 'thinking' && (
          <p className="sr-only" role="status">Thinking…</p>
        )}

        {/* Live shell prompt — hidden while the chatbot is answering */}
        {chatPhase === 'idle' && (
          <div className="flex items-center text-terminal-green glow mt-[0.3em]">
            <label htmlFor="shell-input" className="sr-only">
              Terminal command
            </label>
            <span className="mr-2 shrink-0" aria-hidden="true">{shellPrompt}</span>
            <input
              ref={shellInputRef}
              id="shell-input"
              className="terminal-input flex-1 min-w-0"
              type="text"
              value={shellInput}
              onChange={(e) => setShellInput(e.target.value)}
              onKeyDown={handleShellKeyDown}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
            />
          </div>
        )}
      </main>

      {/* tmux-style bottom keybinds bar */}
      <footer className="flex items-center justify-between px-[0.5em] py-[0.25em] bg-terminal-muted text-[0.6em] shrink-0 text-terminal-bar-dim">
        {/* Keyboard-only affordances: meaningless on a touch device, and they
            overflow a phone, so they only appear where they apply. */}
        <div className="hidden sm:flex items-center gap-[0.9em]" aria-hidden="true">
          <span><span className="text-terminal-green glow-dim">^C</span> quit</span>
          <span><span className="text-terminal-green glow-dim">↑↓</span> history</span>
          <span><span className="text-terminal-green glow-dim">help</span> commands</span>
          <span><span className="text-terminal-green glow-dim">subscribe</span> newsletter</span>
        </div>
        <a
          href="https://blog.michaellamb.dev"
          className="ml-auto hover:text-terminal-green transition-colors underline"
        >
          ← blog.michaellamb.dev
        </a>
      </footer>
    </div>
  );
}
