// webpack module 8801 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./57300.js");
var i = require("./91626.js");
var o = RegExp.prototype.exec;
var a = String.prototype.replace;
var s = o;
var u = function () {
  var e = /a/;
  var t = /b*/g;
  o.call(e, "a");
  o.call(t, "a");
  return e.lastIndex !== 0 || t.lastIndex !== 0;
}();
var l = i.UNSUPPORTED_Y || i.BROKEN_CARET;
var c = /()??/.exec("")[1] !== undefined;
var p = u || c || l;
if (p) {
  s = function (e) {
    var t;
    var r;
    var i;
    var s;
    var p = this;
    var d = l && p.sticky;
    var f = n.call(p);
    var g = p.source;
    var m = 0;
    var v = e;
    if (d) {
      f = f.replace("y", "");
      if (f.indexOf("g") === -1) {
        f += "g";
      }
      v = String(e).slice(p.lastIndex);
      if (p.lastIndex > 0 && (!p.multiline || p.multiline && e[p.lastIndex - 1] !== "\n")) {
        g = "(?: " + g + ")";
        v = " " + v;
        m++;
      }
      r = new RegExp("^(?:" + g + ")", f);
    }
    if (c) {
      r = new RegExp("^" + g + "$(?!\\s)", f);
    }
    if (u) {
      t = p.lastIndex;
    }
    i = o.call(d ? r : p, v);
    if (d) {
      if (i) {
        i.input = i.input.slice(m);
        i[0] = i[0].slice(m);
        i.index = p.lastIndex;
        p.lastIndex += i[0].length;
      } else {
        p.lastIndex = 0;
      }
    } else if (u && i) {
      p.lastIndex = p.global ? i.index + i[0].length : t;
    }
    if (c && i && i.length > 1) {
      a.call(i[0], r, function () {
        for (s = 1; s < arguments.length - 2; s++) {
          if (arguments[s] === undefined) {
            i[s] = undefined;
          }
        }
      });
    }
    return i;
  };
}
module.exports = s;
};
