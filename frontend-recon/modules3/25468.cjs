// webpack module 25468 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  rU: function () {
    return i.rU;
  },
  Gb: function () {
    return i.Gb;
  },
  Y7: function () {
    return i.Y7;
  },
  mO: function () {
    return u;
  },
  Gr: function () {
    return m;
  },
  JH: function () {
    return n.JH;
  },
  Cp: function () {
    return o;
  },
  VS: function () {
    return l.VS;
  },
  Kn: function () {
    return l.Kn;
  },
  Ck: function () {
    return l.Ck;
  },
  j1: function () {
    return n.j1;
  },
  QT: function () {
    return n.QT;
  },
  RY: function () {
    return n.RY;
  },
  LQ: function () {
    return s;
  },
  $Z: function () {
    return a;
  },
  WO: function () {
    return l.WO;
  }
});
var n = require("./61393.js");
var i = require("./11170.js");
function o(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  return r.forEach(function (t) {
    return e.query(e.path.concat(t)).take(function (e) {
      return e.display = "none";
    });
  });
}
function a(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  return r.forEach(function (t) {
    return e.query(e.path.concat(t)).take(function (e) {
      return e.display = "visible";
    });
  });
}
require("./51705.js");
function s(e, t) {
  return window.requestIdleCallback(e, t);
}
function u(e) {
  window.cancelIdleCallback(e);
}
var l = require("./73235.js");
var c = require("./66439.js");
var p = require("./91613.js");
var d = require("./1521.js");
var f = require("./59496.js");
var g = require("./4637.js");
function m(e, t) {
  return function (r) {
    var n = r.name || t?.name;
    if (!n) {
      throw new Error("field name 未定义");
    }
    var i = (0, f.useMemo)(function () {
      return (0, d.$j)(e, (0, d.jM)(function (e, t) {
        return (0, p.Z)((0, p.Z)({}, e), {}, {
          onChange: function (e) {
            t.onInput(e);
          },
          hasError: t.errors.length > 0
        });
      }));
    }, []);
    var o = (0, d.U$)();
    return (0, g.jsx)(d.gN, (0, p.Z)((0, p.Z)((0, p.Z)({}, r), t), {}, {
      name: n,
      component: [i, r],
      reactions: [function (e) {
        var t = r.syncDisplay;
        if (t) {
          if (typeof t === "string") {
            var n = e.query(o.path.concat(t)).get("value");
            e.display = n ? "visible" : "none";
          } else if (typeof t === "object") {
            Object.keys(t).forEach(function (r) {
              var n = e.query(o.path.concat(r)).get("value");
              if (t[r].includes(n)) {
                e.display = "visible";
              } else {
                e.display = "none";
              }
            });
          }
        }
        var i = r.mirrorFieldAddress;
        if (i) {
          var a = e.query(i);
          var s = a.get("value");
          if (s) {
            e.visible = true;
          } else if (a.take() !== undefined) {
            e.visible = false;
          }
        }
      }].concat((0, c.Z)(r.reactions || []))
    }));
  };
}
};
