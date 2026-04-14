import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Terminal } from './Terminal';

function shellPromptText() {
  return screen.getAllByText(/subscriber@michaellamb:~\$|you\s›/);
}

async function typeCommand(user: ReturnType<typeof userEvent.setup>, cmd: string) {
  const input = document.querySelector<HTMLInputElement>('input[type="text"]');
  if (!input) throw new Error('shell input not found');
  input.focus();
  await user.type(input, cmd);
  await user.keyboard('{Enter}');
}

describe('Terminal', () => {
  beforeEach(() => {
    // fresh DOM per test
    document.body.innerHTML = '';
  });

  it('renders the MOTD and a shell prompt on load', () => {
    render(<Terminal />);
    expect(screen.getByText(/newsletter shell/i)).toBeInTheDocument();
    expect(shellPromptText().length).toBeGreaterThan(0);
  });

  it('runs `help` and shows available commands', async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    await typeCommand(user, 'help');
    expect(await screen.findByText(/Available commands/)).toBeInTheDocument();
  });

  it('enters chatbot mode as the FIRST command (regression)', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    await typeCommand(user, 'chatbot');

    // Chatbot greeting should appear
    expect(await screen.findByText(/Chatbot mode enabled/)).toBeInTheDocument();

    // The live prompt (last prompt-looking element) should now be `you ›`
    const prompts = shellPromptText();
    const livePrompt = prompts[prompts.length - 1];
    expect(livePrompt.textContent).toMatch(/you\s›/);
  });

  it('enters chatbot mode after `help` then `chatbot`', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    await typeCommand(user, 'help');
    await typeCommand(user, 'chatbot');

    expect(await screen.findByText(/Chatbot mode enabled/)).toBeInTheDocument();
    const prompts = shellPromptText();
    const livePrompt = prompts[prompts.length - 1];
    expect(livePrompt.textContent).toMatch(/you\s›/);
  });

  it('exits chatbot mode on `exit`', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    await typeCommand(user, 'chatbot');
    await typeCommand(user, 'exit');

    const prompts = shellPromptText();
    const livePrompt = prompts[prompts.length - 1];
    expect(livePrompt.textContent).toMatch(/subscriber@michaellamb:~\$/);
  });

  it('shows "command not found" for unknown commands', async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    await typeCommand(user, 'totally-not-a-command');
    expect(await screen.findByText(/command not found/)).toBeInTheDocument();
  });

  it('preserves prompt label in history across chatbot toggle', async () => {
    // `help` ran in normal shell should always display with `subscriber@michaellamb:~$`,
    // even after we toggle into chatbot mode.
    const user = userEvent.setup();
    const { container } = render(<Terminal />);

    await typeCommand(user, 'help');
    await typeCommand(user, 'chatbot');

    // Find the history entry containing "help" — its prompt must be subscriber, not `you ›`
    const helpEntry = within(container).getAllByText('help')[0];
    const entryRow = helpEntry.closest('div');
    expect(entryRow?.textContent).toMatch(/subscriber@michaellamb:~\$/);
  });

  it('switches to email prompt on `subscribe`', async () => {
    const user = userEvent.setup();
    render(<Terminal />);
    await typeCommand(user, 'subscribe');
    expect(await screen.findByText(/Enter email address:/)).toBeInTheDocument();
  });
});
