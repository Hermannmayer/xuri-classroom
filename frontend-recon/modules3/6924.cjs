// webpack module 6924 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./46408.js");
var i = require("./28445.js");
var o = require("./55878.js");
var a = o("toStringTag");
var s = i(function () {
  return arguments;
}()) == "Arguments";
function u(e, t) {
  try {
    return e[t];
  } catch (r) {}
}
module.exports = n ? i : function (e) {
  var t;
  var r;
  var n;
  if (e === undefined) {
    return "Undefined";
  } else if (e === null) {
    return "Null";
  } else if (typeof (r = u(t = Object(e), a)) == "string") {
    return r;
  } else if (s) {
    return i(t);
  } else if ((n = i(t)) == "Object" && typeof t.callee == "function") {
    return "Arguments";
  } else {
    return n;
  }
};
};
