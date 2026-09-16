import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
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

  it('exits chatbot mode on Ctrl+C', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    await typeCommand(user, 'chatbot');
    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    if (!input) throw new Error('shell input not found');
    input.focus();
    await user.keyboard('{Control>}c{/Control}');

    expect(await screen.findByText(/Exiting chatbot mode/)).toBeInTheDocument();
    const prompts = shellPromptText();
    const livePrompt = prompts[prompts.length - 1];
    expect(livePrompt.textContent).toMatch(/subscriber@michaellamb:~\$/);
  });

  it('Ctrl+C in shell mode clears the current input without side effects', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    if (!input) throw new Error('shell input not found');
    input.focus();
    await user.type(input, 'half-typed');
    await user.keyboard('{Control>}c{/Control}');

    expect(input.value).toBe('');
    // Prompt should still be the shell prompt (we weren't in chatbot mode)
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

  it('`subscribe` moves focus to the email field', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const emailInput = screen.getByLabelText(/Enter email address/i);
    expect(emailInput).not.toHaveFocus();

    await typeCommand(user, 'subscribe');

    await waitFor(() => expect(emailInput).toHaveFocus());
  });
});

describe('Terminal accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes a labelled email field on load, with no command typed', () => {
    render(<Terminal />);
    const emailInput = screen.getByLabelText(/Enter email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('name', 'email');
  });

  it('exposes a submit button on load', () => {
    render(<Terminal />);
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('gives the page a single top-level heading', () => {
    render(<Terminal />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/newsletter shell/i);
  });

  it('labels the shell input', () => {
    render(<Terminal />);
    expect(screen.getByLabelText(/Terminal command/i)).toBeInTheDocument();
  });

  it('renders command output into a live log region', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');

    await typeCommand(user, 'help');
    await waitFor(() => expect(log).toHaveTextContent(/Available commands/));
  });

  it('announces an invalid email instead of failing silently', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const emailInput = screen.getByLabelText(/Enter email address/i);
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not a valid email address/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAccessibleDescription(/not a valid email address/i);
  });

  it('announces an empty submit instead of failing silently', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no address entered/i);
  });

  it('clears the error once the address is corrected', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const emailInput = screen.getByLabelText(/Enter email address/i);
    await user.type(emailInput, 'nope');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(emailInput, '@example.com');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(emailInput).not.toHaveAttribute('aria-invalid');
  });

  it('accepts a valid address and enters the submitting state', async () => {
    const user = userEvent.setup();
    render(<Terminal />);

    const emailInput = screen.getByLabelText(/Enter email address/i);
    await user.type(emailInput, 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(emailInput).toHaveAttribute('readonly'));
    // readOnly rather than disabled: a disabled field is omitted from the GET.
    expect(emailInput).not.toBeDisabled();
  });

  it('posts the email under the name Hakanai expects', () => {
    const { container } = render(<Terminal />);
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('method', 'get');
    expect(form?.getAttribute('action')).toContain('hakanai.io');
    expect(form?.querySelector('input[name="email"]')).toBeInTheDocument();
  });

  it('keeps the decorative chrome out of the accessibility tree', () => {
    render(<Terminal />);
    // The ticking clock would otherwise interrupt a screen reader every second
    // once the live region is in play, so it has to sit under aria-hidden.
    const clock = screen.getByText(/^\d{2}:\d{2}:\d{2}$/);
    expect(clock.closest('[aria-hidden="true"]')).not.toBeNull();

    // Same for the keybind hints — `^C` and `↑↓` are not real controls.
    const keybind = screen.getByText('history');
    expect(keybind.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('`subscribe` scrolls the form back into view, not just focuses it', async () => {
    // Regression: the panel sits at the top of the scroll area while the
    // auto-scroller pins to the bottom, so `subscribe` has to win that fight.
    const user = userEvent.setup();
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
    render(<Terminal />);

    await typeCommand(user, 'subscribe');

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const scrolled = spy.mock.instances[0] as Element;
    expect(scrolled.getAttribute('aria-labelledby')).toBe('subscribe-heading');
    spy.mockRestore();
  });

  it('still exposes the one real link in the footer', () => {
    render(<Terminal />);
    // aria-hidden chrome must not swallow a focusable element.
    const blogLink = screen.getByRole('link', { name: /blog\.michaellamb\.dev/ });
    expect(blogLink.closest('[aria-hidden="true"]')).toBeNull();
  });
});


describe('Terminal subscribe outcome', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reduced motion collapses the submit typewriter, so the flow reaches the
    // point where the form is actually posted without waiting seconds for it.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function submitValidEmail(address = 'reader@example.com') {
    const user = userEvent.setup();
    render(<Terminal />);
    await user.type(screen.getByLabelText(/Enter email address/i), address);
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    const iframe = document.querySelector('iframe[name="hakanai-frame"]');
    if (!iframe) throw new Error('submit iframe not found');
    await waitFor(() => expect(screen.getByLabelText(/Enter email address/i)).toHaveAttribute('readonly'));
    // Hakanai responding = the iframe loading. This is what flips to success.
    fireEvent.load(iframe);
    return iframe;
  }

  it('does not claim the subscription is confirmed', async () => {
    await submitValidEmail();

    const status = await screen.findByRole('status');
    // Hakanai sends a verification link that expires; until the reader clicks
    // it they are NOT subscribed. Claiming otherwise is how signups get lost.
    expect(status).not.toHaveTextContent(/subscription confirmed/i);
    expect(status).not.toHaveTextContent(/welcome email/i);
  });

  it('tells the reader to verify, and that the link expires', async () => {
    await submitValidEmail('reader@example.com');

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/verification link/i);
    expect(status).toHaveTextContent(/not subscribed until you click it/i);
    expect(status).toHaveTextContent(/expires/i);
    expect(status).toHaveTextContent(/reader@example\.com/);
  });

  it('serialises the address into the GET Hakanai actually receives', async () => {
    // The mechanism changed: the value now comes from the visible input, which
    // is readOnly (not disabled) during submit because a disabled field is
    // omitted from form serialisation. If this regresses, every signup posts an
    // empty address and the site silently converts nobody.
    const user = userEvent.setup();
    render(<Terminal />);
    await user.type(screen.getByLabelText(/Enter email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    const form = document.querySelector('form');
    if (!form) throw new Error('form not found');
    await waitFor(() => expect(screen.getByLabelText(/Enter email address/i)).toHaveAttribute('readonly'));

    const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    expect(params.get('email')).toBe('reader@example.com');

    const url = form.getAttribute('action') + '?' + params.toString();
    expect(url).toBe(
      'https://hakanai.io/campaign/33c130d9-115d-4297-9a4f-543ef77b3330/subscribe?email=reader%40example.com'
    );
  });

  it('announces the outcome rather than leaving it silent', async () => {
    await submitValidEmail();
    // role="status" is an implicit aria-live=polite region.
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
