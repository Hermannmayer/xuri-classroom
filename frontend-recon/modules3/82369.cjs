// webpack module 82369 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./79456.js");
var i = require("./89792.js");
module.exports = Object.setPrototypeOf || ("__proto__" in {} ? function () {
  var e;
  var t = false;
  var r = {};
  try {
    e = Object.getOwnPropertyDescriptor(Object.prototype, "__proto__").set;
    e.call(r, []);
    t = r instanceof Array;
  } catch (o) {}
  return function (r, o) {
    n(r);
    i(o);
    if (t) {
      e.call(r, o);
    } else {
      r.__proto__ = o;
    }
    return r;
  };
}() : undefined);
};
