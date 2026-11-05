// webpack module 45867 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./5659.js");
module.exports = function (e, t) {
  if (!n(e)) {
    return e;
  }
  var r;
  var i;
  if (t && typeof (r = e.toString) == "function" && !n(i = r.call(e))) {
    return i;
  }
  if (typeof (r = e.valueOf) == "function" && !n(i = r.call(e))) {
    return i;
  }
  if (!t && typeof (r = e.toString) == "function" && !n(i = r.call(e))) {
    return i;
  }
  throw TypeError("Can't convert object to primitive value");
};
};
