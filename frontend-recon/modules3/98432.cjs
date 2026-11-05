// webpack module 98432 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./66845.js");
var i = require("./92187.js");
var o = require("./33311.js");
var a = require("./71478.js");
var s = require("./30217.js");
var u = "Array Iterator";
var l = a.set;
var c = a.getterFor(u);
module.exports = s(Array, "Array", function (e, t) {
  l(this, {
    type: u,
    target: n(e),
    index: 0,
    kind: t
  });
}, function () {
  var e = c(this);
  var t = e.target;
  var r = e.kind;
  var n = e.index++;
  if (!t || n >= t.length) {
    e.target = undefined;
    return {
      value: undefined,
      done: true
    };
  } else if (r == "keys") {
    return {
      value: n,
      done: false
    };
  } else if (r == "values") {
    return {
      value: t[n],
      done: false
    };
  } else {
    return {
      value: [n, t[n]],
      done: false
    };
  }
}, "values");
o.Arguments = o.Array;
i("keys");
i("values");
i("entries");
};
