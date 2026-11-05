// webpack module 32191 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./41630.js");
var i = require("./29477.js");
var o = require("./4484.js");
var a = Math.min;
module.exports = [].copyWithin || function (e, t) {
  var r = n(this);
  var s = o(r.length);
  var u = i(e, s);
  var l = i(t, s);
  var c = arguments.length > 2 ? arguments[2] : undefined;
  var p = a((c === undefined ? s : i(c, s)) - l, s - u);
  var d = 1;
  if (l < u && u < l + p) {
    d = -1;
    l += p - 1;
    u += p - 1;
  }
  while (p-- > 0) {
    if (l in r) {
      r[u] = r[l];
    } else {
      delete r[u];
    }
    u += d;
    l += d;
  }
  return r;
};
};
