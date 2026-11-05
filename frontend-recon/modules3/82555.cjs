// webpack module 82555 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60730.js");
var i = require("./52485.js");
var o = require("./98199.js");
module.exports = function (e) {
  var t;
  var r;
  var a;
  var s;
  var u = arguments.length;
  var l = u > 1 ? arguments[1] : undefined;
  n(this);
  t = l !== undefined;
  if (t) {
    n(l);
  }
  if (e == undefined) {
    return new this();
  } else {
    r = [];
    if (t) {
      a = 0;
      s = i(l, u > 2 ? arguments[2] : undefined, 2);
      o(e, function (e) {
        r.push(s(e, a++));
      });
    } else {
      o(e, r.push, r);
    }
    return new this(r);
  }
};
};
