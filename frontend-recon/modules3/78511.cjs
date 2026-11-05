// webpack module 78511 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./39925.js");
var i = require("./29392.js");
var o = require("./60240.js");
var a = require("./78373.js");
var s = require("./29837.js");
var u = n("%WeakMap%", true);
var l = i("WeakMap.prototype.get", true);
var c = i("WeakMap.prototype.set", true);
var p = i("WeakMap.prototype.has", true);
var d = i("WeakMap.prototype.delete", true);
module.exports = u ? function () {
  var e;
  var t;
  var r = {
    assert: function (e) {
      if (!r.has(e)) {
        throw new s("Side channel does not contain " + o(e));
      }
    },
    delete: function (r) {
      if (u && r && (typeof r === "object" || typeof r === "function")) {
        if (e) {
          return d(e, r);
        }
      } else if (a && t) {
        return t.delete(r);
      }
      return false;
    },
    get: function (r) {
      if (u && r && (typeof r === "object" || typeof r === "function") && e) {
        return l(e, r);
      } else {
        return t && t.get(r);
      }
    },
    has: function (r) {
      if (u && r && (typeof r === "object" || typeof r === "function") && e) {
        return p(e, r);
      } else {
        return !!t && t.has(r);
      }
    },
    set: function (r, n) {
      if (u && r && (typeof r === "object" || typeof r === "function")) {
        e ||= new u();
        c(e, r, n);
      } else if (a) {
        t ||= a();
        t.set(r, n);
      }
    }
  };
  return r;
} : a;
};
