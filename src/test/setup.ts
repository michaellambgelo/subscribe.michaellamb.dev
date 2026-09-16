import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView. Guarded on `Element` because worker
// suites opt into the `node` environment, where there is no DOM at all.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom doesn't implement form submission either. The subscribe flow calls
// form.submit() directly (a real GET into the hidden iframe), so stub it to a
// no-op rather than letting jsdom throw "Not implemented" across the suite.
if (typeof HTMLFormElement !== 'undefined') {
  HTMLFormElement.prototype.submit = () => {};
}
