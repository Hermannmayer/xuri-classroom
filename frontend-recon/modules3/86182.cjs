// webpack module 86182 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./66611.js");
var i = require("./40622.js");
var o = require("./6613.js");
var a = require("./48021.js");
function s(e, t, r) {
  e = o(e);
  t = r ? undefined : t;
  if (t === undefined) {
    if (i(e)) {
      return a(e);
    } else {
      return n(e);
    }
  } else {
    return e.match(t) || [];
  }
}
module.exports = s;
};
