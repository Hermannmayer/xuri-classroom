// webpack module 54295 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./15595.js");
var i = require("./41630.js");
var o = require("./58098.js");
var a = require("./6468.js");
var s = o("IE_PROTO");
var u = Object.prototype;
module.exports = a ? Object.getPrototypeOf : function (e) {
  e = i(e);
  if (n(e, s)) {
    return e[s];
  } else if (typeof e.constructor == "function" && e instanceof e.constructor) {
    return e.constructor.prototype;
  } else if (e instanceof Object) {
    return u;
  } else {
    return null;
  }
};
};
