// webpack module 91190 — body from webcrack
module.exports = function (module, exports, require) {
var t = false;
function r() {}
if (t) {
  function n(e, t) {
    var r = arguments.length;
    t = new Array(r > 1 ? r - 1 : 0);
    for (var n = 1; n < r; n++) {
      t[n - 1] = arguments[n];
    }
    var i = 0;
    var o = "Warning: " + e.replace(/%s/g, function () {
      return t[i++];
    });
    if (typeof console !== "undefined") {
      console.error(o);
    }
    try {
      throw new Error(o);
    } catch (a) {}
  }
  r = function (e, t, r) {
    var i = arguments.length;
    r = new Array(i > 2 ? i - 2 : 0);
    for (var o = 2; o < i; o++) {
      r[o - 2] = arguments[o];
    }
    if (t === undefined) {
      throw new Error("`warning(condition, format, ...args)` requires a warning message argument");
    }
    if (!e) {
      n.apply(null, [t].concat(r));
    }
  };
}
module.exports = r;
};
