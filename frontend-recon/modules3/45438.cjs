// webpack module 45438 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
var a;
var s;
var u;
var l;
var c;
var p = require("./55477.js");
var d = require("./37987.js").f;
var f = require("./28445.js");
var g = require("./98321.js").set;
var m = require("./31515.js");
var v = p.MutationObserver || p.WebKitMutationObserver;
var y = p.process;
var h = p.Promise;
var b = f(y) == "process";
var w = d(p, "queueMicrotask");
var x = w && w.value;
if (!x) {
  n = function () {
    var e;
    var t;
    if (b && (e = y.domain)) {
      e.exit();
    }
    while (i) {
      t = i.fn;
      i = i.next;
      try {
        t();
      } catch (r) {
        if (i) {
          a();
        } else {
          o = undefined;
        }
        throw r;
      }
    }
    o = undefined;
    if (e) {
      e.enter();
    }
  };
  if (b) {
    a = function () {
      y.nextTick(n);
    };
  } else if (v && !m) {
    s = true;
    u = document.createTextNode("");
    new v(n).observe(u, {
      characterData: true
    });
    a = function () {
      u.data = s = !s;
    };
  } else if (h && h.resolve) {
    l = h.resolve(undefined);
    c = l.then;
    a = function () {
      c.call(l, n);
    };
  } else {
    a = function () {
      g.call(p, n);
    };
  }
}
module.exports = x || function (e) {
  var t = {
    fn: e,
    next: undefined
  };
  if (o) {
    o.next = t;
  }
  if (!i) {
    i = t;
    a();
  }
  o = t;
};
};
