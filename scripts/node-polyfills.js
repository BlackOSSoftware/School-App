/* eslint-disable no-extend-native */
/* Temporary compatibility shim for older Node runtimes. */
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return [...this].reverse();
    },
    writable: true,
    configurable: true,
  });
}

const util = require('node:util');

if (typeof util.styleText !== 'function') {
  util.styleText = (_format, text) => text;
}
