// webpack module 28556 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  uA: function () {
    return a;
  },
  uz: function () {
    return f;
  },
  ky: function () {
    return g;
  }
});
var n = require("./96299.js");
var i = require("./76367.js");
var o = require("./23881.js");
function a(e) {
  var t = {
    r: 0,
    g: 0,
    b: 0
  };
  var r = 1;
  var i = null;
  var a = null;
  var s = null;
  var u = false;
  var l = false;
  if (typeof e === "string") {
    e = f(e);
  }
  if (typeof e === "object") {
    if (g(e.r) && g(e.g) && g(e.b)) {
      t = (0, n.rW)(e.r, e.g, e.b);
      u = true;
      l = String(e.r).substr(-1) === "%" ? "prgb" : "rgb";
    } else if (g(e.h) && g(e.s) && g(e.v)) {
      i = (0, o.JX)(e.s);
      a = (0, o.JX)(e.v);
      t = (0, n.WE)(e.h, i, a);
      u = true;
      l = "hsv";
    } else if (g(e.h) && g(e.s) && g(e.l)) {
      i = (0, o.JX)(e.s);
      s = (0, o.JX)(e.l);
      t = (0, n.ve)(e.h, i, s);
      u = true;
      l = "hsl";
    }
    if (Object.prototype.hasOwnProperty.call(e, "a")) {
      r = e.a;
    }
  }
  r = (0, o.Yq)(r);
  return {
    ok: u,
    format: e.format || l,
    r: Math.min(255, Math.max(t.r, 0)),
    g: Math.min(255, Math.max(t.g, 0)),
    b: Math.min(255, Math.max(t.b, 0)),
    a: r
  };
}
var s = "[-\\+]?\\d+%?";
var u = "[-\\+]?\\d*\\.\\d+%?";
var l = `(?:${u})|(?:${s})`;
var c = `[\\s|\\(]+(${l})[,|\\s]+(${l})[,|\\s]+(${l})\\s*\\)?`;
var p = `[\\s|\\(]+(${l})[,|\\s]+(${l})[,|\\s]+(${l})[,|\\s]+(${l})\\s*\\)?`;
var d = {
  CSS_UNIT: new RegExp(l),
  rgb: new RegExp("rgb" + c),
  rgba: new RegExp("rgba" + p),
  hsl: new RegExp("hsl" + c),
  hsla: new RegExp("hsla" + p),
  hsv: new RegExp("hsv" + c),
  hsva: new RegExp("hsva" + p),
  hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
  hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
  hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
  hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
};
function f(e) {
  e = e.trim().toLowerCase();
  if (e.length === 0) {
    return false;
  }
  var t = false;
  if (i.R[e]) {
    e = i.R[e];
    t = true;
  } else if (e === "transparent") {
    return {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
      format: "name"
    };
  }
  var r = d.rgb.exec(e);
  if (r) {
    return {
      r: r[1],
      g: r[2],
      b: r[3]
    };
  } else {
    r = d.rgba.exec(e);
    if (r) {
      return {
        r: r[1],
        g: r[2],
        b: r[3],
        a: r[4]
      };
    } else {
      r = d.hsl.exec(e);
      if (r) {
        return {
          h: r[1],
          s: r[2],
          l: r[3]
        };
      } else {
        r = d.hsla.exec(e);
        if (r) {
          return {
            h: r[1],
            s: r[2],
            l: r[3],
            a: r[4]
          };
        } else {
          r = d.hsv.exec(e);
          if (r) {
            return {
              h: r[1],
              s: r[2],
              v: r[3]
            };
          } else {
            r = d.hsva.exec(e);
            if (r) {
              return {
                h: r[1],
                s: r[2],
                v: r[3],
                a: r[4]
              };
            } else {
              r = d.hex8.exec(e);
              if (r) {
                return {
                  r: (0, n.VD)(r[1]),
                  g: (0, n.VD)(r[2]),
                  b: (0, n.VD)(r[3]),
                  a: (0, n.T6)(r[4]),
                  format: t ? "name" : "hex8"
                };
              } else {
                r = d.hex6.exec(e);
                if (r) {
                  return {
                    r: (0, n.VD)(r[1]),
                    g: (0, n.VD)(r[2]),
                    b: (0, n.VD)(r[3]),
                    format: t ? "name" : "hex"
                  };
                } else {
                  r = d.hex4.exec(e);
                  if (r) {
                    return {
                      r: (0, n.VD)(r[1] + r[1]),
                      g: (0, n.VD)(r[2] + r[2]),
                      b: (0, n.VD)(r[3] + r[3]),
                      a: (0, n.T6)(r[4] + r[4]),
                      format: t ? "name" : "hex8"
                    };
                  } else {
                    r = d.hex3.exec(e);
                    return !!r && {
                      r: (0, n.VD)(r[1] + r[1]),
                      g: (0, n.VD)(r[2] + r[2]),
                      b: (0, n.VD)(r[3] + r[3]),
                      format: t ? "name" : "hex"
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
function g(e) {
  return Boolean(d.CSS_UNIT.exec(String(e)));
}
};
