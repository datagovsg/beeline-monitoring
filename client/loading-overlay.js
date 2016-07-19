var overlays = [];
var counter = {
  count: 0
}
import assert from 'assert';

export function registerOverlay(overlay) {
  overlay.$emit('useCounter', counter);
  overlays.push(overlay);
}

export function deregisterOverlay(overlay) {
  var index = overlays.indexOf(overlay);

  assert.notEqual(index, -1);

  overlays.splice(index, 1)
}

export function watch(promise) {
  counter.count++;

  function clear() {
    counter.count--;
  }

  promise.then(clear, (err) => { clear(); throw err });
  return promise;
}
