// webpack module 40948 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./34809.js");
var i = require("./27434.js");
var o = require("./89281.js");
var a = o("metadata");
var s = a.store ||= new i();
function u(e, t, r) {
  var i = s.get(e);
  if (!i) {
    if (!r) {
      return;
    }
    s.set(e, i = new n());
  }
  var o = i.get(t);
  if (!o) {
    if (!r) {
      return;
    }
    i.set(t, o = new n());
  }
  return o;
}
function l(e, t, r) {
  var n = u(t, r, false);
  return n !== undefined && n.has(e);
}
function c(e, t, r) {
  var n = u(t, r, false);
  if (n === undefined) {
    return undefined;
  } else {
    return n.get(e);
  }
}
function p(e, t, r, n) {
  u(r, n, true).set(e, t);
}
function d(e, t) {
  var r = u(e, t, false);
  var n = [];
  if (r) {
    r.forEach(function (e, t) {
      n.push(t);
    });
  }
  return n;
}
function f(e) {
  if (e === undefined || typeof e == "symbol") {
    return e;
  } else {
    return String(e);
  }
}
module.exports = {
  store: s,
  getMap: u,
  has: l,
  get: c,
  set: p,
  keys: d,
  toKey: f
};
};
