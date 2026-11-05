// webpack module 60316 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./29837.js");
var i = require("./60240.js");
var o = require("./48141.js");
var a = require("./78373.js");
var s = require("./78511.js");
var u = s || a || o;
module.exports = function () {
  var e;
  var t = {
    assert: function (e) {
      if (!t.has(e)) {
        throw new n("Side channel does not contain " + i(e));
      }
    },
    delete: function (t) {
      return !!e && e.delete(t);
    },
    get: function (t) {
      return e && e.get(t);
    },
    has: function (t) {
      return !!e && e.has(t);
    },
    set: function (t, r) {
      e ||= u();
      e.set(t, r);
    }
  };
  return t;
};
};
