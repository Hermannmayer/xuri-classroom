// webpack module 72354 — body from webcrack
module.exports = function (module, exports, require) {
require("./14455.js");
var n = require("./41216.js");
var i = require("./27015.js");
var o = require("./55878.js");
var a = require("./8801.js");
var s = require("./52141.js");
var u = o("species");
var l = !i(function () {
  var e = /./;
  e.exec = function () {
    var e = [];
    e.groups = {
      a: "7"
    };
    return e;
  };
  return "".replace(e, "$<a>") !== "7";
});
var c = function () {
  return "a".replace(/./, "$0") === "$0";
}();
var p = o("replace");
var d = function () {
  return !!/./[p] && /./[p]("a", "$0") === "";
}();
var f = !i(function () {
  var e = /(?:)/;
  var t = e.exec;
  e.exec = function () {
    return t.apply(this, arguments);
  };
  var r = "ab".split(e);
  return r.length !== 2 || r[0] !== "a" || r[1] !== "b";
});
module.exports = function (e, t, r, p) {
  var g = o(e);
  var m = !i(function () {
    var t = {
      [g]: function () {
        return 7;
      }
    };
    return ""[e](t) != 7;
  });
  var v = m && !i(function () {
    var t = false;
    var r = /a/;
    if (e === "split") {
      r = {};
      r.constructor = {};
      r.constructor[u] = function () {
        return r;
      };
      r.flags = "";
      r[g] = /./[g];
    }
    r.exec = function () {
      t = true;
      return null;
    };
    r[g]("");
    return !t;
  });
  if (!m || !v || e === "replace" && (!l || !c || d) || e === "split" && !f) {
    var y = /./[g];
    var h = r(g, ""[e], function (e, t, r, n, i) {
      if (t.exec === a) {
        if (m && !i) {
          return {
            done: true,
            value: y.call(t, r, n)
          };
        } else {
          return {
            done: true,
            value: e.call(r, t, n)
          };
        }
      } else {
        return {
          done: false
        };
      }
    }, {
      REPLACE_KEEPS_$0: c,
      REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE: d
    });
    var b = h[0];
    var w = h[1];
    n(String.prototype, e, b);
    n(RegExp.prototype, g, t == 2 ? function (e, t) {
      return w.call(e, this, t);
    } : function (e) {
      return w.call(e, this);
    });
  }
  if (p) {
    s(RegExp.prototype[g], "sham", true);
  }
};
};
