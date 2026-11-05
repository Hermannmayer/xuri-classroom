// webpack module 82978 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./59496.js");
function i(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var o = typeof Object.is === "function" ? Object.is : i;
var a = n.useState;
var s = n.useEffect;
var u = n.useLayoutEffect;
var l = n.useDebugValue;
function c(e, t) {
  var r = t();
  var n = a({
    inst: {
      value: r,
      getSnapshot: t
    }
  });
  var i = n[0].inst;
  var o = n[1];
  u(function () {
    i.value = r;
    i.getSnapshot = t;
    if (p(i)) {
      o({
        inst: i
      });
    }
  }, [e, r, t]);
  s(function () {
    if (p(i)) {
      o({
        inst: i
      });
    }
    return e(function () {
      if (p(i)) {
        o({
          inst: i
        });
      }
    });
  }, [e]);
  l(r);
  return r;
}
function p(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var r = t();
    return !o(e, r);
  } catch (n) {
    return true;
  }
}
function d(e, t) {
  return t();
}
var f = typeof window === "undefined" || typeof window.document === "undefined" || typeof window.document.createElement === "undefined" ? d : c;
exports.useSyncExternalStore = n.useSyncExternalStore !== undefined ? n.useSyncExternalStore : f;
};
