// webpack module 38399 — body from webcrack
module.exports = function (module, exports, require) {
var r;
var n;
(function () {
  "use strict";

  var i = {}.hasOwnProperty;
  function o() {
    var e = "";
    for (var t = 0; t < arguments.length; t++) {
      var r = arguments[t];
      if (r) {
        e = s(e, a(r));
      }
    }
    return e;
  }
  function a(e) {
    if (typeof e === "string" || typeof e === "number") {
      return e;
    }
    if (typeof e !== "object") {
      return "";
    }
    if (Array.isArray(e)) {
      return o.apply(null, e);
    }
    if (e.toString !== Object.prototype.toString && !e.toString.toString().includes("[native code]")) {
      return e.toString();
    }
    var t = "";
    for (var r in e) {
      if (i.call(e, r) && e[r]) {
        t = s(t, r);
      }
    }
    return t;
  }
  function s(e, t) {
    if (t) {
      if (e) {
        return e + " " + t;
      } else {
        return e + t;
      }
    } else {
      return e;
    }
  }
  if (module.exports) {
    o.default = o;
    module.exports = o;
  } else {
    r = [];
    n = function () {
      return o;
    }.apply(exports, r);
    if (n !== undefined) {
      module.exports = n;
    }
  }
})();
};
