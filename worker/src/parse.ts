const MAX_OUTPUT_LINES = 8;

/**
 * Normalize raw model output into the `{ lines: string[] }` shape the terminal
 * expects. Re-indents non-empty lines with two spaces and frames the block
 * with a leading and trailing empty line, matching the convention used
 * throughout `src/commands/*`.
 */
export function formatLines(raw: string): string[] {
  const stripped = raw.trim();
  if (!stripped) return ['', '  ...', ''];

  const lines = stripped.split('\n').map((l) => l.replace(/\r$/, '').trim());
  const formatted: string[] = [''];
  for (const line of lines) {
    if (!line) continue;
    formatted.push(`  ${line}`);
    if (formatted.length >= MAX_OUTPUT_LINES + 1) break;
  }
  formatted.push('');
  return formatted;
}
