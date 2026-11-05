// webpack module 83971 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./1747.js");
function i(e, t) {
  var r = typeof Symbol != "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (!r) {
    if (Array.isArray(e) || (r = n(e)) || t && e && typeof e.length == "number") {
      if (r) {
        e = r;
      }
      var i = 0;
      function o() {}
      return {
        s: o,
        n: function () {
          if (i >= e.length) {
            return {
              done: true
            };
          } else {
            return {
              done: false,
              value: e[i++]
            };
          }
        },
        e: function (e) {
          throw e;
        },
        f: o
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var a;
  var s = true;
  var u = false;
  return {
    s: function () {
      r = r.call(e);
    },
    n: function () {
      var e = r.next();
      s = e.done;
      return e;
    },
    e: function (e) {
      u = true;
      a = e;
    },
    f: function () {
      try {
        if (!s && r.return != null) {
          r.return();
        }
      } finally {
        if (u) {
          throw a;
        }
      }
    }
  };
}
module.exports = i;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
