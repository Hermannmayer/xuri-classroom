// webpack module 45513 — body from webcrack
module.exports = function (module, exports, require) {
function t(e, t) {
  var r = e == null ? null : typeof Symbol != "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n;
    var i;
    var o;
    var a;
    var s = [];
    var u = true;
    var l = false;
    try {
      o = (r = r.call(e)).next;
      if (t === 0) {
        if (Object(r) !== r) {
          return;
        }
        u = false;
      } else {
        for (; !(u = (n = o.call(r)).done) && (s.push(n.value), s.length !== t); u = true);
      }
    } catch (e) {
      l = true;
      i = e;
    } finally {
      try {
        if (!u && r.return != null && (a = r.return(), Object(a) !== a)) {
          return;
        }
      } finally {
        if (l) {
          throw i;
        }
      }
    }
    return s;
  }
}
module.exports = t;
module.exports.__esModule = true;
module.exports.default = module.exports;
};
