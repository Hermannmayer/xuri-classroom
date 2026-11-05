// webpack module 73235 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  vC: function () {
    return i;
  },
  JY: function () {
    return o;
  },
  WO: function () {
    return a;
  },
  VS: function () {
    return s;
  },
  Ck: function () {
    return u;
  },
  Kn: function () {
    return l;
  }
});
var n = require("./23874.js");
require("./10084.js");
function i(e) {
  var t = 1;
  for (var r in e) {
    if (e.hasOwnProperty(r) && typeof e[r] === "object" && o(e[r])) {
      var n = i(e[r]) + 1;
      t = Math.max(n, t);
    }
  }
  return t;
}
function o(e) {
  return e !== undefined && e !== null && (typeof e !== "number" || e.toString() !== "NaN") && (typeof e !== "string" || e.trim() !== "");
}
function a(e) {
  var t = document.createElement("div");
  function r(e) {
    var t = e.getElementsByClassName("ql-formula");
    while (t.length > 0) {
      var r;
      var n = t[0].dataset.value;
      if ((r = t[0].parentNode) !== null && r !== undefined) {
        r.append(n);
      }
      t[0].parentNode.removeChild(t[0]);
    }
  }
  t.innerHTML = e || "";
  r(t);
  return t.textContent || t.innerText || "";
}
function s(e, t) {
  for (var r = arguments.length, n = new Array(r > 2 ? r - 2 : 0), i = 2; i < r; i++) {
    n[i - 2] = arguments[i];
  }
  if (e.length === 0) {
    return n;
  } else if (t >= e.length) {
    return e.concat(n);
  } else {
    return e.reduce(function (e, r, i) {
      if (t === i) {
        e.push.apply(e, n);
      }
      e.push(r);
      return e;
    }, []);
  }
}
function u(e, t) {
  var r = /(\[|\()(\d+)\s*,\s*(\d+)(\]|\))/;
  if (!e || !r.test(e)) {
    if (t) {
      return ["[", t[0], t[1], "]"];
    } else {
      return undefined;
    }
  }
  var i = e.match(r).slice(1, 5);
  var o = (0, n.Z)(i, 4);
  var a = o[0];
  var s = o[1];
  var u = o[2];
  var l = o[3];
  return [a, parseInt(s), parseInt(u), l];
}
function l(e) {
  return e.type === "Option" || e.type === undefined;
}
};
