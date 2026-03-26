import { helpCommand } from './help';
import { aboutCommand } from './about';
import { blogCommand } from './blog';
import { linksCommand } from './links';
import { filmCommand } from './film';

export type CommandResult = {
  lines: string[];
  /** Side-effect: switch to chatbot mode */
  enterChatbot?: boolean;
  /** Side-effect: exit chatbot mode */
  exitChatbot?: boolean;
};

export async function runCommand(input: string): Promise<CommandResult> {
  const cmd = input.trim().toLowerCase();

  switch (cmd) {
    case 'help':
      return { lines: helpCommand() };
    case 'about':
      return { lines: aboutCommand() };
    case 'blog':
      return { lines: blogCommand() };
    case 'links':
      return { lines: linksCommand() };
    case 'film':
      return { lines: await filmCommand() };
    case 'chatbot':
      return {
        lines: [
          '',
          '  Chatbot mode enabled.',
          '  Ask me anything about michaellamb.dev.',
          '  Type `exit` to return to the normal shell.',
          '',
        ],
        enterChatbot: true,
      };
    case 'exit':
      return {
        lines: ['', '  Exiting chatbot mode.', ''],
        exitChatbot: true,
      };
    case '':
      return { lines: [] };
    default:
      return {
        lines: [
          `  command not found: ${input.trim()}`,
          '  Type `help` to see available commands.',
        ],
      };
  }
}
