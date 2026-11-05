// webpack module 22277 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./24012.js");
var o = require("./98432.js");
var a = require("./55878.js");
var s = a("iterator");
var u = n.Uint8Array;
var l = o.values;
var c = o.keys;
var p = o.entries;
var d = i.aTypedArray;
var f = i.exportTypedArrayMethod;
var g = u && u.prototype[s];
var m = !!g && (g.name == "values" || g.name == undefined);
function v() {
  return l.call(d(this));
}
f("entries", function () {
  return p.call(d(this));
});
f("keys", function () {
  return c.call(d(this));
});
f("values", v, !m);
f(s, v, !m);
};
