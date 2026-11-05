// webpack module 8275 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55878.js");
var i = n("iterator");
var o = false;
try {
  var a = 0;
  var s = {
    next: function () {
      return {
        done: !!a++
      };
    },
    return: function () {
      o = true;
    }
  };
  s[i] = function () {
    return this;
  };
  Array.from(s, function () {
    throw 2;
  });
} catch (u) {}
module.exports = function (e, t) {
  if (!t && !o) {
    return false;
  }
  var r = false;
  try {
    var n = {
      [i]: function () {
        return {
          next: function () {
            return {
              done: r = true
            };
          }
        };
      }
    };
    e(n);
  } catch (u) {}
  return r;
};
};
