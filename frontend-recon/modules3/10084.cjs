// webpack module 10084 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  $: function () {
    return c;
  }
});
var n = require("./71258.js");
var i = require("./66439.js");
var o = require("./91613.js");
var a = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
var s = new Set(["constructor", "prototype", "__proto__", "this", "window", "document", "globalThis", "global", "Function", "eval", "import", "fetch", "XMLHttpRequest", "localStorage", "sessionStorage", "cookie", "location", "process"]);
function u(e) {
  var t = "";
  var r = "";
  var n = false;
  for (var i = 0; i < e.length; i++) {
    var o = e[i];
    if (r) {
      t += " ";
      if (n) {
        n = false;
      } else if (o === "\\") {
        n = true;
      } else if (o === r) {
        r = "";
      }
    } else if (o === "'" || o === "\"") {
      r = o;
      t += " ";
    } else {
      t += o;
    }
  }
  if (r) {
    throw new Error("Invalid expression string literal");
  }
  return t;
}
function l(e, t) {
  if (e.length > 10000) {
    throw new Error("Expression is too long");
  }
  var r = u(e);
  if (/[`;{}[\]]/.test(r) || /=>/.test(r)) {
    throw new Error("Expression contains unsupported syntax");
  }
  if (/(^|[^=!<>])=($|[^=])/.test(r)) {
    throw new Error("Expression assignment is not allowed");
  }
  if (/\.\s*[A-Za-z_$]/.test(r)) {
    throw new Error("Expression member access is not allowed");
  }
  if (/[^A-Za-z0-9_$\s.,()+\-*/%<>=!&|?:]/.test(r)) {
    throw new Error("Expression contains unsupported characters");
  }
  var n = r.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) || [];
  n.forEach(function (e) {
    if (s.has(e)) {
      throw new Error(`Forbidden expression identifier: ${e}`);
    }
    if (!a.has(e) && !t.has(e)) {
      throw new Error(`Unknown expression identifier: ${e}`);
    }
  });
}
function c(e, t = {}, r = {}) {
  var a = (0, o.Z)((0, o.Z)({}, r), t);
  var s = Object.keys(a);
  var u = new Set(s);
  l(e, u);
  var c = s.map(function (e) {
    return a[e];
  });
  return (0, n.Z)(Function, s.concat([`"use strict"; return (${e});`])).apply(undefined, (0, i.Z)(c));
}
};
