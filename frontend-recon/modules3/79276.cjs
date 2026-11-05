// webpack module 79276 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return o;
  }
});
var n = require("./53691.js");
function i(e, t) {
  while (!{}.hasOwnProperty.call(e, t) && (e = (0, n.Z)(e)) !== null);
  return e;
}
function o() {
  o = typeof Reflect != "undefined" && Reflect.get ? Reflect.get.bind() : function (e, t, r) {
    var n = i(e, t);
    if (n) {
      var o = Object.getOwnPropertyDescriptor(n, t);
      if (o.get) {
        return o.get.call(arguments.length < 3 ? e : r);
      } else {
        return o.value;
      }
    }
  };
  return o.apply(null, arguments);
}
};
