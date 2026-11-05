// webpack module 18203 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i = require("./79456.js");
var o = require("./95330.js");
var a = require("./21674.js");
var s = require("./22365.js");
var u = require("./94249.js");
var l = require("./7316.js");
var c = require("./58098.js");
var p = ">";
var d = "<";
var f = "prototype";
var g = "script";
var m = c("IE_PROTO");
function v() {}
function y(e) {
  return d + g + p + e + d + "/" + g + p;
}
function h(e) {
  e.write(y(""));
  e.close();
  var t = e.parentWindow.Object;
  e = null;
  return t;
}
function b() {
  var e;
  var t = l("iframe");
  var r = "java" + g + ":";
  t.style.display = "none";
  u.appendChild(t);
  t.src = String(r);
  e = t.contentWindow.document;
  e.open();
  e.write(y("document.F=Object"));
  e.close();
  return e.F;
}
function w() {
  try {
    n = document.domain && new ActiveXObject("htmlfile");
  } catch (t) {}
  w = n ? h(n) : b();
  var e = a.length;
  while (e--) {
    delete w[f][a[e]];
  }
  return w();
}
s[m] = true;
module.exports = Object.create || function (e, t) {
  var r;
  if (e !== null) {
    v[f] = i(e);
    r = new v();
    v[f] = null;
    r[m] = e;
  } else {
    r = w();
  }
  if (t === undefined) {
    return r;
  } else {
    return o(r, t);
  }
};
};
