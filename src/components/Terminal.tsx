import { useState, useRef, useEffect, useCallback } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { runCommand } from '../commands/index';
import { chatbotRespond } from '../commands/chatbot';

const HAKANAI_ENDPOINT =
  'https://hakanai.io/campaign/33c130d9-115d-4297-9a4f-543ef77b3330/subscribe';

const BOOT_LINES = [
  'MICHAEL LAMB OS v2.0.26',
  'Copyright (c) 2026 michaellamb.dev. All rights reserved.',
  '',
  '[BOOT] Initializing filesystem.............. OK',
  '[BOOT] Loading blog.michaellamb.dev......... OK',
  '[BOOT] Connecting to newsletter service..... OK',
  '[BOOT] Awaiting subscriber input............ READY',
  '',
  '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '  Skip the algorithm. Get the blog.',
  '  New posts land in your inbox, not your feed.',
  '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '',
];

const LAUNCH_LINES = [
  'subscriber@michaellamb:~$ subscribe --interactive',
  '',
  '  subscribe v1.0.0  \u2014  michaellamb.dev newsletter client',
  '  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '  New posts delivered straight to your inbox.',
  '  No algorithms. No noise. Unsubscribe any time.',
  '  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  '',
];

const SUBMITTING_LINES = [
  '> Validating address................... OK',
  '> Connecting to hakanai.io............. OK',
  '> Submitting subscription..............',
];

type Stage = 'booting' | 'launching' | 'input' | 'submitting' | 'success' | 'shell' | 'error';

type HistoryEntry = {
  input: string;
  output: string[];
};

// Guard against undefined entries from the typewriter hook's sparse array
function classifyLine(line: string | undefined): string {
  if (line === undefined || line === '') return 'text-terminal-dim';
  if (line.includes('OK')) return 'text-terminal-green glow-dim';
  if (line.includes('READY')) return 'text-terminal-green glow';
  if (line.startsWith('[BOOT]')) return 'text-terminal-dim';
  if (line.startsWith('\u2500')) return 'text-terminal-dim';
  if (line.includes('Skip the algorithm')) return 'text-terminal-green glow font-bold';
  return 'text-terminal-dim';
}

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

export function Terminal() {
  const [stage, setStage] = useState<Stage>('booting');
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitLines, setSubmitLines] = useState<string[]>([]);
  const [quitInput, setQuitInput] = useState<string | null>(null); // non-null = arrived via Ctrl+C
  // Shell REPL state
  const [shellHistory, setShellHistory] = useState<HistoryEntry[]>([]);
  const [shellInput, setShellInput] = useState('');
  const [chatbotMode, setChatbotMode] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const shellInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { displayedLines: bootLines, done: bootDone } = useTypewriter(BOOT_LINES, stage === 'booting');
  const { displayedLines: launchLines, done: launchDone } = useTypewriter(LAUNCH_LINES, stage === 'launching');
  const { displayedLines: statusLines, done: statusDone } = useTypewriter(SUBMITTING_LINES, stage === 'submitting');

  // booting → launching → input
  useEffect(() => {
    if (bootDone && stage === 'booting') setStage('launching');
  }, [bootDone, stage]);

  useEffect(() => {
    if (launchDone && stage === 'launching') setStage('input');
  }, [launchDone, stage]);

  // Focus appropriate input per stage
  useEffect(() => {
    if (stage === 'input') emailInputRef.current?.focus();
    if (stage === 'shell') shellInputRef.current?.focus();
  }, [stage]);

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
    // Transition to shell after a beat so the user can read the success message
    setTimeout(() => setStage('shell'), 1800);
  }, []);

  // Scroll to bottom whenever content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setShellInput('');
    setHistoryIndex(-1);

    if (raw) setInputHistory((prev) => [raw, ...prev]);

    const KNOWN_COMMANDS = ['help', 'about', 'blog', 'links', 'film', 'chatbot', 'exit', ''];
    const isKnownCommand = KNOWN_COMMANDS.includes(raw.toLowerCase());

    let output: string[];

    if (chatbotMode && !isKnownCommand) {
      output = chatbotRespond(raw);
    } else {
      const result = await runCommand(raw);
      output = result.lines;
      if (result.enterChatbot) setChatbotMode(true);
      if (result.exitChatbot) setChatbotMode(false);
    }

    setShellHistory((prev) => [...prev, { input: raw, output }]);
  }, [shellInput, chatbotMode]);

  const handleShellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const isPostBoot = stage !== 'booting';
  const isPostLaunch = !['booting', 'launching'].includes(stage);
  const isPostInput = !['booting', 'launching', 'input'].includes(stage);

  return (
    <div className="min-h-screen bg-terminal-bg scanlines flex items-center justify-center p-4 font-mono">
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

      <div className="w-full max-w-2xl">
        <div className="screen-glow rounded-lg border border-terminal-muted overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-terminal-muted border-b border-terminal-muted">
            <span className="w-3 h-3 rounded-full bg-red-600 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
            <span className="ml-2 text-xs text-terminal-dim">
              subscriber@michaellamb — newsletter v1
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-5 text-sm leading-relaxed min-h-64">

            {/* Boot lines */}
            {bootLines.map((line, i) => (
              <div key={i} className={classifyLine(line)}>{line || '\u00a0'}</div>
            ))}

            {/* Launch lines */}
            {isPostBoot && launchLines.map((line, i) => (
              <div key={i} className={
                line.startsWith('subscriber@') ? 'text-terminal-green glow' :
                line.startsWith('  \u2500') || line === '' ? 'text-terminal-dim' :
                line.startsWith('  subscribe v') ? 'text-terminal-green font-bold' :
                'text-terminal-dim'
              }>
                {line || '\u00a0'}
              </div>
            ))}

            {/* Email input prompt */}
            {isPostLaunch && (
              <div className="flex items-center text-terminal-green glow mt-1">
                <span className="mr-2 shrink-0">Enter email address:</span>
                {stage === 'input' ? (
                  <div
                    className="flex items-center flex-1 min-w-0 cursor-text"
                    onClick={() => emailInputRef.current?.focus()}
                  >
                    <input
                      ref={emailInputRef}
                      className="sr-only"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { handleEmailSubmit(); }
                        if (e.key === 'c' && e.ctrlKey) {
                          e.preventDefault();
                          setQuitInput(email);
                          setStage('shell');
                        }
                      }}
                      autoComplete="email"
                      spellCheck={false}
                    />
                    <span className="text-terminal-green glow">{email}</span>
                    <span className="cursor-blink select-none">█</span>
                  </div>
                ) : quitInput !== null ? (
                  <>
                    <span className="glow ml-1">{quitInput}</span>
                    <span className="text-terminal-error ml-1">^C</span>
                  </>
                ) : (
                  <span className="glow ml-1">{submittedEmail}</span>
                )}
              </div>
            )}

            {/* Interrupted message */}
            {quitInput !== null && stage === 'shell' && (
              <div className="mt-1">
                <div className="text-terminal-dim">subscribe: interrupted</div>
                <div className="text-terminal-dim text-xs mt-1">
                  Type <span className="text-terminal-green">`help`</span> for available commands.
                </div>
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
            {isPostInput && (
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

            {/* Success block — only shown when subscription actually completed */}
            {(stage === 'success' || stage === 'shell') && quitInput === null && (
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
                <div className="text-terminal-dim text-xs mt-2">
                  Type <span className="text-terminal-green">`help`</span> for more commands.
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

            {/* Shell REPL */}
            {stage === 'shell' && (
              <div className="mt-3">
                {/* Command history */}
                {shellHistory.map((entry, i) => (
                  <div key={i}>
                    <div className="flex items-center text-terminal-green glow mt-1">
                      <span className="mr-2 shrink-0">{shellPrompt}</span>
                      <span>{entry.input}</span>
                    </div>
                    {entry.output.map((line, j) => (
                      <div key={j} className="text-terminal-dim whitespace-pre">{line ? renderOutputLine(line) : '\u00a0'}</div>
                    ))}
                  </div>
                ))}

                {/* Live prompt */}
                <div
                  className="flex items-center text-terminal-green glow mt-1 cursor-text"
                  onClick={() => shellInputRef.current?.focus()}
                >
                  <span className="mr-2 shrink-0">{shellPrompt}</span>
                  <input
                    ref={shellInputRef}
                    className="sr-only"
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
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 text-center text-terminal-muted text-xs font-mono">
          <a href="https://blog.michaellamb.dev" className="hover:text-terminal-dim transition-colors">
            ← blog.michaellamb.dev
          </a>
        </div>
      </div>
    </div>
  );
}
