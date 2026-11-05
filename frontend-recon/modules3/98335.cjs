// webpack module 98335 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./8148.js");
var o = require("./61230.js");
var a = require("./4484.js");
var s = require("./60730.js");
var u = require("./79456.js");
var l = require("./28445.js");
var c = require("./86930.js");
var p = require("./57300.js");
var d = require("./52141.js");
var f = require("./27015.js");
var g = require("./55878.js");
var m = require("./51052.js");
var v = require("./43379.js");
var y = require("./71478.js");
var h = require("./57965.js");
var b = g("matchAll");
var w = "RegExp String";
var x = w + " Iterator";
var E = y.set;
var k = y.getterFor(x);
var S = RegExp.prototype;
var T = S.exec;
var C = "".matchAll;
var A = !!C && !f(function () {
  "a".matchAll(/./);
});
function _(e, t) {
  var r;
  var n = e.exec;
  if (typeof n == "function") {
    r = n.call(e, t);
    if (typeof r != "object") {
      throw TypeError("Incorrect exec result");
    }
    return r;
  }
  return T.call(e, t);
}
var O = i(function (e, t, r, n) {
  E(this, {
    type: x,
    regexp: e,
    string: t,
    global: r,
    unicode: n,
    done: false
  });
}, w, function () {
  var e = k(this);
  if (e.done) {
    return {
      value: undefined,
      done: true
    };
  }
  var t = e.regexp;
  var r = e.string;
  var n = _(t, r);
  if (n === null) {
    return {
      value: undefined,
      done: e.done = true
    };
  } else if (e.global) {
    if (String(n[0]) == "") {
      t.lastIndex = v(r, a(t.lastIndex), e.unicode);
    }
    return {
      value: n,
      done: false
    };
  } else {
    e.done = true;
    return {
      value: n,
      done: false
    };
  }
});
function M(e) {
  var t;
  var r;
  var n;
  var i;
  var o;
  var s;
  var l = u(this);
  var c = String(e);
  t = m(l, RegExp);
  r = l.flags;
  if (r === undefined && l instanceof RegExp && !("flags" in S)) {
    r = p.call(l);
  }
  n = r === undefined ? "" : String(r);
  i = new t(t === RegExp ? l.source : l, n);
  o = !!~n.indexOf("g");
  s = !!~n.indexOf("u");
  i.lastIndex = a(l.lastIndex);
  return new O(i, c, o, s);
}
n({
  target: "String",
  proto: true,
  forced: A
}, {
  matchAll: function (e) {
    var t;
    var r;
    var n;
    var i;
    var a = o(this);
    if (e != null) {
      if (c(e) && (t = String(o("flags" in S ? e.flags : p.call(e))), !~t.indexOf("g"))) {
        throw TypeError("`.matchAll` does not allow non-global regexes");
      }
      if (A) {
        return C.apply(a, arguments);
      }
      n = e[b];
      if (n === undefined && h && l(e) == "RegExp") {
        n = M;
      }
      if (n != null) {
        return s(n).call(e, a);
      }
    } else if (A) {
      return C.apply(a, arguments);
    }
    r = String(a);
    i = new RegExp(e, "g");
    if (h) {
      return M.call(i, r);
    } else {
      return i[b](r);
    }
  }
});
if (!h && !(b in S)) {
  d(S, b, M);
}
};
