// webpack module 94867 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./61859.js").charAt;
var i = require("./71478.js");
var o = require("./30217.js");
var a = "String Iterator";
var s = i.set;
var u = i.getterFor(a);
o(String, "String", function (e) {
  s(this, {
    type: a,
    string: String(e),
    index: 0
  });
}, function () {
  var e;
  var t = u(this);
  var r = t.string;
  var i = t.index;
  if (i >= r.length) {
    return {
      value: undefined,
      done: true
    };
  } else {
    e = n(r, i);
    t.index += e.length;
    return {
      value: e,
      done: false
    };
  }
});
};
