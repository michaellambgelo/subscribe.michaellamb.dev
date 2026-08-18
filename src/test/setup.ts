import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView. Guarded on `Element` because worker
// suites opt into the `node` environment, where there is no DOM at all.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
