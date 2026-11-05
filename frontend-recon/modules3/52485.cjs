// webpack module 52485 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60730.js");
module.exports = function (e, t, r) {
  n(e);
  if (t === undefined) {
    return e;
  }
  switch (r) {
    case 0:
      return function () {
        return e.call(t);
      };
    case 1:
      return function (r) {
        return e.call(t, r);
      };
    case 2:
      return function (r, n) {
        return e.call(t, r, n);
      };
    case 3:
      return function (r, n, i) {
        return e.call(t, r, n, i);
      };
  }
  return function () {
    return e.apply(t, arguments);
  };
};
};
