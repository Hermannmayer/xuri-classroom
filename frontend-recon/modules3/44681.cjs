// webpack module 44681 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./20690.js");
var o = require("./40948.js");
var a = require("./79456.js");
var s = require("./54295.js");
var u = require("./98199.js");
var l = o.keys;
var c = o.toKey;
function p(e) {
  var t = [];
  u(e, t.push, t);
  return t;
}
function d(e, t) {
  var r = l(e, t);
  var n = s(e);
  if (n === null) {
    return r;
  }
  var o = d(n, t);
  if (o.length) {
    if (r.length) {
      return p(new i(r.concat(o)));
    } else {
      return o;
    }
  } else {
    return r;
  }
}
n({
  target: "Reflect",
  stat: true
}, {
  getMetadataKeys: function (e) {
    var t = arguments.length < 2 ? undefined : c(arguments[1]);
    return d(a(e), t);
  }
});
};
