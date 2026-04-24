import { useState, useRef, useEffect, useCallback } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { runCommand } from '../commands/index';
import { chatbotRespond } from '../commands/chatbot';

const HAKANAI_ENDPOINT =
  'https://hakanai.io/campaign/33c130d9-115d-4297-9a4f-543ef77b3330/subscribe';

const SUBMITTING_LINES = [
  '> Validating address................... OK',
  '> Connecting to hakanai.io............. OK',
  '> Submitting subscription..............',
];

type Stage = 'shell' | 'input' | 'submitting' | 'success' | 'error';

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
  const [stage, setStage] = useState<Stage>('shell');
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [email, setEmail] = useState('');
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { displayedLines: statusLines, done: statusDone } = useTypewriter(SUBMITTING_LINES, stage === 'submitting');

  // Drive the chat typewriter + commit to history when done. Owning both
  // concerns in one effect avoids stale-state races between re-renders.
  useEffect(() => {
    if (chatPhase !== 'typing' || !pendingChat) return;
    const target = pendingChat;
    let canceled = false;
    let lineIdx = 0;
    let charIdx = 0;
    const typed: string[] = [];

    const CHAR_MS = 10;
    const LINE_MS = 45;

    const tick = () => {
      if (canceled) return;
      if (lineIdx >= target.lines.length) {
        setShellHistory((prev) => [...prev, {
          input: target.input,
          output: target.lines,
          prompt: target.prompt,
        }]);
        setPendingChat(null);
        setChatPhase('idle');
        setChatLines([]);
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
  }, [chatPhase, pendingChat]);

  // Live clock for the status bar
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Focus appropriate input per stage. Also refocus the shell input whenever
  // the chatbot animation finishes — the live prompt is unmounted while the
  // bot types, so focus gets dropped and keypresses would silently no-op.
  useEffect(() => {
    if (stage === 'input') emailInputRef.current?.focus();
    if (stage === 'shell' && chatPhase === 'idle') shellInputRef.current?.focus();
  }, [stage, chatPhase]);

  // After status lines type out, submit the hidden form (no CORS restriction)
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
    setSubmitLines(['', '  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 100%', '']);
    setStage('success');
    // Return to the shell prompt after a beat so the user can read the success message
    setTimeout(() => setStage('shell'), 1800);
  }, []);

  // Scroll the body to its bottom whenever content changes — scope to the
  // scroll container itself so ancestor scrollables (html/body) aren't affected.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  // Email form submit
  const handleEmailSubmit = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setSubmittedEmail(trimmed);
    setStage('submitting');
  }, [email]);

  // Shell command execution
  const handleShellSubmit = useCallback(async () => {
    const raw = shellInput.trim();
    const promptAtEntry = chatbotMode ? 'you \u203a' : 'subscriber@michaellamb:~$';
    setShellInput('');
    setHistoryIndex(-1);

    if (raw) setInputHistory((prev) => [raw, ...prev]);

    // `subscribe` is a UI-mode-switching command handled here rather than in runCommand
    if (raw.toLowerCase() === 'subscribe') {
      setShellHistory((prev) => [...prev, { input: raw, output: [], prompt: promptAtEntry }]);
      setEmail('');
      setStage('input');
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
  }, [shellInput, chatbotMode]);

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

  const shellPrompt = chatbotMode ? 'you \u203a' : 'subscriber@michaellamb:~$';
  const inSubscribeFlow = stage === 'input' || stage === 'submitting' || stage === 'success' || stage === 'error';

  return (
    <div className="fixed inset-0 bg-terminal-bg scanlines flex flex-col font-mono overflow-hidden">
      {/* Hidden form + iframe — form GET bypasses CORS, iframe absorbs the redirect */}
      <form
        ref={formRef}
        action={HAKANAI_ENDPOINT}
        method="get"
        target="hakanai-frame"
        className="hidden"
        aria-hidden="true"
      >
        <input type="hidden" name="email" value={submittedEmail} />
      </form>
      <iframe
        name="hakanai-frame"
        title="newsletter-submit"
        className="hidden"
        onLoad={handleIframeLoad}
      />

      {/* tmux-style top status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-terminal-muted text-xs shrink-0">
        <div className="flex items-center gap-3 text-terminal-green glow-dim">
          <span>[michaellamb]</span>
          <span className="text-terminal-bar-dim">0:</span>
          <span>shell*</span>
          <span className="text-terminal-bar-dim">1:subscribe-</span>
        </div>
        <div className="flex items-center gap-3 text-terminal-bar-dim">
          <span>"subscriber@michaellamb"</span>
          <span className="text-terminal-green glow-dim">{clock}</span>
        </div>
      </div>

      {/* Terminal body — scrolls internally */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 text-sm leading-relaxed"
        onClick={() => {
          if (stage === 'shell') shellInputRef.current?.focus();
          if (stage === 'input') emailInputRef.current?.focus();
        }}
      >

            {/* MOTD */}
            <div className="text-terminal-green glow font-bold">
              michaellamb.dev newsletter shell — v1.0.0
            </div>
            <div className="text-terminal-dim">
              Type <span className="text-terminal-green">`help`</span> for commands, or{' '}
              <span className="text-terminal-green">`subscribe`</span> to join the newsletter.
            </div>
            <div>&nbsp;</div>

            {/* Shell history */}
            {shellHistory.map((entry, i) => (
              <div key={i}>
                <div className="flex items-center text-terminal-green glow mt-1">
                  <span className="mr-2 shrink-0">{entry.prompt}</span>
                  <span>{entry.input}</span>
                </div>
                {entry.output.map((line, j) => (
                  <div key={j} className="text-terminal-dim whitespace-pre">{line ? renderOutputLine(line) : '\u00a0'}</div>
                ))}
              </div>
            ))}

            {/* Pending chatbot response — echoes the user input, shows a
                thinking indicator, then types the response. */}
            {pendingChat && (
              <div>
                <div className="flex items-center text-terminal-green glow mt-1">
                  <span className="mr-2 shrink-0">{pendingChat.prompt}</span>
                  <span>{pendingChat.input}</span>
                </div>
                {chatPhase === 'thinking' && (
                  <div className="text-terminal-dim mt-1">
                    <span className="cursor-blink">thinking…</span>
                  </div>
                )}
                {chatPhase === 'typing' && chatLines.map((line, j) => (
                  <div key={j} className="text-terminal-dim whitespace-pre">{line ? renderOutputLine(line) : '\u00a0'}</div>
                ))}
              </div>
            )}

            {/* Email input prompt (subscribe sub-flow) */}
            {inSubscribeFlow && (
              <div className="flex items-center text-terminal-green glow mt-1">
                <span className="mr-2 shrink-0">Enter email address:</span>
                {stage === 'input' ? (
                  <div
                    className="relative flex items-center flex-1 min-w-0 cursor-text"
                    onClick={() => emailInputRef.current?.focus()}
                  >
                    <input
                      ref={emailInputRef}
                      className="absolute inset-0 w-full h-full opacity-0 bg-transparent border-0 outline-none"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { handleEmailSubmit(); }
                        if (e.key === 'c' && e.ctrlKey) {
                          e.preventDefault();
                          setEmail('');
                          setStage('shell');
                        }
                      }}
                      autoComplete="email"
                      spellCheck={false}
                    />
                    <span className="text-terminal-green glow">{email}</span>
                    <span className="cursor-blink select-none">█</span>
                  </div>
                ) : (
                  <span className="glow ml-1">{submittedEmail}</span>
                )}
              </div>
            )}

            {/* Subscribe button */}
            {stage === 'input' && (
              <div className="mt-4">
                <button
                  onClick={handleEmailSubmit}
                  className="text-terminal-bg bg-terminal-green font-bold px-4 py-1 rounded text-xs hover:bg-terminal-dim hover:text-terminal-green transition-colors duration-150 glow"
                >
                  [ SUBSCRIBE ]
                </button>
                <span className="ml-3 text-terminal-muted text-xs">or press Enter</span>
                <span className="ml-4 text-terminal-muted text-xs">Ctrl+C to quit</span>
              </div>
            )}

            {/* Submitting status lines */}
            {(stage === 'submitting' || stage === 'success' || stage === 'error') && (
              <div className="mt-2">
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

            {/* Success block */}
            {(stage === 'success' || (stage === 'shell' && submittedEmail)) && (
              <div className="mt-3">
                {submitLines.map((line, i) => (
                  <div key={i} className="text-terminal-green glow">{line || '\u00a0'}</div>
                ))}
                <div className="mt-1 text-terminal-green glow font-bold text-base">
                  SUBSCRIPTION CONFIRMED
                </div>
                <div className="text-terminal-dim mt-1">
                  Check your inbox for a welcome email.
                </div>
                <div className="text-terminal-dim">
                  You will receive new posts at:{' '}
                  <span className="text-terminal-green">{submittedEmail}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {stage === 'error' && (
              <div className="mt-3">
                <div className="text-terminal-error font-bold">ERROR: CONNECTION_REFUSED</div>
                <div className="text-terminal-dim mt-1">
                  Could not reach the server. Check your connection or email{' '}
                  <a href="mailto:michael@michaellamb.dev" className="text-terminal-green underline">
                    michael@michaellamb.dev
                  </a>
                </div>
              </div>
            )}

            {/* Live shell prompt — hidden while the chatbot is answering */}
            {stage === 'shell' && chatPhase === 'idle' && (
              <div
                className="relative flex items-center text-terminal-green glow mt-1 cursor-text"
                onClick={() => shellInputRef.current?.focus()}
              >
                <span className="mr-2 shrink-0">{shellPrompt}</span>
                <input
                  ref={shellInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 bg-transparent border-0 outline-none"
                  type="text"
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  onKeyDown={handleShellKeyDown}
                  autoComplete="off"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                />
                <span className="text-terminal-green glow">{shellInput}</span>
                <span className="cursor-blink select-none">█</span>
              </div>
            )}

        <div ref={bottomRef} />
      </div>

      {/* tmux-style bottom keybinds bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-terminal-muted text-xs shrink-0 text-terminal-bar-dim">
        <div className="flex items-center gap-4">
          <span><span className="text-terminal-green glow-dim">^C</span> quit</span>
          <span><span className="text-terminal-green glow-dim">↑↓</span> history</span>
          <span><span className="text-terminal-green glow-dim">help</span> commands</span>
          <span><span className="text-terminal-green glow-dim">subscribe</span> newsletter</span>
        </div>
        <div>
          <a
            href="https://blog.michaellamb.dev"
            className="hover:text-terminal-green transition-colors"
          >
            ← blog.michaellamb.dev
          </a>
        </div>
      </div>
    </div>
  );
}
