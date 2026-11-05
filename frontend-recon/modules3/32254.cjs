// webpack module 32254 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./44283.js");
var o = require("./41497.js");
var a = require("./18203.js");
function s() {
  var e = o("Object", "freeze");
  if (e) {
    return e(a(null));
  } else {
    return a(null);
  }
}
n({
  global: true
}, {
  compositeKey: function () {
    return i.apply(Object, arguments).get("object", s);
  }
});
};
