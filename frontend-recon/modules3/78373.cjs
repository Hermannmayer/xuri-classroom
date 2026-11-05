// webpack module 78373 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./39925.js");
var i = require("./29392.js");
var o = require("./60240.js");
var a = require("./29837.js");
var s = n("%Map%", true);
var u = i("Map.prototype.get", true);
var l = i("Map.prototype.set", true);
var c = i("Map.prototype.has", true);
var p = i("Map.prototype.delete", true);
var d = i("Map.prototype.size", true);
module.exports = !!s && function () {
  var e;
  var t = {
    assert: function (e) {
      if (!t.has(e)) {
        throw new a("Side channel does not contain " + o(e));
      }
    },
    delete: function (t) {
      if (e) {
        var r = p(e, t);
        if (d(e) === 0) {
          e = undefined;
        }
        return r;
      }
      return false;
    },
    get: function (t) {
      if (e) {
        return u(e, t);
      }
    },
    has: function (t) {
      return !!e && c(e, t);
    },
    set: function (t, r) {
      e ||= new s();
      l(e, t, r);
    }
  };
  return t;
};
};
