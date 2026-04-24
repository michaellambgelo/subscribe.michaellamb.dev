export function appsCommand(): string[] {
  const apps: Array<[string, string]> = [
    ['Boxd Card Chrome Extension and Web App', 'https://boxd-card.michaellamb.dev'],
    ['Custom Letterboxd Stats Dashboard', 'https://letterboxd.michaellamb.dev'],
    ['Discord Embed Builder', 'https://embed-builder.michaellamb.dev'],
  ];
  const nameWidth = Math.max(...apps.map(([name]) => name.length)) + 4;
  return [
    '',
    '  michaellamb.dev apps:',
    '',
    ...apps.map(([name, url]) => `  ${name.padEnd(nameWidth)}${url}`),
    '',
  ];
}
