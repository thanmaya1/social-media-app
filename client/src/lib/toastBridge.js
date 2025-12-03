let _add = null;

export function registerToast(addFn) {
  _add = addFn;
}

export function showToast(message, opts = {}) {
  if (_add) return _add(message, opts);
  // fallback: console
  // eslint-disable-next-line no-console
  console.warn('Toast', message, opts);
}
