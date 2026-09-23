import { defineConfig } from 'vitest/config';

/**
 * The worker needs its own config.
 *
 * Without one, `vitest run` here walks UP to the repo root's vite.config.ts and
 * then resolves that file's `setupFiles: ['./src/test/setup.ts']` relative to
 * THIS directory -- worker/src/test/setup.ts, which does not exist. Every suite
 * failed to load with "Cannot find module", reporting zero tests rather than a
 * failure, so `npm test` in worker/ was silently useless.
 *
 * These are plain unit tests over pure functions, so they want node, not the
 * root's jsdom, and no DOM setup file.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
