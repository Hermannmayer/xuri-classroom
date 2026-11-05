// webpack module 17295 — body from webcrack
module.exports = function (module, exports, require) {
require("./98432.js");
var n = require("./19341.js");
var i = require("./41497.js");
var o = require("./54175.js");
var a = require("./41216.js");
var s = require("./68345.js");
var u = require("./65147.js");
var l = require("./8148.js");
var c = require("./71478.js");
var p = require("./33758.js");
var d = require("./15595.js");
var f = require("./52485.js");
var g = require("./6924.js");
var m = require("./79456.js");
var v = require("./5659.js");
var y = require("./18203.js");
var h = require("./26244.js");
var b = require("./48167.js");
var w = require("./83232.js");
var x = require("./55878.js");
var E = i("fetch");
var k = i("Headers");
var S = x("iterator");
var T = "URLSearchParams";
var C = T + "Iterator";
var A = c.set;
var _ = c.getterFor(T);
var O = c.getterFor(C);
var M = /\+/g;
var P = Array(4);
function q(e) {
  return P[e - 1] ||= RegExp("((?:%[\\da-f]{2}){" + e + "})", "gi");
}
function N(e) {
  try {
    return decodeURIComponent(e);
  } catch (t) {
    return e;
  }
}
function R(e) {
  var t = e.replace(M, " ");
  var r = 4;
  try {
    return decodeURIComponent(t);
  } catch (n) {
    while (r) {
      t = t.replace(q(r--), N);
    }
    return t;
  }
}
var I = /[!'()~]|%20/g;
var j = {
  "!": "%21",
  "'": "%27",
  "(": "%28",
  ")": "%29",
  "~": "%7E",
  "%20": "+"
};
function D(e) {
  return j[e];
}
function L(e) {
  return encodeURIComponent(e).replace(I, D);
}
function F(e, t) {
  if (t) {
    var r;
    var n;
    var i = t.split("&");
    var o = 0;
    while (o < i.length) {
      r = i[o++];
      if (r.length) {
        n = r.split("=");
        e.push({
          key: R(n.shift()),
          value: R(n.join("="))
        });
      }
    }
  }
}
function Z(e) {
  this.entries.length = 0;
  F(this.entries, e);
}
function z(e, t) {
  if (e < t) {
    throw TypeError("Not enough arguments");
  }
}
var U = l(function (e, t) {
  A(this, {
    type: C,
    iterator: b(_(e).entries),
    kind: t
  });
}, "Iterator", function () {
  var e = O(this);
  var t = e.kind;
  var r = e.iterator.next();
  var n = r.value;
  if (!r.done) {
    r.value = t === "keys" ? n.key : t === "values" ? n.value : [n.key, n.value];
  }
  return r;
});
function B() {
  p(this, B, T);
  var e;
  var t;
  var r;
  var n;
  var i;
  var o;
  var a;
  var s;
  var u;
  var l = arguments.length > 0 ? arguments[0] : undefined;
  var c = this;
  var f = [];
  A(c, {
    type: T,
    entries: f,
    updateURL: function () {},
    updateSearchParams: Z
  });
  if (l !== undefined) {
    if (v(l)) {
      e = w(l);
      if (typeof e === "function") {
        t = e.call(l);
        r = t.next;
        while (!(n = r.call(t)).done) {
          i = b(m(n.value));
          o = i.next;
          if ((a = o.call(i)).done || (s = o.call(i)).done || !o.call(i).done) {
            throw TypeError("Expected sequence with length 2");
          }
          f.push({
            key: a.value + "",
            value: s.value + ""
          });
        }
      } else {
        for (u in l) {
          if (d(l, u)) {
            f.push({
              key: u,
              value: l[u] + ""
            });
          }
        }
      }
    } else {
      F(f, typeof l === "string" ? l.charAt(0) === "?" ? l.slice(1) : l : l + "");
    }
  }
}
var V = B.prototype;
s(V, {
  append: function (e, t) {
    z(arguments.length, 2);
    var r = _(this);
    r.entries.push({
      key: e + "",
      value: t + ""
    });
    r.updateURL();
  },
  delete: function (e) {
    z(arguments.length, 1);
    var t = _(this);
    var r = t.entries;
    var n = e + "";
    var i = 0;
    while (i < r.length) {
      if (r[i].key === n) {
        r.splice(i, 1);
      } else {
        i++;
      }
    }
    t.updateURL();
  },
  get: function (e) {
    z(arguments.length, 1);
    for (var t = _(this).entries, r = e + "", n = 0; n < t.length; n++) {
      if (t[n].key === r) {
        return t[n].value;
      }
    }
    return null;
  },
  getAll: function (e) {
    z(arguments.length, 1);
    for (var t = _(this).entries, r = e + "", n = [], i = 0; i < t.length; i++) {
      if (t[i].key === r) {
        n.push(t[i].value);
      }
    }
    return n;
  },
  has: function (e) {
    z(arguments.length, 1);
    var t = _(this).entries;
    var r = e + "";
    var n = 0;
    while (n < t.length) {
      if (t[n++].key === r) {
        return true;
      }
    }
    return false;
  },
  set: function (e, t) {
    z(arguments.length, 1);
    var r;
    var n = _(this);
    for (var i = n.entries, o = false, a = e + "", s = t + "", u = 0; u < i.length; u++) {
      r = i[u];
      if (r.key === a) {
        if (o) {
          i.splice(u--, 1);
        } else {
          o = true;
          r.value = s;
        }
      }
    }
    if (!o) {
      i.push({
        key: a,
        value: s
      });
    }
    n.updateURL();
  },
  sort: function () {
    var e;
    var t;
    var r;
    var n = _(this);
    var i = n.entries;
    var o = i.slice();
    i.length = 0;
    r = 0;
    for (; r < o.length; r++) {
      e = o[r];
      t = 0;
      for (; t < r; t++) {
        if (i[t].key > e.key) {
          i.splice(t, 0, e);
          break;
        }
      }
      if (t === r) {
        i.push(e);
      }
    }
    n.updateURL();
  },
  forEach: function (e) {
    var t;
    var r = _(this).entries;
    var n = f(e, arguments.length > 1 ? arguments[1] : undefined, 3);
    var i = 0;
    while (i < r.length) {
      t = r[i++];
      n(t.value, t.key, this);
    }
  },
  keys: function () {
    return new U(this, "keys");
  },
  values: function () {
    return new U(this, "values");
  },
  entries: function () {
    return new U(this, "entries");
  }
}, {
  enumerable: true
});
a(V, S, V.entries);
a(V, "toString", function () {
  var e;
  var t = _(this).entries;
  var r = [];
  var n = 0;
  while (n < t.length) {
    e = t[n++];
    r.push(L(e.key) + "=" + L(e.value));
  }
  return r.join("&");
}, {
  enumerable: true
});
u(B, T);
n({
  global: true,
  forced: !o
}, {
  URLSearchParams: B
});
if (!o && typeof E == "function" && typeof k == "function") {
  n({
    global: true,
    enumerable: true,
    forced: true
  }, {
    fetch: function (e) {
      var t;
      var r;
      var n;
      var i = [e];
      if (arguments.length > 1) {
        t = arguments[1];
        if (v(t)) {
          r = t.body;
          if (g(r) === T) {
            n = t.headers ? new k(t.headers) : new k();
            if (!n.has("content-type")) {
              n.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
            }
            t = y(t, {
              body: h(0, String(r)),
              headers: h(0, n)
            });
          }
        }
        i.push(t);
      }
      return E.apply(this, i);
    }
  });
}
module.exports = {
  URLSearchParams: B,
  getState: _
};
};
