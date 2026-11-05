// webpack module 57925 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./72354.js");
var i = require("./79456.js");
var o = require("./61230.js");
var a = require("./33722.js");
var s = require("./62190.js");
n("search", 1, function (e, t, r) {
  return [function (t) {
    var r = o(this);
    var n = t == undefined ? undefined : t[e];
    if (n !== undefined) {
      return n.call(t, r);
    } else {
      return new RegExp(t)[e](String(r));
    }
  }, function (e) {
    var n = r(t, e, this);
    if (n.done) {
      return n.value;
    }
    var o = i(e);
    var u = String(this);
    var l = o.lastIndex;
    if (!a(l, 0)) {
      o.lastIndex = 0;
    }
    var c = s(o, u);
    if (!a(o.lastIndex, l)) {
      o.lastIndex = l;
    }
    if (c === null) {
      return -1;
    } else {
      return c.index;
    }
  }];
});
};
