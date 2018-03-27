var overlays = [];
export const counter = {
  count: 0
}
import assert from 'assert';

export function registerOverlay(overlay) {
  overlay.useCounter(counter);
  overlays.push(overlay);
}

export function deregisterOverlay(overlay) {
  var index = overlays.indexOf(overlay);

  assert.notEqual(index, -1);

  overlays.splice(index, 1)
}

export function spinnerOn(promise) {
  counter.count++;

  function clear() {
    counter.count--;
  }

  Promise.resolve(promise)
    .then(clear)
    .catch((err) => {
      clear();
      throw err
    });
  return promise;
}
