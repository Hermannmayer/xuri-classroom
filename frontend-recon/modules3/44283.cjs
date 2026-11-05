// webpack module 44283 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./34809.js");
var i = require("./27434.js");
var o = require("./18203.js");
var a = require("./5659.js");
function s() {
  this.object = null;
  this.symbol = null;
  this.primitives = null;
  this.objectsByIndex = o(null);
}
s.prototype.get = function (e, t) {
  return this[e] ||= t();
};
s.prototype.next = function (e, t, r) {
  var o = r ? this.objectsByIndex[e] ||= new i() : this.primitives ||= new n();
  var a = o.get(t);
  if (!a) {
    o.set(t, a = new s());
  }
  return a;
};
var u = new s();
module.exports = function () {
  var e;
  var t;
  var r = u;
  var n = arguments.length;
  for (e = 0; e < n; e++) {
    if (a(t = arguments[e])) {
      r = r.next(e, t, true);
    }
  }
  if (this === Object && r === u) {
    throw TypeError("Composite keys must contain a non-primitive component");
  }
  for (e = 0; e < n; e++) {
    if (!a(t = arguments[e])) {
      r = r.next(e, t, false);
    }
  }
  return r;
};
};
